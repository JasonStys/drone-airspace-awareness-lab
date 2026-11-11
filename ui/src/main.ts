/** @file Jason Stys: safe DOM rendering, replay editing and local advisory display; lines: docs/SOURCE_MAP.md. */
import "./style.css";
import { desktopControls } from "./desktop";
import { placeLabels } from "./labels";
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
const windowScroll = document.querySelector<HTMLElement>(
  ".evidence .table-scroll",
)!;
windowScroll.tabIndex = 0;
windowScroll.setAttribute("role", "region");
windowScroll.setAttribute("aria-label", "Modeled awareness windows");
const importLabel = text("label", "Open JSON file ");
const importFile = document.createElement("input");
importFile.type = "file";
importFile.accept = ".json,application/json";
importLabel.append(importFile);
editor.before(importLabel);
const analyzeButton = element<HTMLButtonElement>("analyze");
const resetButton = element<HTMLButtonElement>("reset");
const slider = element<HTMLInputElement>("time");
let analysis: Analysis | null = null;
let input: Record<string, unknown> | null = null;
let busy = false;
let revision = 0;
let selectedLabel: string | null = null;
let labelButtons = new Map<string, HTMLButtonElement>();
const labelNotice = text("p", "");
labelNotice.className = "muted";
const labelKey = document.createElement("details");
labelKey.className = "plot-label-key";
const labelKeyTitle = text("summary", "Track key and projected positions");
const labelKeyList = document.createElement("ul");
labelKey.append(labelKeyTitle, labelKeyList);
document.getElementById("plot")!.after(labelNotice, labelKey);
const coveragePanel = document.createElement("section");
coveragePanel.className = "panel evidence";
coveragePanel.append(text("h2", "Declared-pair assessment coverage"));
const coverageNotice = text("p", "No current assessment.");
const coverageLabel = text("label", "Inspect declared track ");
const coverageTrack = document.createElement("select");
coverageTrack.setAttribute("aria-label", "Inspect declared track");
coverageLabel.append(coverageTrack);
const coverageObservation = text("p", "");
const coverageTable = document.createElement("table");
coverageTable.append(
  text("caption", "Declared partners and assessment eligibility"),
);
const coverageHead = document.createElement("thead");
const coverageHeader = document.createElement("tr");
for (const title of ["Partner", "Assessment", "Window / limitations"]) {
  const cell = text("th", title);
  cell.setAttribute("scope", "col");
  coverageHeader.append(cell);
}
coverageHead.append(coverageHeader);
const coverageBody = document.createElement("tbody");
coverageBody.setAttribute("aria-label", "Declared partner coverage");
coverageTable.append(coverageHead, coverageBody);
const coverageScroll = text("div", "");
coverageScroll.className = "table-scroll";
coverageScroll.tabIndex = 0;
coverageScroll.setAttribute("role", "region");
coverageScroll.setAttribute("aria-label", "Declared-pair coverage table");
coverageScroll.append(coverageTable);
coveragePanel.append(
  coverageNotice,
  coverageLabel,
  coverageObservation,
  coverageScroll,
);
document.getElementById("main")!.append(coveragePanel);
coverageTrack.addEventListener("change", renderCoverage);

/** Inspect every declared partner, including stale/unknown rows excluded from native geometry. */
function renderCoverage(): void {
  coverageBody.replaceChildren();
  coverageObservation.textContent = "";
  if (!analysis) return;
  const ledger = analysis.assessment_coverage;
  coverageNotice.textContent = `${ledger.notice} ${ledger.pairs.length} declared pairs: ${
    Object.entries(ledger.status_counts)
      .map(([key, value]) => `${key} ${value}`)
      .join(" · ") || "none"
  }.`;
  const selected = coverageTrack.value;
  const observation = ledger.observations.find((row) => row.track === selected);
  if (observation)
    coverageObservation.textContent = `Observed at ${observation.observed_s} s; snapshot ${ledger.as_of_s} s; freshness inclusive through ${observation.fresh_through_s} s. ${observation.reports_received} reports / ${observation.distinct_timestamps} distinct timestamps / ${observation.duplicate_reports} exact duplicates / ${observation.superseded_observations} older observations.`;
  for (const pair of ledger.pairs.filter(
    (row) =>
      row.first === selected ||
      (row.kind === "traffic" && row.second === selected),
  )) {
    const row = document.createElement("tr");
    row.append(
      text(
        "td",
        `${pair.kind} / ${pair.first === selected ? pair.second : pair.first}`,
      ),
      text("td", pair.status),
      text(
        "td",
        `${pair.reasons.join(", ") || "eligible at snapshot"} · assessed ${pair.assessment_window_s?.join("–") ?? "no active window"} s · overlap ${pair.overlap_window_s?.join("–") ?? "none observed"}${pair.stale_zone_source ? " · STALE ZONE SOURCE" : ""}`,
      ),
    );
    coverageBody.append(row);
  }
}

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
  labelKeyList.replaceChildren();
  labelButtons = new Map();
  labelNotice.textContent = "No current track picture.";
  labelKeyTitle.textContent = "Track key and projected positions (0)";
  if (!analysis || !input) return;
  const measured: {
    name: string;
    node: SVGElement;
    bbox: DOMRect;
    x: number;
    y: number;
  }[] = [];
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
    const marker = svg("circle", {
      cx: current[0],
      cy: current[1],
      r: 5,
      fill: color,
      "data-position-track": track.name,
    });
    const markerTitle = svg("title", {});
    markerTitle.textContent = track.name;
    marker.append(markerTitle);
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
      marker,
    );
    const label = svg("text", {
      x: 0,
      y: 0,
      fill: color,
      "font-size": 12,
      visibility: "hidden",
      "data-label-track": track.name,
    });
    label.textContent = track.name;
    plot.append(label);
    measured.push({
      name: track.name,
      node: label,
      bbox: (label as SVGGraphicsElement).getBBox(),
      x: current[0],
      y: current[1],
    });
    const item = document.createElement("li");
    const choose = document.createElement("button");
    choose.type = "button";
    choose.textContent = `Label ${track.name}`;
    choose.setAttribute("aria-pressed", String(selectedLabel === track.name));
    choose.addEventListener("click", () => {
      selectedLabel = track.name;
      draw();
      labelButtons.get(track.name)?.focus();
    });
    labelButtons.set(track.name, choose);
    item.append(
      choose,
      text(
        "span",
        `Projected ENU: ${position.map((value) => value.toFixed(1)).join(", ")} m · ${track.fresh && track.reference !== "UNKNOWN" ? track.reference : "unassessed"}`,
      ),
    );
    labelKeyList.append(item);
  }
  measured.sort(
    (a, b) =>
      Number(b.name === selectedLabel) - Number(a.name === selectedLabel),
  );
  const placements = placeLabels(
    measured.map((item) => ({
      x: item.x,
      y: item.y,
      width: item.bbox.width + 8,
      height: item.bbox.height + 8,
    })),
  );
  measured.forEach((item, index) => {
    const box = placements[index];
    if (!box) {
      item.node.remove();
      return;
    }
    const line = svg("line", {
      x1: item.x,
      y1: item.y,
      x2: Math.max(box.x, Math.min(box.x + box.width, item.x)),
      y2: Math.max(box.y, Math.min(box.y + box.height, item.y)),
      stroke: "#94aebb",
      "data-label-leader": item.name,
    });
    const background = svg("rect", {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      rx: 3,
      fill: "#0c1520",
      stroke: "#304152",
      "data-label-box": item.name,
    });
    plot.insertBefore(line, item.node);
    plot.insertBefore(background, item.node);
    item.node.setAttribute("x", String(box.x + 4 - item.bbox.x));
    item.node.setAttribute("y", String(box.y + 4 - item.bbox.y));
    item.node.removeAttribute("visibility");
  });
  const hidden = placements.filter((item) => item === null).length;
  labelNotice.textContent = hidden
    ? `${hidden} names omitted from the crowded picture. Use the track key to read every name and position or prioritize one label.`
    : "Names have leader lines. The track key provides every name and projected position.";
  labelKeyTitle.textContent = `Track key and projected positions (${analysis.tracks.length})`;
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
  selectedLabel = null;
  element<HTMLButtonElement>("download").disabled = true;
  element("status").textContent =
    "Inputs changed or analysis unavailable. No current assessment.";
  element("alerts").replaceChildren();
  element("quality").replaceChildren();
  coverageTrack.replaceChildren();
  coverageNotice.textContent = "No current assessment.";
  coverageBody.replaceChildren();
  coverageObservation.textContent = "";
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
    for (const observation of analysis.assessment_coverage.observations) {
      const option = document.createElement("option");
      option.value = observation.track;
      option.textContent = observation.track;
      coverageTrack.append(option);
    }
    renderCoverage();
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
/** Import only bounded strict UTF-8 JSON into the existing editor; a newer edit always wins. */
importFile.addEventListener("change", async () => {
  const selected = importFile.files?.[0];
  if (!selected) return;
  invalidate();
  const requestedRevision = revision;
  try {
    if (selected.size > 262144) throw new Error("Replay exceeds 256 KiB");
    const raw = await selected.arrayBuffer();
    if (requestedRevision !== revision) return;
    if (raw.byteLength > 262144) throw new Error("Replay exceeds 256 KiB");
    const value = new TextDecoder("utf-8", { fatal: true }).decode(raw);
    const replay: unknown = JSON.parse(value);
    if (typeof replay !== "object" || replay === null || Array.isArray(replay))
      throw new Error("Expected a replay object");
    const horizon = "horizon_s" in replay ? replay.horizon_s : 60;
    const margin =
      "horizontal_margin_m" in replay ? replay.horizontal_margin_m : 100;
    if (
      typeof horizon !== "number" ||
      !Number.isFinite(horizon) ||
      horizon < 0 ||
      horizon > 120 ||
      typeof margin !== "number" ||
      !Number.isFinite(margin) ||
      margin < 1 ||
      margin > 2000
    )
      throw new Error("Invalid horizon or awareness margin");
    editor.value = value;
    element<HTMLInputElement>("horizon").value = String(horizon);
    element<HTMLInputElement>("margin").value = String(margin);
    element("message").textContent =
      "Imported into the editor. Review controls, then Analyze replay; this file has not been assessed yet.";
  } catch (error) {
    if (requestedRevision === revision)
      element("message").textContent =
        `Import rejected: ${error instanceof Error ? error.message : "Invalid replay"}. Editor text is unchanged; no current assessment exists.`;
  } finally {
    importFile.value = "";
  }
});
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
void desktopControls();
