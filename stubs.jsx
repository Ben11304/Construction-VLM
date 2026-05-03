/* global React */
const Dst = window.__DATA;
const Ust = window.__UI;

function ModelsScreen() {
  if (!Dst.models.length) {
    return <div className="page"><div className="page-head"><div><h1 className="page-title">Models</h1></div></div>
      <Ust.EmptyState title="No models registered" hint="VLM agent: cveval/models/<name>.py + @register_model(...)" /></div>;
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Models</h1>
          <div className="page-sub">Registered VLM adapters · {Dst.models.length}</div>
        </div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(320px, 1fr))", gap: 12}}>
        {Dst.models.map(m => (
          <div key={m.id} className="card">
            <div className="card-body" style={{padding:16}}>
              <div className="row-h" style={{justifyContent:"space-between", marginBottom:10}}>
                <span className="mono" style={{fontWeight:600}}>{m.id}</span>
                <span className="tag">{m.type === "closed" ? "API" : "OSS"}</span>
              </div>
              <div className="col-v" style={{gap:4}}>
                <KVRow k="family"  v={m.family} />
                <KVRow k="params"  v={m.params} />
                <KVRow k="backend" v={m.backend} />
                <KVRow k="class"   v={<span style={{wordBreak:"break-all"}}>{m.cls_qualname}</span>} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DatasetsScreen() {
  if (!Dst.datasets.length) {
    return <div className="page"><div className="page-head"><div><h1 className="page-title">Datasets</h1></div></div>
      <Ust.EmptyState title="No datasets registered" hint="DATASET agent: cveval/data/<name>.py + @register_dataset(...)" /></div>;
  }
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Datasets</h1>
          <div className="page-sub">{Dst.datasets.length} registered · multi-dataset extensible via `BaseDataset.conditions_meta()`</div>
        </div>
      </div>
      <div className="col-v" style={{gap:12}}>
        {Dst.datasets.map(d => (
          <div key={d.id} className="card">
            <div className="card-head">
              <div>
                <div className="card-title mono">{d.id}</div>
                <div className="card-sub">{d.cls_qualname}</div>
              </div>
              <div className="row-h">
                {d.license && <span className="tag">{d.license}</span>}
                {d.n_total != null && <span className="tag">{d.n_total.toLocaleString()} rows</span>}
              </div>
            </div>
            <div className="card-body">
              {d.description && <div className="t-text2" style={{marginBottom:10}}>{d.description}</div>}
              {d.source_url && (
                <div style={{marginBottom:10}}>
                  <span className="mono t-mute upper" style={{fontSize:"var(--fs-xs)", marginRight:8}}>source</span>
                  <a className="mono" href={d.source_url} target="_blank" rel="noreferrer">{d.source_url}</a>
                </div>
              )}
              <div style={{marginBottom:6}}>
                <span className="mono t-mute upper" style={{fontSize:"var(--fs-xs)"}}>conditions ({d.conditions.length})</span>
              </div>
              <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                {d.conditions.map(c => (
                  <span key={c.key} className="tag mono" title={`severity ${c.severity} · group ${c.group}`}>
                    <Ust.SeverityDot severity={c.severity} />
                    {c.label}
                  </span>
                ))}
              </div>
              {d.bibtex && (
                <details style={{marginTop:14}}>
                  <summary className="t-mute mono upper" style={{fontSize:"var(--fs-xs)", cursor:"pointer"}}>BibTeX</summary>
                  <pre className="code" style={{marginTop:8}}>{d.bibtex}</pre>
                </details>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksScreen() {
  if (!Dst.tasks.length) {
    return <div className="page"><div className="page-head"><div><h1 className="page-title">Tasks</h1></div></div>
      <Ust.EmptyState title="No tasks registered" /></div>;
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Tasks</h1>
        <div className="page-sub">Registered task adapters · {Dst.tasks.length}</div></div></div>
      <div className="card card-flush">
        <table className="table">
          <thead><tr><th>name</th><th>class</th></tr></thead>
          <tbody>
            {Dst.tasks.map(t => (
              <tr key={t.id}>
                <td className="mono" style={{fontWeight:500}}>{t.id}</td>
                <td className="mono t-text2">{t.cls_qualname}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MetricsScreen() {
  if (!Dst.metrics.length) {
    return <div className="page"><div className="page-head"><div><h1 className="page-title">Metrics</h1></div></div>
      <Ust.EmptyState title="No metrics registered" hint="cveval/metrics/<name>.py with @register_metric(...)" /></div>;
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Metrics</h1>
        <div className="page-sub">Function-style registry · {Dst.metrics.length}</div></div></div>
      <div className="card card-flush">
        <table className="table">
          <thead><tr><th>name</th><th>function</th></tr></thead>
          <tbody>
            {Dst.metrics.map(m => (
              <tr key={m.id}>
                <td className="mono" style={{fontWeight:500}}>{m.id}</td>
                <td className="mono t-text2">{m.fn_qualname}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ManifestsScreen() {
  if (!Dst.manifests.length) {
    return <div className="page"><div className="page-head"><div><h1 className="page-title">Manifests</h1></div></div>
      <Ust.EmptyState title="No manifests found"
        hint="AGENT/ is gitignored — builder reads manifests from working tree." /></div>;
  }
  return (
    <div className="page">
      <div className="page-head"><div><h1 className="page-title">Manifests</h1>
        <div className="page-sub">{Dst.manifests.length} agent contracts</div></div></div>
      <div className="col-v" style={{gap:12}}>
        {Dst.manifests.map(m => (
          <div key={m.agent} className="card">
            <div className="card-head">
              <div>
                <div className="card-title">{m.agent}</div>
                <div className="card-sub mono">v{m.version} · last updated {m.last_updated}</div>
              </div>
              <span className="tag">{m.artifacts_count} artifacts</span>
            </div>
            <div className="card-body">
              <pre className="code" style={{maxHeight:400, overflow:"auto"}}>{m.raw_md}</pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function KVRow({ k, v }) {
  return (
    <div style={{display:"grid", gridTemplateColumns:"80px 1fr", gap:8, fontSize:"var(--fs-sm)"}}>
      <span className="mono t-mute upper" style={{fontSize:"var(--fs-xs)"}}>{k}</span>
      <span className="mono t-text2">{v}</span>
    </div>
  );
}

window.__StubScreens = { ModelsScreen, DatasetsScreen, TasksScreen, MetricsScreen, ManifestsScreen };
