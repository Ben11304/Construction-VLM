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
function matrixFor(datasetId, taskId) {
  return D.matrix.filter(r =>
    r.dataset === datasetId && (taskId == null || taskId === "all" || r.task === taskId)
  );
}
function tasksForDataset(datasetId) {
  const ids = new Set(D.matrix.filter(r => r.dataset === datasetId).map(r => r.task));
  return [...ids].filter(Boolean).sort();
}
function metricKindFor(datasetId, taskId) {
  const r = D.matrix.find(x =>
    x.dataset === datasetId && (taskId == null || taskId === "all" || x.task === taskId) && x.metric_kind
  );
  return r ? r.metric_kind : null;
}
function modelsInDataset(datasetId, taskId) {
  const ids = new Set(matrixFor(datasetId, taskId).map(r => r.model));
  return D.models.filter(m => ids.has(m.id));
}
function summaryFor(datasetId, taskId) {
  const rows = matrixFor(datasetId, taskId);
  const byModel = {};
  for (const r of rows) {
    if (!byModel[r.model]) byModel[r.model] = [];
    byModel[r.model].push(r);
  }
  // Run-level aggregates by (model, dataset, task) — corpus-level when present
  // (BLEU/mIoU are NOT row-averages and must come from metrics.json).
  const runsByMT = {};
  for (const r of D.runs) {
    if (r.dataset !== datasetId) continue;
    if (taskId != null && taskId !== "all" && r.task !== taskId) continue;
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

function Topbar({ route, datasetId, setDatasetId, taskId, setTaskId, onNewRun }) {
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
  tasksForDataset, metricKindFor,
  SeverityDot, ConditionTag, StatusChip, Bar, EmptyState,
  Sidebar, Topbar, DatasetSelector, TaskSelector,
};
