/* global React, ReactDOM */
const { useState: useStateApp, useEffect: useEffectApp } = React;

function App() {
  const [route, setRoute] = useStateApp("overview");
  const [datasetId, setDatasetId] = useStateApp(window.__DATA.datasets[0]?.id || null);
  const [taskId, setTaskId] = useStateApp("all");
  const [scale, setScale] = useStateApp("full");
  const [shotsFilter, setShotsFilter] = useStateApp("zero");
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks({
    "theme":   "light",
    "density": "cozy",
    "accent":  "orange",
    "showCost": true,
  }) : [{theme:"light", density:"cozy", accent:"orange", showCost: true}, () => {}];

  useEffectApp(() => {
    document.documentElement.setAttribute("data-theme", tweaks.theme);
    document.documentElement.setAttribute("data-density", tweaks.density);
    // Light-mode accents pinned to ConSynth-X palette; dark-mode accents
    // remain saturated oklch tones so the existing dark theme still works.
    const isLight = tweaks.theme === "light";
    const accentMap = isLight ? {
      orange: { a: "#C2410C", a2: "#B45309" },
      cyan:   { a: "#0E7490", a2: "#155E75" },
      green:  { a: "#15803D", a2: "#166534" },
      violet: { a: "#6D28D9", a2: "#5B21B6" },
    } : {
      cyan:   { a: "oklch(0.78 0.13 200)", a2: "oklch(0.68 0.15 200)" },
      orange: { a: "oklch(0.78 0.16 55)",  a2: "oklch(0.70 0.18 55)"  },
      green:  { a: "oklch(0.78 0.16 155)", a2: "oklch(0.70 0.17 155)" },
      violet: { a: "oklch(0.72 0.16 290)", a2: "oklch(0.62 0.18 290)" },
    };
    const c = accentMap[tweaks.accent] || (isLight ? accentMap.orange : accentMap.cyan);
    document.documentElement.style.setProperty("--accent", c.a);
    document.documentElement.style.setProperty("--accent-2", c.a2);
  }, [tweaks.theme, tweaks.density, tweaks.accent]);

  const O  = window.__OverviewScreen;
  const L  = window.__LeaderboardScreen;
  const R  = window.__RobustnessScreen;
  const Ru = window.__RunsScreen;
  const S  = window.__SamplesScreen;
  const St = window.__StubScreens;

  const screenProps = { datasetId, setDatasetId, taskId, setTaskId, scale, setScale, shotsFilter, setShotsFilter, goto: setRoute };
  let content;
  if      (route === "overview")    content = <O  {...screenProps} />;
  else if (route === "leaderboard") content = <L  {...screenProps} />;
  else if (route === "robustness")  content = <R  {...screenProps} />;
  else if (route === "runs")        content = <Ru {...screenProps} />;
  else if (route === "samples")     content = <S  {...screenProps} />;
  else if (route === "models")      content = <St.ModelsScreen   {...screenProps} />;
  else if (route === "datasets")    content = <St.DatasetsScreen {...screenProps} />;
  else if (route === "tasks")       content = <St.TasksScreen    {...screenProps} />;
  else if (route === "metrics")     content = <St.MetricsScreen  {...screenProps} />;
  else if (route === "manifests")   content = <St.ManifestsScreen {...screenProps} />;
  else content = <O {...screenProps} />;

  return (
    <div className="app">
      <window.__UI.Sidebar route={route} setRoute={setRoute} />
      <div className="main">
        <window.__UI.Topbar
          route={route}
          datasetId={datasetId}
          setDatasetId={setDatasetId}
          taskId={taskId}
          setTaskId={setTaskId}
          scale={scale}
          setScale={setScale}
          shotsFilter={shotsFilter}
          setShotsFilter={setShotsFilter}
          onNewRun={()=>setRoute("runs")}
        />
        {content}
      </div>
      {window.TweaksPanel && (
        <window.TweaksPanel title="Tweaks">
          <window.TweakSection title="Appearance">
            <window.TweakRadio
              label="Theme"
              value={tweaks.theme}
              onChange={(v)=>setTweak("theme", v)}
              options={[{value:"dark", label:"Dark"}, {value:"light", label:"Light"}]}
            />
            <window.TweakRadio
              label="Density"
              value={tweaks.density}
              onChange={(v)=>setTweak("density", v)}
              options={[
                {value:"compact", label:"Compact"},
                {value:"cozy", label:"Cozy"},
                {value:"comfortable", label:"Comfy"},
              ]}
            />
            <window.TweakSelect
              label="Accent"
              value={tweaks.accent}
              onChange={(v)=>setTweak("accent", v)}
              options={[
                {value:"cyan",   label:"Cyan (technical)"},
                {value:"orange", label:"Safety orange"},
                {value:"green",  label:"Construction green"},
                {value:"violet", label:"Research violet"},
              ]}
            />
          </window.TweakSection>
        </window.TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
