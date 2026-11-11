/** Jason Stys: real JSON file import, invalidation and independent native windows. Map: docs/SOURCE_MAP.md. */
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const stationary = {
  track: "StationaryA",
  observed_s: 1000,
  east_m: 0,
  north_m: 0,
  altitude_m: 100,
  ve_mps: 0,
  vn_mps: 0,
  vz_mps: 0,
  altitude_reference: "MSL",
};
const crossing = {
  title: "Imported crossing exercise",
  as_of_s: 1000,
  horizon_s: 120,
  horizontal_margin_m: 100,
  reports: [
    stationary,
    { ...stationary, track: "ApproachingB", east_m: 1000, ve_mps: -10 },
  ],
};

test("arbitrary supported file loads controls and exports the actual native 90–110 second window", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await page.getByLabel("Open JSON file").setInputFiles({
    name: "crossing.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(crossing)),
  });
  await expect(page.locator("#message")).toContainText(
    "Imported into the editor",
  );
  await expect(page.locator("#horizon")).toHaveValue("120");
  await expect(
    page.getByRole("button", { name: "Export evidence" }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Analyze replay", exact: true })
    .click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await expect(page.locator("#alerts")).toContainText("90.0–110.0 s");
  await page.locator("#time").focus();
  await page.keyboard.press("End");
  const boxes = await page
    .locator("#plot [data-label-box]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = (node as SVGGraphicsElement).getBBox();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
  expect(boxes).toHaveLength(2);
  const first = boxes[0],
    second = boxes[1];
  if (!first || !second) throw new Error("Actual close label boxes missing");
  expect(
    first.x + first.width <= second.x ||
      second.x + second.width <= first.x ||
      first.y + first.height <= second.y ||
      second.y + second.height <= first.y,
  ).toBe(true);
  const geometry = await page
    .locator('#plot [data-position-track], #plot line[stroke-dasharray="5 5"]')
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        node.getAttribute("cx"),
        node.getAttribute("cy"),
        node.getAttribute("x1"),
        node.getAttribute("x2"),
        node.getAttribute("y1"),
        node.getAttribute("y2"),
      ]),
    );
  await page
    .getByText("Track key and projected positions (2)", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Label StationaryA", exact: true })
    .click();
  expect(
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
          node.getAttribute("y1"),
          node.getAttribute("y2"),
        ]),
      ),
  ).toEqual(geometry);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const download = await pending;
  const path = await download.path();
  if (!path) throw new Error("Actual evidence download missing");
  const saved = JSON.parse(await readFile(path, "utf8"));
  expect(saved.input).toEqual(crossing);
  expect(saved.analysis.alerts).toEqual([
    {
      kind: "traffic",
      first: "ApproachingB",
      second: "StationaryA",
      start_s: 90,
      end_s: 110,
      stale_source: false,
    },
  ]);
});

test("invalid UTF8, oversize and nonfinite control files preserve editor but clear old evidence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  const before = await page.locator("#replay").inputValue();
  for (const [name, buffer, expected] of [
    ["bad.json", Buffer.from([255]), "Import rejected"],
    ["oversize.json", Buffer.alloc(262145, 32), "exceeds 256 KiB"],
    [
      "infinite.json",
      Buffer.from('{"as_of_s":1000,"reports":[],"horizon_s":1e999}'),
      "Invalid horizon",
    ],
  ] as const) {
    await page
      .getByLabel("Open JSON file")
      .setInputFiles({ name, mimeType: "application/json", buffer });
    await expect(page.locator("#message")).toContainText(expected);
    await expect(page.locator("#replay")).toHaveValue(before);
    await expect(
      page.getByRole("button", { name: "Export evidence" }),
    ).toBeDisabled();
    await expect(page.locator("#alerts")).toBeEmpty();
  }
});

test("an older actual file read cannot overwrite a newer file or typed edit", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  // Pause only delivery of the genuine file bytes, never substitute an API or analysis response.
  await page.evaluate(() => {
    const original = File.prototype.arrayBuffer;
    const state = window as Window & {
      releaseOldRead?: () => void;
      oldReadReady?: boolean;
    };
    File.prototype.arrayBuffer = async function () {
      const bytes = await original.call(this);
      if (this.name === "older.json")
        await new Promise<void>((resolve) => {
          state.releaseOldRead = resolve;
          state.oldReadReady = true;
        });
      return bytes;
    };
  });
  await page.getByLabel("Open JSON file").setInputFiles({
    name: "older.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(crossing)),
  });
  await page.waitForFunction(
    () => (window as Window & { oldReadReady?: boolean }).oldReadReady === true,
  );
  const newest = '{"title":"Newest edit","as_of_s":1000,"reports":[]}';
  await page.locator("#replay").fill(newest);
  await page.evaluate(async () => {
    const release = (window as Window & { releaseOldRead?: () => void })
      .releaseOldRead;
    if (!release) throw new Error("Actual paused file read missing");
    release();
    // A rendering barrier follows all resumed file-read microtasks; no wall-clock sleep or retry.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
  await expect(page.locator("#replay")).toHaveValue(newest);
  await expect(
    page.getByRole("button", { name: "Export evidence" }),
  ).toBeDisabled();
  await page.evaluate(() => {
    (window as Window & { oldReadReady?: boolean }).oldReadReady = false;
  });
  await page.getByLabel("Open JSON file").setInputFiles({
    name: "older.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(crossing)),
  });
  await page.waitForFunction(
    () => (window as Window & { oldReadReady?: boolean }).oldReadReady === true,
  );
  const newestFile = {
    title: "Newest file",
    as_of_s: 1000,
    reports: [],
    horizon_s: 30,
  };
  await page.getByLabel("Open JSON file").setInputFiles({
    name: "newest.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(newestFile)),
  });
  await expect(page.locator("#message")).toContainText(
    "Imported into the editor",
  );
  await page.evaluate(async () => {
    const release = (window as Window & { releaseOldRead?: () => void })
      .releaseOldRead;
    if (!release) throw new Error("Second genuine file-read barrier missing");
    release();
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
  });
  await expect(page.locator("#replay")).toHaveValue(JSON.stringify(newestFile));
  await expect(page.locator("#horizon")).toHaveValue("30");
});
