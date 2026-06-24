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
              {m.note && (
                <div className="t-mute" style={{marginTop:10, paddingTop:8, borderTop:"1px solid var(--border)", fontSize:"var(--fs-xs)"}}>
                  <span className="tag" style={{marginRight:6, borderColor:"var(--warning)", color:"var(--warning)"}}>floor</span>
                  {m.note}
                </div>
              )}
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
  // Contract version comes from the DATASET agent manifest (manifest-driven —
  // no fabricated metadata). Per-dataset release variants ("what we run on")
  // come from each run's effective_config.yaml, surfaced by data.py.
  const dsManifest = (Dst.manifests || []).find(m => m.agent === "DATASET");
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Datasets</h1>
          <div className="page-sub">
            {Dst.datasets.length} registered
            {dsManifest && <> · contract <span className="mono">v{dsManifest.version}</span> · updated {dsManifest.last_updated}</>}
          </div>
        </div>
      </div>
      <div className="col-v" style={{gap:12}}>
        {Dst.datasets.map(d => {
          const variants = d.variants || [];
          return (
          <div key={d.id} className="card">
            <div className="card-head">
              <div>
                <div className="card-title mono">{d.id}</div>
                <div className="card-sub">{d.cls_qualname}</div>
              </div>
              <div className="row-h">
                {d.license && <span className="tag">{d.license}</span>}
                {d.n_total != null && <span className="tag">{d.n_total.toLocaleString()} rows</span>}
                {d.run_count > 0 && <span className="tag">{d.run_count} runs</span>}
              </div>
            </div>
            <div className="card-body">
              <div className="t-text2" style={{marginBottom:10}}>
                {d.description || (
                  <span className="t-mute">No description exposed by the adapter — see the DATASET manifest on the Manifests page.</span>
                )}
              </div>
              <KVRow k="source" v={
                d.source_url
                  ? <a className="mono" href={d.source_url} target="_blank" rel="noreferrer" style={{wordBreak:"break-all"}}>{d.source_url}</a>
                  : <span className="t-mute">—</span>
              } />

              {/* Release / variant tracking — "what dataset are we running on" */}
              <div style={{margin:"16px 0 6px"}}>
                <span className="mono t-mute upper" style={{fontSize:"var(--fs-xs)"}}>releases · what we run on ({variants.length})</span>
              </div>
              {variants.length ? (
                <div className="card card-flush" style={{overflowX:"auto"}}>
                  <table className="table">
                    <thead><tr>
                      <th>release</th><th>rows</th><th>roots</th><th>tasks</th><th>models</th><th>runs</th><th>last run</th>
                    </tr></thead>
                    <tbody>
                      {variants.map(v => (
                        <tr key={v.variant}>
                          <td className="mono" style={{fontWeight:600}} title={v.data_root || ""}>{v.variant}</td>
                          <td className="mono t-text2">{(v.n_rows || 0).toLocaleString()}</td>
                          <td className="mono t-text2">{v.roots.join(", ") || "—"}</td>
                          <td className="mono t-text2">{v.tasks.join(", ") || "—"}</td>
                          <td className="mono t-text2" style={{maxWidth:200, whiteSpace:"normal"}}>{v.models.join(", ") || "—"}</td>
                          <td className="mono t-text2">{v.n_runs}</td>
                          <td className="mono t-mute" style={{whiteSpace:"nowrap"}}>{v.last_run || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="t-mute" style={{fontSize:"var(--fs-sm)"}}>
                  No runs found in <span className="mono">results/</span> — predictions may live only on the scratch mirror.
                </div>
              )}

              {/* Conditions */}
              <div style={{margin:"16px 0 6px"}}>
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
          );
        })}
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

// Caveated 5-model scale-ladder reasoning view (VLM 0.26.x). The reasoning
// ladder is a PRELIMINARY, single-judge (mistral-small-3) signal that is NOT
// judge-robust — we lead with the caveat and present totals as caveated, never
// as a clean ranking. No public overclaim of a "reasoning dissociation".
function GevalPreliminaryScreen({ g }) {
  const fmt = (v) => (typeof v === "number" ? v.toFixed(3) : "—");
  const fmtp = (v) => (v == null ? "—" : (v < 1e-4 ? v.toExponential(1) : v.toFixed(4)));
  const support = g.per_rule_support || {};
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">
            G-Eval reasoning quality
            <span className="tag" style={{marginLeft:8, borderColor:"var(--warning)", color:"var(--warning)"}}>
              PRELIMINARY
            </span>
          </h1>
          <div className="page-sub">
            safety_vqa · single-judge ({g.single_judge || "mistral-small-3"}) · scale-ladder common subset
            {g.n_common != null && <> · <span className="mono">n_common={g.n_common}</span></>}
          </div>
        </div>
      </div>

      {/* Prominent not-judge-robust caveat — this is the headline of the panel. */}
      <div className="card" style={{borderColor:"var(--warning)", borderWidth:2, marginBottom:14}}>
        <div className="card-body" style={{fontSize:"var(--fs-sm)"}}>
          <strong style={{color:"var(--warning)"}}>⚠ Preliminary · single-judge · not judge-robust.</strong>
          <div style={{marginTop:6}}>{g.caveat}</div>
          {g.support_caveat && <div className="t-mute" style={{marginTop:6}}>{g.support_caveat}</div>}
          {g.scale_note && <div className="t-mute" style={{marginTop:6}}>{g.scale_note}</div>}
          {g.pending_note && <div style={{marginTop:6}}><span className="tag" style={{marginRight:6}}>pending</span><span className="t-mute">{g.pending_note}</span></div>}
        </div>
      </div>

      {/* Per-model reasoning totals — caveated, NOT ranked (no "top" badge). */}
      <div className="card-label upper t-mute" style={{fontSize:"var(--fs-xs)", margin:"4px 0 6px"}}>
        Per-model reasoning total /6 (single-judge, common subset) — caveated, not a ranking
      </div>
      <div className="card card-flush" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr><th>model</th><th>reasoning total /6</th></tr></thead>
          <tbody>
            {g.models.map((m) => (
              <tr key={m.model}>
                <td className="mono" style={{fontWeight:600}}>{m.model}</td>
                <td className="mono t-text2">{fmt(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Scale → reasoning ladders (within-family paired) — flagged single-judge. */}
      {(g.ladders || []).length > 0 && (
        <>
          <div className="card-label upper t-mute" style={{fontSize:"var(--fs-xs)", margin:"16px 0 6px"}}>
            Scale → reasoning ladders (paired Wilcoxon + bootstrap) — single-judge, preliminary
          </div>
          <div className="card card-flush" style={{overflowX:"auto"}}>
            <table className="table">
              <thead><tr>
                <th>pair</th><th>Δ total /6</th><th>95% CI</th><th>p</th><th>signal (single-judge)</th>
              </tr></thead>
              <tbody>
                {g.ladders.map((l) => (
                  <tr key={l.pair}>
                    <td className="mono t-text2">{l.pair}</td>
                    <td className="mono t-text2">{fmt(l.delta)}</td>
                    <td className="mono t-mute">{Array.isArray(l.ci95) ? `[${l.ci95.map(x=>x?.toFixed?.(3) ?? x).join(", ")}]` : "—"}</td>
                    <td className="mono t-mute">{fmtp(l.p)}</td>
                    <td>
                      <span className="tag">
                        {l.sig ? (l.delta < 0 ? "significant negative*" : "significant positive*") : "n.s."}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="t-mute" style={{marginTop:8, fontSize:"var(--fs-xs)"}}>
            * single-judge signal only — not confirmed by a second judge (robustness
            check inconclusive). Not to be read as a settled reasoning-scaling conclusion.
          </div>
        </>
      )}
    </div>
  );
}

// safety_vqa G-Eval reasoning-quality panel (optional payload `Dst.geval`).
// Reads: geval.{n_common,per_rule_support,models[],rubric,scale_note,pairs,note}.
// Shows ONLY common-subset means (cross-model comparable). Full-slice ranking is
// deliberately NOT rendered (retracted — per-model selection bias). Renders an
// empty state when the payload is absent so it degrades gracefully.
function GevalScreen() {
  const g = Dst.geval;
  if (!g || !(g.models || []).length) {
    return <div className="page"><div className="page-head"><div>
      <h1 className="page-title">G-Eval reasoning quality</h1></div></div>
      <Ust.EmptyState title="No G-Eval stats"
        hint="VLM agent: stage _geval_common_subset_v2strict.json into results/ (safety_vqa LLM-judge)." />
    </div>;
  }
  // Caveated 5-model scale-ladder view (VLM 0.26.x): preliminary single-judge,
  // NOT judge-robust — render with a prominent caveat, never as a clean ranking.
  if (g.preliminary) return <GevalPreliminaryScreen g={g} />;
  const fmt = (v) => (typeof v === "number" ? v.toFixed(3) : "—");
  const support = g.per_rule_support || {};
  // Caveat: thin-support rules undermine per-rule reliability — surface explicitly.
  const thin = Object.entries(support).filter(([, n]) => (n || 0) < 20)
    .map(([r, n]) => `rule${r} support ${n}`).join(", ");
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">G-Eval reasoning quality</h1>
          <div className="page-sub">
            safety_vqa · LLM-as-judge · common-subset means
            {g.n_common != null && <> · <span className="mono">n_common={g.n_common}</span></>}
          </div>
        </div>
      </div>

      <div className="card" style={{borderColor:"var(--warning)", marginBottom:14}}>
        <div className="card-body" style={{fontSize:"var(--fs-sm)"}}>
          <strong>Common-subset only.</strong> Means are computed on the intersection
          of judged (image, rule) cells across all models — the cross-model
          comparable view. Full-slice ranking is not shown (per-model selection bias).
          {g.scale_note && <div className="t-mute" style={{marginTop:6}}>{g.scale_note}</div>}
          {thin && <div className="t-mute" style={{marginTop:6}}>⚠ thin per-rule support: {thin} — interpret rule-level scores with caution.</div>}
        </div>
      </div>

      <div className="card card-flush" style={{overflowX:"auto"}}>
        <table className="table">
          <thead><tr>
            <th>model</th><th>relevance /2</th><th>equivalence /2</th>
            <th>specificity /2</th><th>total /6</th>
          </tr></thead>
          <tbody>
            {g.models.map((m, i) => (
              <tr key={m.model_key || m.model}>
                <td className="mono" style={{fontWeight:600}}>
                  {i === 0 && <span className="tag" style={{marginRight:6}}>top</span>}
                  {m.model}
                </td>
                <td className="mono t-text2">{fmt(m.relevance)}</td>
                <td className="mono t-text2">{fmt(m.equivalence)}</td>
                <td className="mono t-text2">{fmt(m.specificity)}</td>
                <td className="mono" style={{fontWeight:600}}>{fmt(m.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {g.pairs && Object.keys(g.pairs).length > 0 && (
        <details style={{marginTop:14}}>
          <summary className="t-mute mono upper" style={{fontSize:"var(--fs-xs)", cursor:"pointer"}}>
            pairwise signal (paired bootstrap + Wilcoxon)
          </summary>
          <div className="card card-flush" style={{overflowX:"auto", marginTop:8}}>
            <table className="table">
              <thead><tr><th>pair</th><th>axis</th><th>Δ mean</th><th>95% CI</th><th>wilcoxon p</th><th>verdict</th></tr></thead>
              <tbody>
                {Object.entries(g.pairs).flatMap(([pair, axes]) =>
                  Object.entries(axes || {}).map(([axis, s]) => (
                    <tr key={pair + axis}>
                      <td className="mono t-text2">{pair}</td>
                      <td className="mono t-text2">{axis}</td>
                      <td className="mono t-text2">{typeof s.mean_diff === "number" ? s.mean_diff.toFixed(3) : "—"}</td>
                      <td className="mono t-mute">{Array.isArray(s.ci95) ? `[${s.ci95.map(x=>x?.toFixed?.(3) ?? x).join(", ")}]` : "—"}</td>
                      <td className="mono t-mute">{s.wilcoxon_p == null ? "—" : (s.wilcoxon_p < 1e-4 ? s.wilcoxon_p.toExponential(1) : s.wilcoxon_p.toFixed(4))}</td>
                      <td><span className="tag">{s.conclusion || "—"}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {g.note && <div className="t-mute" style={{marginTop:12, fontSize:"var(--fs-xs)"}}>{g.note}</div>}
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

window.__StubScreens = { ModelsScreen, DatasetsScreen, TasksScreen, MetricsScreen, ManifestsScreen, GevalScreen };
