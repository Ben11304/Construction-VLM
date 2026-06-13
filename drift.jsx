/* global React */
// Drift view (BOSS-approved 2026-06-13). Renders VLM 0.10.2 paired clean→condition
// deltas: Panel A "Drift ladder" (forest plot) + Panel B "Severity slopes".
// Reads window.__DATA.paired_delta = {anchor, families[], tasks{<task>:{scalar,
//   coverage_warning, note, models:{<model>:{<cond>:{delta_mean,ci95,n_pairs,
//   anchor_mean_paired,cond_mean_paired}}}}}}.
// Pure SVG/JSX, no deps. Model identity = ColorBrewer Set2 color + marker shape
// (window.__UI.modelColor/modelMarker). A model with no data for a row/panel is
// ABSENT (never drawn at 0). Severity order comes from families[] — never re-sorted.
const Ddr = window.__DATA;
const Udr = window.__UI;

function _drCondLabel(c) {
  return ({ fog_light:"light", fog_medium:"medium", fog_heavy:"heavy",
    rain_light:"light", rain_heavy:"heavy", snow_light:"light", snow_heavy:"heavy",
    night:"night", rain_night:"rain·n", snow_night:"snow·n", small:"small" })[c] || c;
}
function _drFmt(v) { return v == null ? "—" : (v >= 0 ? "+" : "") + v.toFixed(3); }

// SVG marker per model shape.
function DriftMarker({ shape, cx, cy, r, fill, stroke, hollow }) {
  const f = hollow ? "var(--surface)" : fill;
  const common = { fill: f, stroke: stroke || fill, strokeWidth: 1.5 };
  if (shape === "square")   return <rect x={cx-r} y={cy-r} width={2*r} height={2*r} {...common} />;
  if (shape === "triangle") return <polygon points={`${cx},${cy-r-1} ${cx+r+1},${cy+r} ${cx-r-1},${cy+r}`} {...common} />;
  if (shape === "diamond")  return <polygon points={`${cx},${cy-r-1} ${cx+r+1},${cy} ${cx},${cy+r+1} ${cx-r-1},${cy}`} {...common} />;
  if (shape === "cross")    return <g stroke={stroke||fill} strokeWidth="2.4"><line x1={cx-r} y1={cy-r} x2={cx+r} y2={cy+r}/><line x1={cx-r} y1={cy+r} x2={cx+r} y2={cy-r}/></g>;
  return <circle cx={cx} cy={cy} r={r} {...common} />;
}

function DriftLegend({ models }) {
  return (
    <div className="row-h" style={{gap:16, flexWrap:"wrap", margin:"2px 0 10px"}}>
      {models.map(m => (
        <span key={m} className="row-h mono" style={{gap:6, fontSize:"var(--fs-xs)"}}>
          <svg width="16" height="16" viewBox="0 0 16 16">
            <DriftMarker shape={Udr.modelMarker(m)} cx={8} cy={8} r={4.5} fill={Udr.modelColor(m)} />
          </svg>
          {m}
        </span>
      ))}
    </div>
  );
}

// ---------- Panel A: Drift ladder (forest plot) ----------
function DriftLadder({ taskData, families }) {
  const [hover, setHover] = React.useState(null);
  const models = Object.keys(taskData.models || {}).sort();
  // Build ordered rows from families (severity order) — only conditions that
  // at least one present model actually has data for.
  const rows = [];
  families.forEach(fam => {
    const conds = fam.conditions.filter(c =>
      models.some(m => taskData.models[m] && taskData.models[m][c] && taskData.models[m][c].delta_mean != null));
    conds.forEach((c, ci) => rows.push({ family: fam.label, famKey: fam.family, cond: c, first: ci === 0, count: conds.length }));
  });
  if (!rows.length) return <div className="t-mute" style={{padding:"16px 0"}}>No paired-delta data for this task.</div>;

  // x-domain over all deltas + ci bounds, padded, always including 0.
  let lo = 0, hi = 0;
  rows.forEach(r => models.forEach(m => {
    const d = taskData.models[m] && taskData.models[m][r.cond];
    if (!d) return;
    [d.delta_mean, d.ci95 && d.ci95[0], d.ci95 && d.ci95[1]].forEach(v => {
      if (typeof v === "number") { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    });
  }));
  const span = (hi - lo) || 1; lo -= span*0.08; hi += span*0.08;
  const padL = 132, padR = 16, band = 30, top = 8, w = 720;
  const plotW = w - padL - padR;
  const h = top + rows.length*band + 8;
  const X = v => padL + ((v - lo)/(hi - lo))*plotW;
  const present = models.filter(m => rows.some(r => taskData.models[m] && taskData.models[m][r.cond]));
  const k = present.length || 1;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height: Math.min(h, 560)}} onMouseLeave={()=>setHover(null)}>
        {/* zero reference line */}
        <line x1={X(0)} y1={top} x2={X(0)} y2={h-8} stroke="var(--text-2)" strokeWidth="1.2" />
        <text x={X(0)} y={h-1} fontSize="9" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--font-mono)">0 (no drift)</text>
        {rows.map((r, ri) => {
          const cy = top + ri*band + band/2;
          return (
            <g key={r.cond}>
              {ri % 2 === 0 && <rect x={padL} y={top+ri*band} width={plotW} height={band} fill="var(--bg-2)" opacity="0.4" />}
              {r.first && <text x={6} y={cy-2} fontSize="9.5" fontWeight="600" fill="var(--text)" fontFamily="var(--font-mono)">{r.family}</text>}
              <text x={20} y={cy+ (r.first?10:3)} fontSize="9.5" fill="var(--text-2)" fontFamily="var(--font-mono)">{_drCondLabel(r.cond)}</text>
              {present.map((m, mi) => {
                const d = taskData.models[m] && taskData.models[m][r.cond];
                if (!d || d.delta_mean == null) return null;            // absent, not zero
                const off = (mi - (k-1)/2) * Math.min(8, (band-10)/k);
                const yy = cy + off;
                const ciLo = d.ci95 && d.ci95[0], ciHi = d.ci95 && d.ci95[1];
                const hollow = (typeof ciLo === "number" && typeof ciHi === "number" && ciLo <= 0 && ciHi >= 0);
                const col = Udr.modelColor(m);
                const key = m + r.cond;
                return (
                  <g key={key} onMouseEnter={()=>setHover({ m, cond:r.cond, d, x:X(d.delta_mean), y:yy })}>
                    {typeof ciLo === "number" && typeof ciHi === "number" &&
                      <line x1={X(ciLo)} y1={yy} x2={X(ciHi)} y2={yy} stroke={col} strokeWidth="1.4" opacity={hollow?0.45:0.8} />}
                    <DriftMarker shape={Udr.modelMarker(m)} cx={X(d.delta_mean)} cy={yy} r={hover&&hover.m===m&&hover.cond===r.cond?5.5:4} fill={col} stroke={col} hollow={hollow} />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="tooltip" style={{ left:`${(hover.x/w)*100}%`, top:`${(hover.y/h)*100}%` }}>
          <div className="tt-title">{hover.m} · {hover.cond}</div>
          <div className="tt-row"><span className="tt-label">Δ vs clean</span><span className="tt-val">{_drFmt(hover.d.delta_mean)}</span></div>
          <div className="tt-row"><span className="tt-label">ci95</span><span className="tt-val">[{_drFmt(hover.d.ci95&&hover.d.ci95[0])}, {_drFmt(hover.d.ci95&&hover.d.ci95[1])}]</span></div>
          <div className="tt-row"><span className="tt-label">n_pairs</span><span className="tt-val">{hover.d.n_pairs ?? "—"}</span></div>
        </div>
      )}
    </div>
  );
}

// ---------- Panel B: Severity slopes (small multiples) ----------
function SeveritySlope({ fam, taskData, models, ydom }) {
  const w = 240, h = 150, padL = 30, padR = 10, padT = 12, padB = 22;
  const xs = ["clean", ...fam.conditions];
  const X = i => padL + (i/(xs.length-1))*(w-padL-padR);
  const Y = v => h-padB - ((v - ydom[0])/((ydom[1]-ydom[0])||1))*(h-padT-padB);
  return (
    <div className="card" style={{padding:8}}>
      <div className="mono t-mute" style={{fontSize:"var(--fs-xs)", marginBottom:2}}>{fam.label}</div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{width:"100%", height:150}}>
        <line x1={padL} y1={h-padB} x2={w-padR} y2={h-padB} stroke="var(--border-2)" />
        <line x1={padL} y1={padT} x2={padL} y2={h-padB} stroke="var(--border-2)" />
        {xs.map((c,i)=>(<text key={c} x={X(i)} y={h-8} fontSize="8" fill="var(--text-2)" textAnchor="middle" fontFamily="var(--font-mono)">{i===0?"clean":_drCondLabel(c)}</text>))}
        {models.map(m => {
          const md = taskData.models[m]; if (!md) return null;
          // clean baseline = mean of anchor_mean_paired over this family's present conds.
          const anchors = fam.conditions.map(c => md[c] && md[c].anchor_mean_paired).filter(v => typeof v === "number");
          if (!anchors.length) return null;                          // model absent for this family
          const clean = anchors.reduce((s,v)=>s+v,0)/anchors.length;
          const pts = [[0, clean]];
          fam.conditions.forEach((c,i) => { const v = md[c] && md[c].cond_mean_paired; if (typeof v === "number") pts.push([i+1, v]); });
          if (pts.length < 2) return null;
          const col = Udr.modelColor(m);
          return (
            <g key={m}>
              <polyline points={pts.map(p=>`${X(p[0])},${Y(p[1])}`).join(" ")} fill="none" stroke={col} strokeWidth="1.6" opacity="0.85" />
              {pts.map(p => <g key={p[0]}><DriftMarker shape={Udr.modelMarker(m)} cx={X(p[0])} cy={Y(p[1])} r={3} fill={col} /></g>)}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function SeveritySlopes({ taskData, families }) {
  const models = Object.keys(taskData.models || {}).sort();
  const fams = families.filter(f => f.family !== "small");          // slopes only for multi-step families
  // shared y-domain across panels (same scalar) for cross-family comparability.
  let lo = Infinity, hi = -Infinity;
  fams.forEach(f => models.forEach(m => {
    const md = taskData.models[m]; if (!md) return;
    f.conditions.forEach(c => {
      [md[c]&&md[c].cond_mean_paired, md[c]&&md[c].anchor_mean_paired].forEach(v => {
        if (typeof v === "number") { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      });
    });
  }));
  if (!isFinite(lo)) return null;
  const pad = ((hi-lo)||1)*0.1; const ydom = [lo-pad, hi+pad];
  return (
    <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:10}}>
      {fams.map(f => <SeveritySlope key={f.family} fam={f} taskData={taskData} models={models} ydom={ydom} />)}
    </div>
  );
}

// ---------- combined view (hero) ----------
function DriftView({ taskId, compact }) {
  const pd = Ddr.paired_delta;
  if (!pd || !pd.tasks || !Object.keys(pd.tasks).length) {
    return <Udr.EmptyState title="No drift data" hint="VLM agent: stage paired_delta.json into each clean-anchor run dir." />;
  }
  const taskKeys = Object.keys(pd.tasks);
  const task = (taskId && taskId !== "all" && pd.tasks[taskId]) ? taskId : taskKeys.sort()[0];
  const taskData = pd.tasks[task];
  const models = Object.keys(taskData.models || {}).sort();
  return (
    <div>
      <div className="row-h" style={{justifyContent:"space-between", flexWrap:"wrap", gap:8}}>
        <div className="card-sub mono">
          task <b>{task}</b> · metric <b>{taskData.scalar}</b> · Δ = condition − clean (paired by source_id) · {models.length} model{models.length!==1?"s":""}
        </div>
      </div>
      {taskData.coverage_warning && (
        <div className="card" style={{borderColor:"var(--warning)", margin:"8px 0"}}>
          <div className="card-body" style={{fontSize:"var(--fs-xs)"}}>
            ⚠ <strong>Pairing coverage:</strong> {taskData.coverage_warning}
          </div>
        </div>
      )}
      <DriftLegend models={models} />
      <DriftLadder taskData={taskData} families={pd.families} />
      {!compact && (
        <>
          <div className="card-sub mono" style={{margin:"16px 0 6px"}}>Severity slopes — paired mean by increasing severity (clean anchor → degraded)</div>
          <SeveritySlopes taskData={taskData} families={pd.families} />
        </>
      )}
    </div>
  );
}

window.__DriftView = { DriftView, DriftLadder, SeveritySlopes, DriftLegend };
