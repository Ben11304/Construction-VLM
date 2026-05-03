/* global React */
const { useState: useStateRn } = React;
const Drn = window.__DATA;
const Urn = window.__UI;

function RunsScreen({ datasetId, taskId, scale }) {
  const [filter, setFilter] = useStateRn("");
  const [statusF, setStatusF] = useStateRn("all");
  const [datasetF, setDatasetF] = useStateRn("all");

  const filtered = Drn.runs.filter(r => {
    if (statusF !== "all" && r.status !== statusF) return false;
    if (datasetF !== "all" && r.dataset !== datasetF) return false;
    if (taskId !== "all" && taskId != null && r.task !== taskId) return false;
    if (scale !== "all" && scale != null && r.scale !== scale) return false;
    if (filter && !(r.id + r.model).toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Runs</h1>
          <div className="page-sub">Evaluation jobs · resumable from SQLite cache</div>
        </div>
      </div>

      <div className="filterbar">
        <input className="input" placeholder="Search run id or model…" value={filter} onChange={e=>setFilter(e.target.value)} />
        <div className="segmented">
          {["all","running","queued","done","failed"].map(s => (
            <button key={s} className={statusF===s?"active":""} onClick={()=>setStatusF(s)}>{s}</button>
          ))}
        </div>
        {Drn.datasets.length > 1 && (
          <select className="select" value={datasetF} onChange={e=>setDatasetF(e.target.value)}>
            <option value="all">all datasets</option>
            {Drn.datasets.map(d => <option key={d.id} value={d.id}>{d.id}</option>)}
          </select>
        )}
        <div className="spacer" />
        <span className="t-mute" style={{fontSize:"var(--fs-sm)"}}>{filtered.length} runs</span>
      </div>

      {filtered.length === 0 ? (
        <Urn.EmptyState title="No runs match the filter" hint="Or no predictions.parquet files in results/ yet." />
      ) : (
        <div className="card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Run id</th>
                <th>Model</th>
                <th>Dataset</th>
                <th>Task</th>
                <th>Prompt</th>
                <th>Scale</th>
                <th>Status</th>
                <th className="num">N</th>
                <th className="num">Metric</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="clickable">
                  <td className="mono" style={{color:"var(--text)"}}>{r.id}</td>
                  <td className="mono">{r.model}</td>
                  <td className="mono t-text2">{r.dataset}</td>
                  <td className="t-text2">{r.task}</td>
                  <td className="mono t-mute">{r.prompt}</td>
                  <td><span className="tag mono" style={{color: r.scale === "smoke" ? "var(--warn)" : "var(--good)"}}>{r.scale}</span></td>
                  <td><Urn.StatusChip status={r.status} /></td>
                  <td className="num mono">{r.n.toLocaleString()}</td>
                  <td className="num mono" title={r.aggregate_label ? `${r.aggregate_label} from ${r.aggregate_source}` : "no metrics.json"}>
                    {r.aggregate_metric != null
                      ? <><span className="mono">{r.aggregate_metric.toFixed(3)}</span> <span className="t-mute" style={{fontSize:"var(--fs-xs)"}}>{r.aggregate_label}</span></>
                      : <span className="t-mute" style={{fontSize:"var(--fs-xs)"}}>no metrics.json</span>
                    }
                  </td>
                  <td className="mono t-text2">{r.started}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

window.__RunsScreen = RunsScreen;
