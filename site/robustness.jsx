/* global React */
const { useState: useStateRM, useMemo: useMemoRM } = React;
const Drm = window.__DATA;
const Urm = window.__UI;

function RobustnessScreen({ datasetId }) {
  const [metric, setMetric] = useStateRM("acc");
  const [selected, setSelected] = useStateRM(null);
  const ds = Urm.getDataset(datasetId);
  const conds = ds ? ds.conditions : [];
  const matrix = ds ? Urm.matrixFor(ds.id) : [];
  const models = ds ? Urm.modelsInDataset(ds.id) : [];

  if (!ds) return <div className="page"><Urm.EmptyState title="No dataset selected" /></div>;
  if (!matrix.length) return (
    <div className="page">
      <div className="page-head">
        <div><h1 className="page-title">Robustness matrix</h1></div>
      </div>
      <Urm.EmptyState title="No runs for this dataset" />
    </div>
  );

  const cell = (m, c) => matrix.find(r => r.model === m.id && r.condition === c.key);

  const cellValue = (m, c) => {
    const r = cell(m, c);
    if (!r) return null;
    if (metric === "acc") return r.acc;
    if (metric === "f1")  return r.f1;
    if (metric === "delta") {
      const clean = matrix.find(x => x.model === m.id && x.condition === "clean");
      return clean ? r.acc - clean.acc : null;
    }
    return r.acc;
  };

  const fmtCell = (v) => {
    if (v == null) return "—";
    if (metric === "delta") return (v >= 0 ? "+" : "") + (v*100).toFixed(0);
    return Math.round(v * 100);
  };
  const cellFill = (v) => {
    if (v == null) return "transparent";
    if (metric === "delta") {
      const t = Math.max(0, Math.min(1, (-v) / 0.5));
      return `oklch(0.55 ${0.04 + t*0.18} ${28 + (1-t)*120} / ${0.18 + t*0.55})`;
    }
    return Urm.accBg(v);
  };

  const sel = selected ? cell(models.find(m=>m.id===selected.model), conds.find(c=>c.key===selected.condition)) : null;
  const selModel = selected ? models.find(m=>m.id===selected.model) : null;
  const selCond  = selected ? conds.find(c=>c.key===selected.condition) : null;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Robustness matrix</h1>
          <div className="page-sub">{ds.id} · model × condition · click any cell to drill in</div>
        </div>
        <div className="row-h">
          <div className="segmented">
            <button className={metric==="acc"?"active":""}   onClick={()=>setMetric("acc")}>accuracy</button>
            <button className={metric==="f1"?"active":""}    onClick={()=>setMetric("f1")}>F1</button>
            <button className={metric==="delta"?"active":""} onClick={()=>setMetric("delta")}>Δ vs clean</button>
          </div>
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns: selected ? "1fr 360px" : "1fr", gap: 16}}>
        <div className="card">
          <div className="card-body">
            <div className="heatmap" style={{
              gridTemplateColumns: `170px repeat(${conds.length}, minmax(72px, 1fr))`,
              gap: 4,
            }}>
              <div />
              {conds.map(c => (
                <div key={c.key} className="col-label">
                  <span className="turn">
                    <Urm.SeverityDot severity={c.severity} />{c.label}
                  </span>
                </div>
              ))}
              {models.map(m => (
                <React.Fragment key={m.id}>
                  <div className="row-label">
                    <div style={{textAlign:"right"}}>
                      <div className="mono" style={{color:"var(--text)"}}>{m.id}</div>
                      <div className="mono" style={{color:"var(--muted)", fontSize: 10}}>{m.family} · {m.params}</div>
                    </div>
                  </div>
                  {conds.map(c => {
                    const v = cellValue(m, c);
                    const isSel = selected && selected.model === m.id && selected.condition === c.key;
                    return (
                      <div key={c.key}
                        className={"hcell" + (isSel ? " selected" : "")}
                        style={{
                          background: cellFill(v),
                          color: metric === "delta"
                            ? (v != null && v < -0.15 ? "var(--bg)" : "var(--text)")
                            : (v != null && v > 0.7 ? "var(--bg)" : "var(--text)"),
                        }}
                        onClick={() => setSelected({model: m.id, condition: c.key})}
                      >
                        {fmtCell(v)}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {selected && sel && (
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{selModel.id}</div>
                <div className="card-sub mono">on {selCond.label}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={()=>setSelected(null)}>×</button>
            </div>
            <div className="card-body">
              <div className="kpi-grid" style={{gridTemplateColumns:"1fr 1fr", marginBottom: 14}}>
                <div className="kpi" style={{padding:"10px 12px"}}>
                  <div className="kpi-label">Accuracy</div>
                  <div className="kpi-value" style={{fontSize: "var(--fs-xl)"}}>{Urm.fmtPct(sel.acc)}</div>
                </div>
                <div className="kpi" style={{padding:"10px 12px"}}>
                  <div className="kpi-label">Latency</div>
                  <div className="kpi-value" style={{fontSize: "var(--fs-xl)"}}>{Urm.fmtMs(sel.latency_ms)}</div>
                </div>
                <div className="kpi" style={{padding:"10px 12px"}}>
                  <div className="kpi-label">Correct / N</div>
                  <div className="kpi-value mono" style={{fontSize: "var(--fs-xl)"}}>{sel.correct}/{sel.n}</div>
                </div>
                <div className="kpi" style={{padding:"10px 12px"}}>
                  <div className="kpi-label">Run id</div>
                  <div className="kpi-value mono t-mute" style={{fontSize:"var(--fs-sm)"}}>{sel.run_id}</div>
                </div>
              </div>
              {Drm.confusion[ds.id] && Drm.confusion[ds.id][selected.model] && (
                <>
                  <div className="card-sub" style={{marginBottom: 8}}>Confusion (this model)</div>
                  <ConfusionMini conds={conds} mat={Drm.confusion[ds.id][selected.model]} highlight={selected.condition} />
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfusionMini({ conds, mat, highlight }) {
  const total = (i) => mat[i].reduce((s,v) => s+v, 0);
  return (
    <div className="heatmap" style={{gridTemplateColumns: `90px repeat(${conds.length}, 1fr)`, gap: 3}}>
      <div />
      {conds.map(c => (
        <div key={c.key} className="col-label">
          <span className="turn"><Urm.SeverityDot severity={c.severity} />{c.label}</span>
        </div>
      ))}
      {conds.map((c, i) => (
        <React.Fragment key={c.key}>
          <div className="row-label"><span className="mono" style={{fontSize: 10}}>{c.label}</span></div>
          {conds.map((cc, j) => {
            const v = mat[i][j];
            const t = total(i) || 1;
            const frac = v / t;
            const isDiag = i === j;
            const hl = highlight && (c.key === highlight);
            return (
              <div key={cc.key} className="hcell"
                style={{
                  height: 28,
                  background: isDiag
                    ? `oklch(0.65 0.18 155 / ${0.15 + frac * 0.7})`
                    : `oklch(0.55 0.18 28 / ${frac * 0.6})`,
                  color: frac > 0.5 ? "var(--bg)" : "var(--text-2)",
                  fontSize: 10,
                  outline: hl ? "1px solid var(--accent)" : "none",
                }}
              >
                {v}
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}

window.__RobustnessScreen = RobustnessScreen;
