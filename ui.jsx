/* global React */
const { useState, useMemo, useEffect } = React;
const D = window.__DATA;

// ---------- formatters ----------
const fmtPct  = (v) => (v == null ? "—" : (v * 100).toFixed(1) + "%");
const fmtPct0 = (v) => (v == null ? "—" : Math.round(v * 100) + "%");
const fmtMs   = (v) => (v == null ? "—" : v < 1000 ? `${v} ms` : `${(v/1000).toFixed(2)} s`);
const fmtUsd  = (v) => (v == null || v === 0 ? "—" : `$${v.toFixed(4)}`);
const fmtDelta = (v) => (v == null ? "—" : (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "pp");

function sevColor(severity) {
  return ["var(--sev-0)","var(--sev-1)","var(--sev-2)","var(--sev-3)","var(--sev-4)"][severity] || "var(--muted)";
}
function accColor(acc) {
  if (acc == null) return "var(--muted)";
  const h = 28 + acc * (155 - 28);
  const l = 0.55 + acc * 0.20;
  return `oklch(${l.toFixed(3)} 0.16 ${h.toFixed(1)})`;
}
function accBg(acc) {
  if (acc == null) return "transparent";
  const h = 28 + acc * (155 - 28);
  const a = 0.18 + acc * 0.55;
  return `oklch(0.55 0.18 ${h.toFixed(1)} / ${a.toFixed(2)})`;
}

// ---------- dataset helpers (cveval-specific) ----------
function getDataset(id) {
  if (!id) return D.datasets[0] || null;
  return D.datasets.find(d => d.id === id) || D.datasets[0] || null;
}
function conditionsOf(datasetId) {
  const d = getDataset(datasetId);
  return d ? d.conditions : [];
}
function conditionMeta(datasetId, condKey) {
  return conditionsOf(datasetId).find(c => c.key === condKey) || { key: condKey, label: condKey, severity: 0, group: condKey };
}
function matrixFor(datasetId, taskId, scale) {
  return D.matrix.filter(r =>
    r.dataset === datasetId
    && (taskId == null || taskId === "all" || r.task === taskId)
    && (scale == null || scale === "all" || r.scale === scale)
  );
}
function runsFiltered(datasetId, taskId, scale) {
  return D.runs.filter(r =>
    (datasetId == null || r.dataset === datasetId)
    && (taskId == null || taskId === "all" || r.task === taskId)
    && (scale == null || scale === "all" || r.scale === scale)
  );
}
function tasksForDataset(datasetId) {
  const ids = new Set(D.matrix.filter(r => r.dataset === datasetId).map(r => r.task));
  return [...ids].filter(Boolean).sort();
}
function metricKindFor(datasetId, taskId, scale) {
  const r = matrixFor(datasetId, taskId, scale).find(x => x.metric_kind);
  return r ? r.metric_kind : null;
}
function modelsInDataset(datasetId, taskId, scale) {
  const ids = new Set(matrixFor(datasetId, taskId, scale).map(r => r.model));
  return D.models.filter(m => ids.has(m.id));
}
function summaryFor(datasetId, taskId, scale) {
  const rows = matrixFor(datasetId, taskId, scale);
  const byModel = {};
  for (const r of rows) {
    if (!byModel[r.model]) byModel[r.model] = [];
    byModel[r.model].push(r);
  }
  // Run-level aggregates by (model, dataset, task) — corpus-level when present
  // (BLEU/mIoU are NOT row-averages and must come from metrics.json).
  const runsByMT = {};
  for (const r of runsFiltered(datasetId, taskId, scale)) {
    if (!runsByMT[r.model]) runsByMT[r.model] = [];
    runsByMT[r.model].push(r);
  }

  return Object.entries(byModel).map(([modelId, mrows]) => {
    const m = D.models.find(x => x.id === modelId) || {
      id: modelId, family: "—", params: "—", backend: "—", type: "open"
    };
    const rowAccs = mrows.map(r => r.acc).filter(v => v != null);
    const rowMacro = rowAccs.length ? rowAccs.reduce((s,v)=>s+v,0)/rowAccs.length : null;

    // Prefer the latest run's aggregate_metric (corpus-level, methodology-correct).
    const myRuns = runsByMT[modelId] || [];
    const aggRuns = myRuns.filter(r => r.aggregate_metric != null);
    const aggAvg = aggRuns.length
      ? aggRuns.reduce((s,r) => s + r.aggregate_metric, 0) / aggRuns.length
      : null;
    const aggLabels = [...new Set(aggRuns.map(r => r.aggregate_label).filter(Boolean))];

    const macroAcc = aggAvg != null ? aggAvg : rowMacro;
    const macroSource = aggAvg != null ? "run-level" : "row-mean";

    const clean = mrows.find(r => r.condition === "clean");
    const aug   = mrows.filter(r => r.condition !== "clean");
    const cleanAcc = clean ? clean.acc : null;
    const augAccs  = aug.map(r => r.acc).filter(v => v != null);
    const augAcc   = augAccs.length ? augAccs.reduce((s,v)=>s+v,0)/augAccs.length : null;
    const robustness = (cleanAcc && augAcc) ? augAcc/cleanAcc : null;
    const deltaClean = (cleanAcc != null && augAcc != null) ? augAcc - cleanAcc : null;

    const lats = mrows.map(r => r.latency_ms).filter(v => v != null);
    const avgLat = lats.length ? Math.round(lats.reduce((s,v) => s+v, 0)/lats.length) : null;
    const totalCost = mrows.reduce((s,r) => s+(r.cost_usd||0), 0);

    return {
      ...m, id: modelId,
      macroAcc, macroF1: macroAcc, macroSource, aggLabels,
      cleanAcc, augAcc, robustness, deltaClean,
      avgLat, totalCost, n_conditions: mrows.length, n_runs: myRuns.length,
    };
  }).sort((a,b) => (b.macroAcc||0) - (a.macroAcc||0));
}

// ---------- shared ui ----------
function SeverityDot({ severity }) {
  return <span className="sev-dot" style={{ background: sevColor(severity) }} />;
}

function ConditionTag({ datasetId, cond }) {
  const c = conditionMeta(datasetId, cond);
  return (
    <span className="mono" style={{ display: "inline-flex", alignItems: "center" }}>
      <SeverityDot severity={c.severity} />
      {c.label}
    </span>
  );
}

function StatusChip({ status }) {
  return (
    <span className="chip" data-status={status}>
      <span className="chip-dot" />
      {status}
    </span>
  );
}

function Bar({ value, max = 1, color }) {
  if (value == null) return <span className="bar-bg" />;
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <span className="bar-bg">
      <span className="bar-fill" style={{ width: pct + "%", background: color || "var(--accent)" }} />
    </span>
  );
}

function RadarChart({ datasetId, taskId, scale, top = 6, size = 360, models: pickedModels }) {
  const [hidden, setHidden] = useState(() => new Set());
  const [autoScale, setAutoScale] = useState(true);
  const ds = getDataset(datasetId);
  if (!ds) return null;
  const conds = ds.conditions;
  if (!conds.length) return <div className="t-mute">No conditions to plot.</div>;
  const matrix = matrixFor(datasetId, taskId, scale);
  if (!matrix.length) return <div className="t-mute">No data for radar.</div>;

  const summary = summaryFor(datasetId, taskId, scale);
  const allModelIds = pickedModels && pickedModels.length
    ? pickedModels
    : summary.slice(0, top).map(s => s.id);

  // Compute max across visible polygons. Cap at 1.0; tiny ceiling guard.
  const visible = allModelIds.filter(mid => !hidden.has(mid));
  let dataMax = 0;
  for (const mid of visible) {
    for (const c of conds) {
      const row = matrix.find(r => r.model === mid && r.condition === c.key);
      if (row && row.acc != null && row.acc > dataMax) dataMax = row.acc;
    }
  }
  // Round up to a "nice" upper bound for cleaner ticks.
  const niceCeil = (v) => {
    if (v <= 0) return 1;
    if (v >= 1) return 1;
    const candidates = [0.005, 0.01, 0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75, 0.8, 1.0];
    for (const c of candidates) if (v <= c) return c;
    return 1;
  };
  const axisMax = autoScale ? Math.max(niceCeil(dataMax * 1.05), 0.005) : 1.0;

  const colorOf = (i) => {
    const h = (i * 360 / Math.max(allModelIds.length, 1) + 200) % 360;
    return `oklch(0.72 0.16 ${h.toFixed(0)})`;
  };

  const w = size, h = size;
  const cx = w / 2, cy = h / 2 + 8;
  const r = Math.min(w, h) * 0.36;
  const N = conds.length;
  const angle = (i) => (-Math.PI / 2) + (2 * Math.PI * i / N);
  const norm = (v) => v == null ? null : Math.max(0, Math.min(1, v / axisMax));
  const xy = (i, v) => {
    const rr = r * Math.max(0, Math.min(1, v));
    return [cx + rr * Math.cos(angle(i)), cy + rr * Math.sin(angle(i))];
  };

  const rings = [0.25, 0.5, 0.75, 1.0];
  const ringPath = (val) => conds.map((c, i) => {
    const [x, y] = xy(i, val);
    return (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ") + " Z";

  const fmtTick = (v) => {
    const real = v * axisMax;
    if (axisMax >= 0.5) return `${(real*100).toFixed(0)}%`;
    if (axisMax >= 0.05) return `${(real*100).toFixed(1)}%`;
    return real.toFixed(3);
  };

  return (
    <div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6}}>
        <span className="t-mute mono" style={{fontSize:"var(--fs-xs)"}}>
          axis max: {fmtTick(1)} {autoScale ? "(auto)" : "(fixed)"}
        </span>
        <span className="chip mono" style={{cursor:"pointer", fontSize:"var(--fs-xs)"}}
              onClick={()=>setAutoScale(!autoScale)}>
          <span className="chip-dot" style={{background: autoScale ? "var(--accent)" : "var(--muted)"}} />
          {autoScale ? "auto-scale" : "0–100%"}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height: size, display:"block"}}>
        {rings.map((v, i) => (
          <path key={v} d={ringPath(v)} stroke="var(--border)" fill="none" strokeDasharray={i === rings.length-1 ? "" : "2 3"} />
        ))}
        {conds.map((c, i) => {
          const [x, y] = xy(i, 1);
          return <line key={c.key} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--border)" strokeDasharray="2 3" />;
        })}
        {conds.map((c, i) => {
          const [x, y] = xy(i, 1.18);
          return (
            <g key={c.key}>
              <circle cx={(xy(i,1.07))[0]} cy={(xy(i,1.07))[1]} r="3" fill={sevColor(c.severity)} />
              <text x={x} y={y} fontSize="10" fontFamily="var(--font-mono)" fill="var(--text-2)" textAnchor="middle" dominantBaseline="middle">
                {c.label}
              </text>
            </g>
          );
        })}
        {[0.5, 1.0].map(v => {
          const [tx, ty] = xy(0, v);
          return <text key={v} x={tx + 4} y={ty + 3} fontSize="9" fontFamily="var(--font-mono)" fill="var(--muted)">{fmtTick(v)}</text>;
        })}
        {allModelIds.map((mid, mi) => {
          if (hidden.has(mid)) return null;
          const color = colorOf(mi);
          const pts = conds.map((c, i) => {
            const row = matrix.find(r => r.model === mid && r.condition === c.key);
            const nv = norm(row && row.acc);
            return xy(i, nv != null ? nv : 0);
          });
          const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ") + " Z";
          return (
            <g key={mid}>
              <path d={d} fill={color} fillOpacity="0.10" stroke={color} strokeWidth="1.6" />
              {pts.map((p, i) => {
                const row = matrix.find(r => r.model === mid && r.condition === conds[i].key);
                const v = row && row.acc != null ? row.acc : null;
                return v != null ? (
                  <circle key={i} cx={p[0]} cy={p[1]} r="2.5" fill={color}>
                    <title>{`${mid} · ${conds[i].label} = ${axisMax >= 0.05 ? (v*100).toFixed(2)+'%' : v.toFixed(4)}`}</title>
                  </circle>
                ) : null;
              })}
            </g>
          );
        })}
      </svg>
      <div style={{display:"flex", flexWrap:"wrap", gap:6, marginTop:8, justifyContent:"center"}}>
        {allModelIds.map((mid, mi) => {
          const isHidden = hidden.has(mid);
          return (
            <span key={mid}
              className="chip mono"
              style={{
                cursor:"pointer",
                fontSize:"var(--fs-xs)",
                opacity: isHidden ? 0.35 : 1,
                borderColor: colorOf(mi),
              }}
              onClick={() => {
                const next = new Set(hidden);
                if (isHidden) next.delete(mid); else next.add(mid);
                setHidden(next);
              }}
            >
              <span className="chip-dot" style={{background: colorOf(mi)}} />
              {mid}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ title, hint }) {
  return (
    <div className="card" style={{ padding: 40, textAlign: "center" }}>
      <div style={{ fontSize: "var(--fs-lg)", fontWeight: 500, color: "var(--text)" }}>{title}</div>
      {hint && <div className="mono t-mute" style={{ marginTop: 8, fontSize: "var(--fs-sm)" }}>{hint}</div>}
    </div>
  );
}

function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark" />
      <div>
        <div className="brand-name">cveval</div>
        <div className="brand-sub">v{D.framework_version}</div>
      </div>
    </div>
  );
}

function Sidebar({ route, setRoute }) {
  const runningCount = D.runs.filter(r => r.status === "running").length;
  const items = [
    { section: "evaluate" },
    { id: "overview",    label: "Overview" },
    { id: "leaderboard", label: "Leaderboard", badge: D.models.length || null },
    { id: "robustness",  label: "Robustness matrix" },
    { id: "runs",        label: "Runs", badge: runningCount || null },
    { id: "samples",     label: "Sample inspector" },
    { section: "configure" },
    { id: "models",    label: "Models",    badge: D.models.length || null },
    { id: "datasets",  label: "Datasets",  badge: D.datasets.length || null },
    { id: "tasks",     label: "Tasks",     badge: D.tasks.length || null },
    { id: "metrics",   label: "Metrics",   badge: D.metrics.length || null },
    { id: "manifests", label: "Manifests", badge: D.manifests.length || null },
  ];
  const activeD = D.datasets[0];
  return (
    <aside className="sidebar">
      <Brand />
      {items.map((it, i) =>
        it.section ? (
          <div key={i} className="nav-section">{it.section}</div>
        ) : (
          <div
            key={it.id}
            className={"nav-item " + (route === it.id ? "active" : "")}
            onClick={() => setRoute(it.id)}
          >
            <span>{it.label}</span>
            {it.badge ? <span className="badge">{it.badge}</span> : null}
          </div>
        )
      )}
      <div className="sidebar-footer">
        {activeD ? (
          <>
            <div>{activeD.id}</div>
            <div className="mono" style={{ color: "var(--faint)" }}>
              {activeD.conditions.length} conditions{activeD.n_total ? ` · ${activeD.n_total.toLocaleString()} samples` : ""}
            </div>
          </>
        ) : (
          <div className="t-mute">No dataset registered</div>
        )}
      </div>
    </aside>
  );
}

function ScaleSelector({ value, onChange, datasetId, taskId }) {
  // Count runs per scale to decide whether to show.
  const all = runsFiltered(datasetId, taskId, "all");
  const fullN = all.filter(r => r.scale === "full").length;
  const smokeN = all.filter(r => r.scale === "smoke").length;
  if (fullN === 0 && smokeN === 0) return null;
  if (fullN === 0 || smokeN === 0) {
    // Only one scale present — show a label, not a control.
    const only = fullN > 0 ? "full" : "smoke";
    const n = fullN > 0 ? fullN : smokeN;
    return <span className="chip mono" title={`only ${only} runs available`}>
      <span className="chip-dot" style={{background:"var(--muted)"}} />
      {only} ({n})
    </span>;
  }
  return (
    <div className="segmented">
      <button className={value==="full"?"active":""}  onClick={()=>onChange("full")}>full ({fullN})</button>
      <button className={value==="smoke"?"active":""} onClick={()=>onChange("smoke")}>smoke ({smokeN})</button>
      <button className={value==="all"?"active":""}   onClick={()=>onChange("all")}>all ({fullN+smokeN})</button>
    </div>
  );
}

function TaskSelector({ value, onChange, datasetId }) {
  const tasks = tasksForDataset(datasetId);
  if (tasks.length <= 1) return null;
  return (
    <select className="select" value={value || "all"} onChange={e => onChange(e.target.value)}>
      <option value="all">all tasks ({tasks.length})</option>
      {tasks.map(t => <option key={t} value={t}>{t}</option>)}
    </select>
  );
}

function DatasetSelector({ value, onChange }) {
  if (!D.datasets.length) return null;
  if (D.datasets.length === 1) {
    return (
      <span className="chip mono" title={D.datasets[0].cls_qualname}>
        <span className="chip-dot" style={{background:"var(--accent)"}} />
        {D.datasets[0].id}
      </span>
    );
  }
  return (
    <select className="select" value={value} onChange={e => onChange(e.target.value)}>
      {D.datasets.map(d => (
        <option key={d.id} value={d.id}>{d.id}</option>
      ))}
    </select>
  );
}

function Topbar({ route, datasetId, setDatasetId, taskId, setTaskId, scale, setScale, onNewRun }) {
  const labels = {
    overview: "Overview", leaderboard: "Leaderboard", robustness: "Robustness matrix",
    runs: "Runs", samples: "Sample inspector",
    models: "Models", datasets: "Datasets", tasks: "Tasks", metrics: "Metrics", manifests: "Manifests",
  };
  return (
    <div className="topbar">
      <div className="crumbs">
        <span>cveval</span>
        <span className="sep">/</span>
        <span className="here">{labels[route] || route}</span>
      </div>
      <div className="topbar-actions">
        <DatasetSelector value={datasetId} onChange={setDatasetId} />
        <TaskSelector value={taskId} onChange={setTaskId} datasetId={datasetId} />
        <ScaleSelector value={scale} onChange={setScale} datasetId={datasetId} taskId={taskId} />
        {D.repo_url && <a className="btn btn-ghost btn-sm" href={D.repo_url} target="_blank" rel="noreferrer">repo ↗</a>}
        <span className="mono t-mute" style={{fontSize:"var(--fs-xs)"}}>built {D.generated_at.slice(0,16).replace("T"," ")}</span>
      </div>
    </div>
  );
}

window.__UI = {
  fmtPct, fmtPct0, fmtMs, fmtUsd, fmtDelta,
  sevColor, accColor, accBg,
  getDataset, conditionsOf, conditionMeta, matrixFor, modelsInDataset, summaryFor,
  tasksForDataset, metricKindFor, runsFiltered,
  SeverityDot, ConditionTag, StatusChip, Bar, EmptyState, RadarChart,
  Sidebar, Topbar, DatasetSelector, TaskSelector, ScaleSelector,
};
