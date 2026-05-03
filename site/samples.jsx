/* global React */
const { useState: useStateS, useMemo: useMemoS } = React;
const Dsm = window.__DATA;
const Usm = window.__UI;

function SamplesScreen({ datasetId }) {
  const ds = Usm.getDataset(datasetId);
  const samples = useMemoS(() => Dsm.samples.filter(s => !ds || s.dataset === ds.id), [datasetId]);
  const models = useMemoS(() => [...new Set(samples.map(s => s.model))], [samples]);
  const [model, setModel] = useStateS(models[0] || null);
  const [cond, setCond]   = useStateS("all");
  const [correctF, setCorrectF] = useStateS("all");
  const [selected, setSelected] = useStateS(0);

  React.useEffect(() => { if (!model && models.length) setModel(models[0]); }, [models]);

  const rows = useMemoS(() => samples.filter(s => {
    if (model && s.model !== model) return false;
    if (cond !== "all" && s.condition !== cond) return false;
    if (correctF === "correct" && !s.correct) return false;
    if (correctF === "wrong"   &&  s.correct) return false;
    return true;
  }), [samples, model, cond, correctF]);

  const sel = rows[selected] || rows[0];
  const conds = ds ? ds.conditions : [];

  if (!samples.length) {
    return (
      <div className="page">
        <div className="page-head"><div><h1 className="page-title">Sample inspector</h1></div></div>
        <Usm.EmptyState title="No samples available" hint="Builder reads first 20 rows of each predictions.parquet." />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Sample inspector</h1>
          <div className="page-sub">image_id · prompt · raw_output · parsed · gt — first 20 rows of each run</div>
        </div>
      </div>

      <div className="filterbar">
        <select className="select" value={model || ""} onChange={e=>{setModel(e.target.value); setSelected(0);}}>
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="select" value={cond} onChange={e=>{setCond(e.target.value); setSelected(0);}}>
          <option value="all">all conditions</option>
          {conds.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <div className="segmented">
          <button className={correctF==="all"?"active":""}     onClick={()=>{setCorrectF("all"); setSelected(0);}}>all</button>
          <button className={correctF==="correct"?"active":""} onClick={()=>{setCorrectF("correct"); setSelected(0);}}>correct</button>
          <button className={correctF==="wrong"?"active":""}   onClick={()=>{setCorrectF("wrong"); setSelected(0);}}>errors only</button>
        </div>
        <div className="spacer" />
        <span className="t-mute" style={{fontSize:"var(--fs-sm)"}}>{rows.length} samples</span>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"380px 1fr", gap: 16}}>
        <div className="card card-flush" style={{maxHeight: 640, overflow:"auto"}}>
          <table className="table">
            <thead><tr><th>image_id</th><th>gt</th><th>parsed</th><th></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.row} className={"clickable " + (i === selected ? "selected" : "")} onClick={()=>setSelected(i)}>
                  <td className="mono" style={{fontSize: 11}}>{r.image_id}</td>
                  <td><Usm.ConditionTag datasetId={r.dataset} cond={r.gt} /></td>
                  <td className="mono" style={{color: r.correct ? "var(--good)" : "var(--bad)", fontSize:"var(--fs-xs)"}}>{r.parsed}</td>
                  <td className="mono" style={{color: r.correct ? "var(--good)" : "var(--bad)", fontSize: 12}}>
                    {r.correct ? "✓" : "✗"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sel && (
          <div className="col-v" style={{gap:16}}>
            <div className="card">
              <div className="card-head">
                <div>
                  <div className="card-title mono">{sel.image_id}</div>
                  <div className="card-sub mono">{sel.model} · row #{sel.row}</div>
                </div>
                <span className="chip" data-status={sel.correct ? "done" : "failed"}>
                  <span className="chip-dot" />
                  {sel.correct ? "correct" : "incorrect"}
                </span>
              </div>
              <div className="card-body">
                <div style={{display:"grid", gridTemplateColumns:"320px 1fr", gap:16}}>
                  <div className="img-placeholder" style={{aspectRatio:"4/3", height:240}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:10, color:"var(--muted)"}}>{sel.dataset} · {sel.condition}</div>
                      <div className="mono" style={{marginTop:6, fontSize:11, color:"var(--text-2)"}}>image bytes not exported</div>
                    </div>
                    <div className="img-tag mono">{sel.image_id}</div>
                  </div>
                  <div className="col-v" style={{gap:10}}>
                    <KV k="dataset" v={<span className="mono">{sel.dataset}</span>} />
                    <KV k="ground truth" v={<Usm.ConditionTag datasetId={sel.dataset} cond={sel.gt} />} />
                    <KV k="parsed" v={<span className="mono" style={{color: sel.correct ? "var(--good)" : "var(--bad)"}}>{sel.parsed}</span>} />
                    <KV k="latency" v={<span className="mono">{Usm.fmtMs(sel.latency_ms)}</span>} />
                    <KV k="tokens out" v={<span className="mono">{sel.tokens_out ?? "—"}</span>} />
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-head">
                <div className="card-title">Raw output</div>
                <div className="card-sub">As written to predictions.parquet</div>
              </div>
              <div className="card-body">
                <pre className="code">{sel.raw_output}</pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div style={{display:"grid", gridTemplateColumns:"100px 1fr", gap:12, alignItems:"center", padding:"6px 0", borderBottom:"1px solid var(--border)"}}>
      <span className="mono t-mute upper" style={{fontSize:"var(--fs-xs)"}}>{k}</span>
      <span style={{fontSize:"var(--fs-sm)"}}>{v}</span>
    </div>
  );
}

window.__SamplesScreen = SamplesScreen;
