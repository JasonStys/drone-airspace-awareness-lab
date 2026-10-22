/** @file Jason Stys: safe DOM rendering, replay editing and local advisory display; lines: docs/SOURCE_MAP.md. */
import "./style.css";
import { type Analysis, point, project, timeline, windowLabel } from "./math";

const root = document.querySelector<HTMLDivElement>("#app")!;
// This template is constant. All replay/server content is rendered with textContent, never HTML.
root.innerHTML = `<header><a class="brand" href="#main">A / A <span>DRONE AIRSPACE<br>AWARENESS LAB</span></a><span class="pill">SYNTHETIC · LOCAL ONLY</span></header>
<main id="main"><section class="intro"><p class="eyebrow">OBSERVE. QUESTION. UNDERSTAND.</p><h1>See the traffic.<br>See the uncertainty.</h1><p class="lead">Explore how report age, altitude references and measurement error change a synthetic airspace picture.</p></section>
<aside class="warning"><strong>Advisory exercise — not flight authorization.</strong> No live traffic, complete coverage, collision avoidance or safe-to-fly determination. Verify official airspace information separately.</aside>
<section class="workspace"><div class="visual panel"><div class="panel-head"><h2>Synthetic traffic picture</h2><span id="snapshot">Awaiting replay</span></div><svg id="plot" viewBox="0 0 600 600" role="img" aria-label="Synthetic local east-north traffic plot"></svg><div class="legend">● Fresh observation &nbsp; ◌ Stale / unknown &nbsp; ─ Constant-velocity path</div><label for="time">Projection time <output id="time-value">0 s</output></label><input id="time" type="range" min="0" max="60" value="0" step="1"/><p class="muted">Local synthetic ENU coordinates in metres. Dashed circles show bounded horizontal error, not a confidence percentage. Stale observations stay frozen.</p></div>
<div class="controls panel"><div class="panel-head"><h2>Replay controls</h2><span class="pill">SI UNITS</span></div><label for="horizon">Horizon (seconds, 0–120)</label><input id="horizon" type="number" min="0" max="120" value="60"/><label for="margin">Horizontal awareness margin (metres)</label><input id="margin" type="number" min="1" max="2000" value="100"/><div class="buttons"><button id="analyze">Analyze replay</button><button id="reset" class="secondary">Load example</button></div><p id="message" role="status" aria-live="polite">Loading synthetic example…</p><label for="replay">Replay JSON — edit or paste synthetic observations</label><textarea id="replay" spellcheck="false" rows="12"></textarea><div class="buttons"><button id="download" class="secondary" disabled>Export evidence</button></div><details><summary>How to use this lab</summary><p>Load the example, set the horizon/margin, and analyze. Move the time slider to inspect projected positions. Review all unassessed tracks and incompatible altitude references before interpreting alerts. JSON accepts up to 256 reports / 64 tracks and 16 synthetic cylindrical zones. Newest reports win; conflicting equal timestamps are rejected.</p><p>MSL and AGL are never silently mixed. All AGL observations in an exercise must share the same flat synthetic terrain datum. Error bounds expand for report age plus the full horizon. Results are conservative model overlaps, not predicted collisions.</p><p>Nothing is uploaded externally or saved by this service. Export downloads a local JSON report. Do not use personal or operational traffic data.</p></details></div></section>
<section class="panel evidence"><div class="panel-head"><h2>Evidence & limitations</h2><span id="counts">No analysis yet</span></div><p id="status">No assessment produced.</p><div class="table-scroll"><table><caption>Modeled awareness windows</caption><thead><tr><th scope="col">Type</th><th scope="col">Objects</th><th scope="col">Simultaneous overlap</th></tr></thead><tbody id="alerts"></tbody></table></div><h3>Observation quality</h3><ul id="quality"></ul><p id="model" class="muted"></p></section></main>
<footer><span>Designed & engineered by <strong>Jason Stys</strong></span><a href="https://github.com/JasonStys" rel="noreferrer">GitHub / Contact</a><a href="https://www.linkedin.com/in/jason-stys-31b30b351/" rel="noreferrer">LinkedIn</a><a href="https://www.faa.gov/uas/getting_started/where_can_i_fly/airspace_restrictions" rel="noreferrer">Official FAA airspace guidance</a></footer>`;

/** Typed fixed-element lookup; never use imported content as a selector. */
function element<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
const editor = element<HTMLTextAreaElement>("replay");
const analyzeButton = element<HTMLButtonElement>("analyze");
const resetButton = element<HTMLButtonElement>("reset");
const slider = element<HTMLInputElement>("time");
let analysis: Analysis | null = null;
let input: Record<string, unknown> | null = null;
let busy = false;
let revision = 0;

/** Render untrusted text as text; caller controls element names only. */
function text(tag: string, value: string): HTMLElement {
  const node = document.createElement(tag);
  node.textContent = value;
  return node;
}
/** Create SVG elements without string interpolation or injected markup. */
function svg(
  tag: string,
  attributes: Record<string, string | number>,
): SVGElement {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attributes).forEach(([key, value]) =>
    node.setAttribute(key, String(value)),
  );
  return node;
}
/** Plot current/predicted positions; auto-fit full paths and bounds, with north-up grid. */
function draw(): void {
  const plot = document.getElementById("plot")!;
  plot.replaceChildren();
  if (!analysis || !input) return;
  const seconds = timeline(Number(slider.value), Number(input.horizon_s));
  element("time-value").textContent = `${seconds} s`;
  const extent = Math.max(
    1000,
    ...analysis.tracks.flatMap((t) =>
      [
        ...t.position.slice(0, 2),
        ...project(t, Number(input!.horizon_s)).slice(0, 2),
      ].map((p) => Math.abs(p) + t.horizontal_bound_m),
    ),
  );
  for (let n = 0; n <= 600; n += 60) {
    plot.append(
      svg("line", { x1: n, y1: 0, x2: n, y2: 600, stroke: "#263747" }),
      svg("line", { x1: 0, y1: n, x2: 600, y2: n, stroke: "#263747" }),
    );
  }
  for (const track of analysis.tracks) {
    const start = point(track.position[0], track.position[1], extent);
    const endPosition = project(track, Number(input.horizon_s));
    const end = point(endPosition[0], endPosition[1], extent);
    const position = project(track, seconds);
    const current = point(position[0], position[1], extent);
    const color =
      track.fresh && track.reference !== "UNKNOWN" ? "#66e3c4" : "#bdc5d0";
    plot.append(
      svg("line", {
        x1: start[0],
        y1: start[1],
        x2: end[0],
        y2: end[1],
        stroke: color,
        "stroke-dasharray": "5 5",
      }),
      svg("circle", {
        cx: current[0],
        cy: current[1],
        r: Math.max(5, (track.horizontal_bound_m / extent) * 270),
        fill: "none",
        stroke: color,
        "stroke-dasharray": "3 3",
      }),
      svg("circle", { cx: current[0], cy: current[1], r: 5, fill: color }),
    );
    const label = svg("text", {
      x: current[0] + 9,
      y: current[1] - 10,
      fill: color,
      "font-size": 12,
    });
    label.textContent = track.name;
    plot.append(label);
  }
  const scale = svg("text", {
    x: 12,
    y: 586,
    fill: "#c7d6e4",
    "font-size": 13,
  });
  scale.textContent = `N ↑ · plot ±${Math.ceil(extent)} m · projected +${seconds}s`;
  plot.append(scale);
}
/** Clear obsolete evidence before a failed/revised analysis can be mistaken for current output. */
function invalidate(): void {
  revision += 1;
  analysis = null;
  input = null;
  element<HTMLButtonElement>("download").disabled = true;
  element("status").textContent =
    "Inputs changed or analysis unavailable. No current assessment.";
  element("alerts").replaceChildren();
  element("quality").replaceChildren();
  element("counts").textContent = "No current analysis";
  element("model").textContent = "";
  element("snapshot").textContent = "Awaiting analysis";
  element("message").textContent =
    "Inputs changed. Analyze again for current evidence.";
  draw();
}
/** Analyze once; no mock or fallback result is substituted for unavailable service/native kernel. */
async function run(): Promise<void> {
  if (busy) return;
  invalidate();
  busy = true;
  analyzeButton.disabled = true;
  resetButton.disabled = true;
  element("message").textContent = "Analyzing synthetic replay…";
  const requestedRevision = revision;
  try {
    const replay = JSON.parse(editor.value);
    replay.horizon_s = Number(element<HTMLInputElement>("horizon").value);
    replay.horizontal_margin_m = Number(
      element<HTMLInputElement>("margin").value,
    );
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(replay),
      signal: AbortSignal.timeout(10000),
    });
    const result = await response.json();
    if (requestedRevision !== revision) {
      element("message").textContent =
        "Inputs changed during analysis. Analyze again for current results.";
      return;
    }
    if (!response.ok)
      throw new Error(result.error ?? JSON.stringify(result.errors));
    input = replay;
    analysis = result as Analysis;
    slider.max = String(replay.horizon_s);
    slider.value = "0";
    element("snapshot").textContent = analysis.title;
    element("status").textContent = analysis.status;
    element("counts").textContent =
      `${analysis.alerts.length} modeled windows · ${analysis.unassessed_tracks} unassessed tracks · ${analysis.incomparable_pairs} incomparable pairs`;
    element("model").textContent =
      `${analysis.model}. ${analysis.superseded_reports} superseded/duplicate reports. Stale zone sources: ${analysis.stale_zones.join(", ") || "none in supplied data"}.`;
    for (const alert of analysis.alerts) {
      const row = document.createElement("tr");
      row.append(
        text("td", alert.kind),
        text("td", `${alert.first} / ${alert.second}`),
        text("td", windowLabel(alert)),
      );
      element("alerts").append(row);
    }
    if (!analysis.alerts.length) {
      const row = document.createElement("tr");
      const cell = text(
        "td",
        "No modeled overlap in supplied data — not proof of clear airspace.",
      );
      cell.setAttribute("colspan", "3");
      row.append(cell);
      element("alerts").append(row);
    }
    analysis.tracks.forEach((track) =>
      element("quality").append(
        text(
          "li",
          `${track.name}: ${track.fresh ? "fresh" : "STALE — unassessed"}, age ${track.age_s.toFixed(1)} s, altitude ${track.reference}${track.reference === "UNKNOWN" ? " — unassessed" : ""}, horizontal bound ${track.horizontal_bound_m.toFixed(1)} m`,
        ),
      ),
    );
    element("message").textContent =
      "Analysis complete. Review uncertainty and missing data below.";
    element<HTMLButtonElement>("download").disabled = false;
    draw();
  } catch (error) {
    element("message").textContent =
      `Analysis failed: ${error instanceof Error ? error.message : "unknown error"}`;
  } finally {
    busy = false;
    analyzeButton.disabled = false;
    resetButton.disabled = false;
  }
}
/** Load fixed original data and analyze through the real API. */
async function load(): Promise<void> {
  if (busy) return;
  invalidate();
  busy = true;
  analyzeButton.disabled = true;
  resetButton.disabled = true;
  const requestedRevision = revision;
  element("message").textContent = "Loading synthetic example…";
  try {
    const response = await fetch("/api/examples", {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error("Example unavailable");
    const replay = await response.json();
    if (requestedRevision !== revision) {
      element("message").textContent =
        "Inputs changed while loading. Your edits were preserved.";
      return;
    }
    editor.value = JSON.stringify(replay, null, 2);
    element<HTMLInputElement>("horizon").value = String(replay.horizon_s);
    element<HTMLInputElement>("margin").value = String(
      replay.horizontal_margin_m,
    );
    busy = false;
    await run();
  } catch {
    element("message").textContent =
      "Example unavailable. Check the local service.";
  } finally {
    busy = false;
    analyzeButton.disabled = false;
    resetButton.disabled = false;
  }
}
analyzeButton.addEventListener("click", () => void run());
resetButton.addEventListener("click", () => void load());
slider.addEventListener("input", draw);
[editor, element("horizon"), element("margin")].forEach((node) =>
  node.addEventListener("input", invalidate),
);
/** Export only current evidence in a local downloadable file, not a server-side archive. */
element("download").addEventListener("click", () => {
  if (!analysis || !input) return;
  const url = URL.createObjectURL(
    new Blob(
      [JSON.stringify({ author: "Jason Stys", input, analysis }, null, 2)],
      { type: "application/json" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "synthetic-awareness-evidence.json";
  link.click();
  URL.revokeObjectURL(url);
});
void load();
