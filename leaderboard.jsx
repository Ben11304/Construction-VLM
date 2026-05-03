/* global React */
const { useState: useStateLB, useMemo: useMemoLB } = React;
const Dlb = window.__DATA;
const Ulb = window.__UI;

function LeaderboardScreen({ datasetId, taskId }) {
  const [sortKey, setSortKey] = useStateLB("macroAcc");
  const [sortDir, setSortDir] = useStateLB("desc");
  const [filter, setFilter]   = useStateLB("");
  const [typeF, setTypeF]     = useStateLB("all");
  const [metric, setMetric]   = useStateLB("acc");

  const ds = Ulb.getDataset(datasetId);
  const baseSummary = useMemoLB(() => ds ? Ulb.summaryFor(ds.id, taskId) : [], [datasetId, taskId]);
  const metricKind = ds ? Ulb.metricKindFor(ds.id, taskId) : null;

  const data = useMemoLB(() => {
    let arr = [...baseSummary];
    if (typeF !== "all") arr = arr.filter(r => r.type === typeF);
    if (filter) arr = arr.filter(r => r.id.toLowerCase().includes(filter.toLowerCase()));
    arr.sort((a,b) => {
      const av = a[sortKey], bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [baseSummary, sortKey, sortDir, filter, typeF]);

  const Th = ({ id, children, num }) => (
    <th className={num ? "num" : ""} onClick={() => {
      if (sortKey === id) setSortDir(sortDir === "asc" ? "desc" : "asc");
      else { setSortKey(id); setSortDir("desc"); }
    }} style={{cursor:"pointer", userSelect:"none"}}>
      {children}{sortKey === id ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
    </th>
  );

  if (!ds) {
    return <div className="page"><Ulb.EmptyState title="No dataset selected" /></div>;
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <div className="page-sub">
            {ds.id} · task: {taskId === "all" ? `all (${Ulb.tasksForDataset(ds.id).length})` : taskId}
            {metricKind ? ` · metric: ${metricKind}` : ""} · {ds.conditions.length} conditions · {data.length} models
          </div>
        </div>
        <div className="row-h">
          <div className="segmented">
            <button className={metric==="acc"?"active":""}  onClick={()=>setMetric("acc")}>accuracy</button>
            <button className={metric==="f1"?"active":""}   onClick={()=>setMetric("f1")}>macro F1</button>
            <button className={metric==="lat"?"active":""}  onClick={()=>setMetric("lat")}>latency</button>
            <button className={metric==="cost"?"active":""} onClick={()=>setMetric("cost")}>cost</button>
          </div>
        </div>
      </div>

      {baseSummary.length === 0 ? (
        <Ulb.EmptyState title="No runs available for this dataset" hint="Generate predictions.parquet first via `cveval run`." />
      ) : (
        <>
          <div className="filterbar">
            <input className="input" placeholder="Search model id…" value={filter} onChange={e=>setFilter(e.target.value)} />
            <div className="segmented">
              <button className={typeF==="all"?"active":""}    onClick={()=>setTypeF("all")}>all</button>
              <button className={typeF==="open"?"active":""}   onClick={()=>setTypeF("open")}>open-source</button>
              <button className={typeF==="closed"?"active":""} onClick={()=>setTypeF("closed")}>API</button>
            </div>
            <div className="spacer" />
            <span className="t-mute" style={{fontSize:"var(--fs-sm)"}}>{data.length} of {baseSummary.length} models</span>
          </div>

          <div className="card card-flush">
            <table className="table">
              <thead>
                <tr>
                  <th style={{width: 28}}>#</th>
                  <Th id="id">Model</Th>
                  <th>Family</th>
                  <th>Params</th>
                  <Th id="macroAcc"   num>Macro acc</Th>
                  <Th id="macroF1"    num>Macro F1</Th>
                  <Th id="cleanAcc"   num>Clean</Th>
                  <Th id="augAcc"     num>Aug avg</Th>
                  <Th id="deltaClean" num>Δ vs clean</Th>
                  <Th id="robustness" num>Robust</Th>
                  <Th id="avgLat"     num>Avg latency</Th>
                  <Th id="totalCost"  num>Cost</Th>
                </tr>
              </thead>
              <tbody>
                {data.map((s, i) => (
                  <tr key={s.id} className="clickable">
                    <td className="mono t-mute">{i+1}</td>
                    <td>
                      <div className="row-h">
                        <span style={{fontWeight:500}}>{s.id}</span>
                        <span className="tag">{s.type === "closed" ? "API" : "OSS"}</span>
                      </div>
                    </td>
                    <td className="t-text2">{s.family}</td>
                    <td className="mono t-mute">{s.params}</td>
                    <td className="num mono">
                      <Ulb.Bar value={s.macroAcc} color={Ulb.accColor(s.macroAcc)} />
                      {Ulb.fmtPct(s.macroAcc)}
                    </td>
                    <td className="num mono">{Ulb.fmtPct(s.macroF1)}</td>
                    <td className="num mono">{Ulb.fmtPct(s.cleanAcc)}</td>
                    <td className="num mono">{Ulb.fmtPct(s.augAcc)}</td>
                    <td className="num mono"><span className={"delta " + ((s.deltaClean ?? 0) < 0 ? "neg" : "pos")}>{Ulb.fmtDelta(s.deltaClean)}</span></td>
                    <td className="num mono">{s.robustness != null ? (s.robustness*100).toFixed(1) : "—"}</td>
                    <td className="num mono t-text2">{Ulb.fmtMs(s.avgLat)}</td>
                    <td className="num mono t-text2">{s.totalCost ? `$${s.totalCost.toFixed(4)}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{marginTop: 16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:16}}>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Per-condition accuracy · top {Math.min(4, data.length)} models</div>
                <div className="card-sub">Where each model breaks down</div>
              </div>
              <div className="card-body">
                <PerConditionLines summary={data.slice(0,4)} datasetId={ds.id} taskId={taskId} />
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Cost vs accuracy frontier</div>
                <div className="card-sub">API models only</div>
              </div>
              <div className="card-body">
                <CostFrontier summary={baseSummary} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PerConditionLines({ summary, datasetId, taskId }) {
  const conds = Ulb.conditionsOf(datasetId);
  const matrix = Ulb.matrixFor(datasetId, taskId);
  const colors = ["var(--accent)", "var(--sev-1)", "var(--sev-2)", "var(--sev-3)"];
  const w = 560, h = 200, pad = 36;
  if (!conds.length || !summary.length) return <div className="t-mute">No data.</div>;
  const X = i => pad + (i / Math.max(1, conds.length - 1)) * (w - 2*pad);
  const Y = v => h - pad - v * (h - 2*pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height:220}}>
      {[0.25, 0.5, 0.75, 1].map(t => (
        <line key={t} x1={pad} y1={Y(t)} x2={w-pad} y2={Y(t)} stroke="var(--border)" strokeDasharray="2 3" />
      ))}
      {[0, 0.5, 1].map(t => (
        <text key={t} x={pad-6} y={Y(t)+3} fontSize="9" fill="var(--muted)" textAnchor="end" fontFamily="var(--font-mono)">{t}</text>
      ))}
      {conds.map((c,i) => (
        <text key={c.key} x={X(i)} y={h-pad+14} fontSize="9" fill="var(--muted)" textAnchor="middle" fontFamily="var(--font-mono)">{c.key.slice(0,6)}</text>
      ))}
      {summary.map((m, mi) => {
        const pts = conds.map((c,i) => {
          const row = matrix.find(r => r.model === m.id && r.condition === c.key);
          return row ? [X(i), Y(row.acc)] : null;
        }).filter(Boolean);
        if (pts.length < 2) return null;
        const d = pts.map((p,i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
        return (
          <g key={m.id}>
            <path d={d} stroke={colors[mi % colors.length]} fill="none" strokeWidth="1.8" />
            {pts.map((p,i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={colors[mi % colors.length]} />)}
            <text x={pts[pts.length-1][0]+6} y={pts[pts.length-1][1]+3} fontSize="9" fill={colors[mi % colors.length]} fontFamily="var(--font-mono)">{m.id.split(/[-_]/)[0]}</text>
          </g>
        );
      })}
    </svg>
  );
}

function CostFrontier({ summary }) {
  const apis = summary.filter(s => s.type === "closed" && s.totalCost > 0);
  if (!apis.length) return <div className="t-mute">No API runs with cost data.</div>;
  const w = 380, h = 200, pad = 36;
  const xmax = Math.max(...apis.map(a => a.totalCost)) * 1.1;
  const ymin = 0, ymax = 1;
  const X = v => pad + (v / xmax) * (w - 2*pad);
  const Y = v => h - pad - ((v - ymin) / (ymax - ymin)) * (h - 2*pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height:220}}>
      <text x={w/2} y={h-6} fontSize="10" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--font-mono)">cost (USD) →</text>
      {apis.map(a => (
        <g key={a.id}>
          <circle cx={X(a.totalCost)} cy={Y(a.macroAcc)} r="6" fill="var(--accent)" stroke="var(--bg)" strokeWidth="1.5" />
          <text x={X(a.totalCost)+9} y={Y(a.macroAcc)+3} fontSize="9" fill="var(--text-2)" fontFamily="var(--font-mono)">{a.id}</text>
        </g>
      ))}
    </svg>
  );
}

window.__LeaderboardScreen = LeaderboardScreen;
