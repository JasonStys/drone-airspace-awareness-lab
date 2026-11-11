/** Jason Stys: actual extracted Rust/file/config/export/owned Quit journey. Map: docs/SOURCE_MAP.md. */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const [raw, token, _bundle, output, ...extra] = process.argv.slice(2);
assert.deepEqual(extra, []);
const url = new URL(raw);
assert.equal(url.protocol, "http:");
assert.equal(url.hostname, "127.0.0.1");
assert.equal(url.pathname, "/");
assert.equal(url.username + url.password + url.search + url.hash, "");
assert.match(token ?? "", /^[a-f0-9]{64}$/);
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({
    baseURL: url.href,
    acceptDownloads: true,
    viewport: { width: 1440, height: 1000 },
  });
  context.setDefaultTimeout(8000);
  const external = [],
    errors = [];
  await context.route("**/*", (route) => {
    if (new URL(route.request().url()).origin !== url.origin) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(url.href + "#desktop=" + token);
  await expect(page.getByLabel("Desktop application")).toContainText(
    "Desktop airspace viewer v0.2.0",
  );
  await expect(page.locator("#message")).toContainText("Analysis complete");
  assert.equal(new URL(page.url()).hash, "");
  const base = {
    observed_s: 1000,
    east_m: 0,
    north_m: 0,
    altitude_m: 100,
    ve_mps: 0,
    vn_mps: 0,
    vz_mps: 0,
    altitude_reference: "MSL",
  };
  const source = {
    title: "Imported crossing exercise",
    as_of_s: 1000,
    horizon_s: 120,
    horizontal_margin_m: 100,
    reports: [
      { ...base, track: "StationaryA" },
      { ...base, track: "ApproachingB", east_m: 1000, ve_mps: -10 },
    ],
  };
  async function importAndAnalyze(value) {
    await page.getByLabel("Open JSON file").setInputFiles({
      name: "custom-synthetic.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(value)),
    });
    await expect(page.locator("#message")).toContainText(
      "Imported into the editor",
    );
    await expect(
      page.getByRole("button", { name: "Export evidence" }),
    ).toBeDisabled();
    const response = page.waitForResponse(
      (item) =>
        item.url() === url.href + "api/analyze" &&
        item.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Analyze replay", exact: true })
      .click();
    const actual = await response;
    assert.equal(actual.status(), 200);
    await expect(page.locator("#message")).toContainText("Analysis complete");
    return actual.json();
  }
  const result = await importAndAnalyze(source);
  assert.equal(result.alerts.length, 1);
  assert.equal(result.alerts[0].kind, "traffic");
  assert.equal(result.alerts[0].start_s, 90);
  assert.equal(result.alerts[0].end_s, 110);
  const approaching = page.locator(
    '#plot circle[data-position-track="ApproachingB"]',
  );
  assert.equal(Number(await approaching.getAttribute("cx")), 570);
  await page.locator("#time").focus();
  await page.keyboard.press("End");
  await expect(page.locator("#time-value")).toContainText("120 s");
  assert.equal(Number(await approaching.getAttribute("cx")), 246);
  const boxes = await page
    .locator("#plot [data-label-box]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBBox();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
  assert.equal(boxes.length, 2);
  assert.ok(
    boxes[0].x + boxes[0].width <= boxes[1].x ||
      boxes[1].x + boxes[1].width <= boxes[0].x ||
      boxes[0].y + boxes[0].height <= boxes[1].y ||
      boxes[1].y + boxes[1].height <= boxes[0].y,
  );
  await page
    .getByText("Track key and projected positions (2)", { exact: true })
    .click();
  const geometry = await page
    .locator('#plot [data-position-track], #plot line[stroke-dasharray="5 5"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        node.getAttribute("cx"),
        node.getAttribute("cy"),
        node.getAttribute("x1"),
        node.getAttribute("x2"),
      ]),
    );
  await page
    .getByRole("button", { name: "Label StationaryA", exact: true })
    .click();
  assert.deepEqual(
    await page
      .locator(
        '#plot [data-position-track], #plot line[stroke-dasharray="5 5"]',
      )
      .evaluateAll((nodes) =>
        nodes.map((node) => [
          node.getAttribute("cx"),
          node.getAttribute("cy"),
          node.getAttribute("x1"),
          node.getAttribute("x2"),
        ]),
      ),
    geometry,
  );
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const exported = JSON.parse(
    await readFile(await (await pending).path(), "utf8"),
  );
  assert.deepEqual(exported.input, source);
  assert.deepEqual(exported.analysis, result);
  assert.deepEqual(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
    [],
  );
  await page.screenshot({
    path: path.join(output, "01-imported-crossing.png"),
    fullPage: true,
  });
  const before = await page.locator("#replay").inputValue();
  for (const [name, buffer, expected] of [
    ["invalid-utf8.json", Buffer.from([255]), "Import rejected"],
    ["oversize.json", Buffer.alloc(262145, 32), "exceeds 256 KiB"],
    [
      "nonfinite.json",
      Buffer.from('{"as_of_s":1000,"reports":[],"horizon_s":1e999}'),
      "Invalid horizon",
    ],
  ]) {
    await page
      .getByLabel("Open JSON file")
      .setInputFiles({ name, mimeType: "application/json", buffer });
    await expect(page.locator("#message")).toContainText(expected);
    assert.equal(await page.locator("#replay").inputValue(), before);
    await expect(
      page.getByRole("button", { name: "Export evidence" }),
    ).toBeDisabled();
  }
  const unqualified = {
    title: "Missing evidence review",
    as_of_s: 1000,
    reports: [
      { ...base, track: "Fresh" },
      { ...base, track: "Old", observed_s: 980 },
      { ...base, track: "Unknown", altitude_reference: "UNKNOWN" },
    ],
  };
  const excluded = await importAndAnalyze(unqualified);
  assert.equal(excluded.assessment_coverage.pairs.length, 3);
  assert.deepEqual(excluded.assessment_coverage.status_counts, {
    "not-assessed": 3,
  });
  await page.getByLabel("Inspect declared track").selectOption("Old");
  await expect(page.getByLabel("Declared partner coverage")).toContainText(
    "stale-observation:Old",
  );
  await page
    .getByRole("heading", { name: "Declared-pair assessment coverage" })
    .locator("..")
    .screenshot({ path: path.join(output, "02-unassessed-pairs.png") });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
    [],
  );
  assert.equal(
    await page.evaluate(() => localStorage.length + sessionStorage.length),
    0,
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Quit application" }).click();
  assert.equal((await context.request.get("/api/health")).status(), 200);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Quit application" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Desktop application")).toContainText(
    "Application stopped",
  );
  assert.deepEqual(external, []);
  assert.deepEqual(errors, []);
  await writeFile(
    path.join(output, "feature.json"),
    JSON.stringify(
      {
        custom_file_import: true,
        exact_window_seconds: [90, 110],
        projected_marker_x: [570, 246],
        evidence_export_exact: true,
        invalid_utf8_oversize_nonfinite_rejected: true,
        unassessed_pairs: 3,
        close_labels_separated_geometry_unchanged: true,
        cancelled_then_keyboard_quit: true,
        no_external_requests: true,
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  await context.close();
} finally {
  await browser.close();
}
