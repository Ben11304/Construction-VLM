/* global React */
const { useMemo: useMemoOv } = React;
const Dov = window.__DATA;
const Uov = window.__UI;

function OverviewScreen({ datasetId, taskId, scale, goto }) {
  const ds = Uov.getDataset(datasetId);
  const summary = useMemoOv(() => ds ? Uov.summaryFor(ds.id, taskId, scale) : [], [datasetId, taskId, scale]);
  const conds = ds ? ds.conditions : [];
  const matrix = ds ? Uov.matrixFor(ds.id, taskId, scale) : [];
  const metricKind = ds ? Uov.metricKindFor(ds.id, taskId, scale) : null;
  const top = summary[0];
  const mostRobust = [...summary].filter(s => s.robustness != null).sort((a,b)=>b.robustness-a.robustness)[0];
  const samplesEvaluated = Dov.runs.filter(r => r.status === "done").reduce((s,r) => s+r.n, 0);
  const running = Dov.runs.filter(r => r.status === "running").length;

  if (!ds) {
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Overview</h1>
            <div className="page-sub">No dataset registered yet</div>
          </div>
        </div>
        <Uov.EmptyState
          title="No dataset registered"
          hint="DATASET agent: build adapter in cveval/data/<name>.py and register via @register_dataset(...)"
        />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Overview</h1>
          <div className="page-sub">
            cveval · {ds.id} · scale: {scale} · task: {taskId === "all" ? `all (${Uov.tasksForDataset(ds.id).length})` : taskId}
            {metricKind ? ` · metric: ${metricKind}` : ""}
            {ds.description ? ` · ${ds.description}` : ""}
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Top model · macro acc</div>
          <div className="kpi-value">{top ? Uov.fmtPct(top.macroAcc) : "—"}</div>
          <div className="kpi-foot mono">{top ? top.id : "no runs"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Most robust</div>
          <div className="kpi-value">{mostRobust ? (mostRobust.robustness*100).toFixed(1) : "—"}<span style={{fontSize:"var(--fs-md)", color:"var(--muted)"}}> /100</span></div>
          <div className="kpi-foot mono">{mostRobust ? `${mostRobust.id} · aug ÷ clean` : "—"}</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Samples evaluated</div>
          <div className="kpi-value t-num">{samplesEvaluated.toLocaleString()}</div>
          <div className="kpi-foot">across {Dov.runs.length} runs · {running} running</div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Models · datasets</div>
          <div className="kpi-value t-num">{Dov.models.length} · {Dov.datasets.length}</div>
          <div className="kpi-foot">
            {Dov.models.filter(m=>m.type==="open").length} open · {Dov.models.filter(m=>m.type==="closed").length} API
          </div>
        </div>
      </div>

      {summary.length === 0 ? (
        <Uov.EmptyState
          title="No runs yet for this dataset"
          hint={`Run: cveval run --config configs/runs/<your_run>.yaml ; data.name=${ds.id}`}
        />
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16, marginBottom: 16 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Leaderboard</div>
                  <div className="card-sub">Macro accuracy across {conds.length} conditions</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => goto("leaderboard")}>View all →</button>
              </div>
              <div className="card-body card-flush" style={{padding:0}}>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{width:28}}>#</th>
                      <th>Model</th>
                      <th className="num">Macro acc</th>
                      <th className="num">Clean</th>
                      <th className="num">Aug avg</th>
                      <th className="num">Δ</th>
                      <th className="num">Robust</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.slice(0,6).map((s,i) => (
                      <tr key={s.id} className="clickable" onClick={()=>goto("leaderboard")}>
                        <td className="mono t-mute">{i+1}</td>
                        <td>
                          <div className="row-h">
                            <span style={{fontWeight:500}}>{s.id}</span>
                            <span className="tag">{s.type}</span>
                          </div>
                        </td>
                        <td className="num mono">
                          <Uov.Bar value={s.macroAcc} color={Uov.accColor(s.macroAcc)} />
                          {Uov.fmtPct(s.macroAcc)}
                        </td>
                        <td className="num mono">{Uov.fmtPct(s.cleanAcc)}</td>
                        <td className="num mono">{Uov.fmtPct(s.augAcc)}</td>
                        <td className="num mono"><span className={"delta " + (s.deltaClean < 0 ? "neg" : "pos")}>{Uov.fmtDelta(s.deltaClean)}</span></td>
                        <td className="num mono">{s.robustness != null ? (s.robustness*100).toFixed(1) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Robustness vs accuracy</div>
                  <div className="card-sub">Each dot = one model</div>
                </div>
              </div>
              <div className="card-body">
                <ScatterPlot data={summary} />
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Recent runs</div>
                  <div className="card-sub">Latest evaluation jobs</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={()=>goto("runs")}>All runs →</button>
              </div>
              <div className="card-body card-flush" style={{padding:0}}>
                <table className="table">
                  <thead>
                    <tr><th>Run</th><th>Model</th><th>Status</th><th className="num">N</th><th className="num">Started</th></tr>
                  </thead>
                  <tbody>
                    {Dov.runs.slice(0,6).map(r => (
                      <tr key={r.id}>
                        <td className="mono" style={{color:"var(--text-2)"}}>{r.id.slice(0,28)}{r.id.length>28?"…":""}</td>
                        <td className="mono">{r.model}</td>
                        <td><Uov.StatusChip status={r.status} /></td>
                        <td className="num mono">{r.n.toLocaleString()}</td>
                        <td className="mono t-mute" style={{fontSize:"var(--fs-xs)"}}>{r.started}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title">Condition difficulty</div>
                  <div className="card-sub">Avg accuracy across all models</div>
                </div>
              </div>
              <div className="card-body">
                <ConditionDifficulty conds={conds} matrix={matrix} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ScatterPlot({ data }) {
  const w = 380, h = 220, pad = 32;
  const filtered = data.filter(d => d.macroAcc != null && d.robustness != null);
  if (!filtered.length) return <div className="t-mute" style={{padding:"20px 0"}}>Not enough data points.</div>;
  const xmin = 0, xmax = 1, ymin = 0, ymax = 1;
  const X = v => pad + ((v - xmin) / (xmax - xmin)) * (w - 2 * pad);
  const Y = v => h - pad - ((v - ymin) / (ymax - ymin)) * (h - 2 * pad);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height:240}}>
      {[0.25, 0.5, 0.75].map(t => (
        <line key={"x"+t} x1={X(t)} y1={pad} x2={X(t)} y2={h-pad} stroke="var(--border)" strokeDasharray="2 3" />
      ))}
      {[0.25, 0.5, 0.75].map(t => (
        <line key={"y"+t} x1={pad} y1={Y(t)} x2={w-pad} y2={Y(t)} stroke="var(--border)" strokeDasharray="2 3" />
      ))}
      <line x1={pad} y1={h-pad} x2={w-pad} y2={h-pad} stroke="var(--border-2)" />
      <line x1={pad} y1={pad} x2={pad} y2={h-pad} stroke="var(--border-2)" />
      <text x={w/2} y={h-6} fontSize="10" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--font-mono)">macro accuracy →</text>
      <text x={10} y={h/2} fontSize="10" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--font-mono)" transform={`rotate(-90, 10, ${h/2})`}>robustness →</text>
      {filtered.map(d => (
        <g key={d.id}>
          <circle cx={X(d.macroAcc)} cy={Y(d.robustness)} r={d.type === "closed" ? 6 : 5}
                  fill={d.type === "closed" ? "var(--accent)" : "var(--text-2)"}
                  fillOpacity="0.85" stroke="var(--bg)" strokeWidth="1.5" />
          <text x={X(d.macroAcc) + 9} y={Y(d.robustness) + 3} fontSize="9" fill="var(--text-2)" fontFamily="var(--font-mono)">
            {d.id.split(/[-_]/)[0]}
          </text>
        </g>
      ))}
    </svg>
  );
}

function ConditionDifficulty({ conds, matrix }) {
  const rows = conds.map(c => {
    const accs = matrix.filter(r => r.condition === c.key && r.acc != null).map(r => r.acc);
    const avg = accs.length ? accs.reduce((s,v)=>s+v,0)/accs.length : null;
    return { ...c, avg };
  });
  const dataMax = Math.max(...rows.map(r => r.avg || 0), 0.001);
  const fmt = (v) =>
    v == null ? "—" :
    dataMax >= 0.5 ? `${(v*100).toFixed(1)}%` :
    dataMax >= 0.05 ? `${(v*100).toFixed(2)}%` :
    v.toFixed(4);
  return (
    <div style={{display:"flex", flexDirection:"column", gap: 10}}>
      <div className="t-mute mono" style={{fontSize:"var(--fs-xs)", textAlign:"right"}}>
        bar scaled to max = {fmt(dataMax)}
      </div>
      {rows.map(r => (
        <div key={r.key} className="row-h" style={{gap: 12}}>
          <div style={{width: 110, display:"flex", alignItems:"center"}}>
            <Uov.SeverityDot severity={r.severity} />
            <span className="mono" style={{fontSize:"var(--fs-sm)"}}>{r.label}</span>
          </div>
          <div style={{flex:1, position:"relative", height: 20, background:"var(--bg-2)", borderRadius:3}}>
            {r.avg != null && (
              <div style={{
                position:"absolute", left:0, top:0, bottom:0,
                width: `${(r.avg/dataMax)*100}%`,
                background: Uov.accColor(r.avg / Math.max(dataMax, 1e-9)),
                borderRadius: 3, opacity: 0.85,
              }} />
            )}
          </div>
          <div className="mono t-num" style={{width:80, textAlign:"right", fontSize:"var(--fs-sm)"}}>{fmt(r.avg)}</div>
        </div>
      ))}
    </div>
  );
}

window.__OverviewScreen = OverviewScreen;
