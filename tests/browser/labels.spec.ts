/** Jason Stys: dense/mobile readable label fallback without geometry/export changes. Map: docs/SOURCE_MAP.md. */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test("dense names use an accessible track key and prioritization instead of overlapping labels", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  const reports = Array.from({ length: 32 }, (_, i) => ({
    track: "Cluster" + String(i).padStart(2, "0") + "X".repeat(31),
    observed_s: 1000,
    east_m: 0,
    north_m: 0,
    altitude_m: 100,
    ve_mps: 0,
    vn_mps: 0,
    vz_mps: 0,
    altitude_reference: "MSL",
  }));
  await page
    .getByLabel("Replay JSON", { exact: false })
    .fill(JSON.stringify({ as_of_s: 1000, reports }));
  await page
    .getByRole("button", { name: "Analyze replay", exact: true })
    .click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
  const actualTextFits = await page
    .locator("#plot [data-label-track]")
    .evaluateAll((nodes) =>
      nodes.every((node) => {
        const name = node.getAttribute("data-label-track");
        const box = Array.from(
          document.querySelectorAll("#plot [data-label-box]"),
        ).find((item) => item.getAttribute("data-label-box") === name);
        if (!box) return false;
        const text = (node as SVGGraphicsElement).getBBox(),
          frame = (box as SVGGraphicsElement).getBBox();
        return (
          text.width > 0 &&
          text.x >= frame.x &&
          text.y >= frame.y &&
          text.x + text.width <= frame.x + frame.width &&
          text.y + text.height <= frame.y + frame.height
        );
      }),
    );
  expect(actualTextFits).toBe(true);
  await expect(
    page.getByText("names omitted from the crowded picture", { exact: false }),
  ).toBeVisible();
  const boxes = await page
    .locator("#plot [data-label-box]")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const b = (node as SVGGraphicsElement).getBBox();
        return { x: b.x, y: b.y, right: b.x + b.width, bottom: b.y + b.height };
      }),
    );
  for (let i = 0; i < boxes.length; i += 1) {
    const a = boxes[i];
    if (!a) throw new Error("Actual label box missing");
    expect(a.x >= 8 && a.y >= 8 && a.right <= 592 && a.bottom <= 592).toBe(
      true,
    );
    for (let j = i + 1; j < boxes.length; j += 1) {
      const b = boxes[j];
      if (!b) throw new Error("Actual second label box missing");
      expect(
        a.right <= b.x || b.right <= a.x || a.bottom <= b.y || b.bottom <= a.y,
      ).toBe(true);
    }
  }
  await page
    .getByText("Track key and projected positions (32)", { exact: true })
    .click();
  await expect(page.locator(".plot-label-key li")).toHaveCount(32);
  const selected = reports[31];
  if (!selected) throw new Error("Independent final track fixture missing");
  await page
    .getByRole("button", { name: "Label " + selected.track, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Label " + selected.track, exact: true }),
  ).toBeFocused();
  await expect(
    page
      .locator("#plot [data-label-track]")
      .filter({ hasText: selected.track }),
  ).toHaveCount(1);
  for (const marker of await page
    .locator("#plot [data-position-track]")
    .evaluateAll((nodes) =>
      nodes.map((node) => [
        Number(node.getAttribute("cx")),
        Number(node.getAttribute("cy")),
      ]),
    ))
    expect(marker).toEqual([300, 300]);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const savedPath = await (await pending).path();
  if (!savedPath) throw new Error("Actual dense evidence export missing");
  const saved = JSON.parse(await readFile(savedPath, "utf8"));
  expect(saved.input.reports).toEqual(reports);
  expect(saved.analysis.alerts).toHaveLength(496);
  expect(
    saved.analysis.alerts.every(
      (item: { start_s: number; end_s: number }) =>
        item.start_s === 0 && item.end_s === 60,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: innerWidth,
    offenders: Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((node) => node.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map((node) => ({
        tag: node.tagName,
        id: node.id,
        class: node.className,
        width: node.getBoundingClientRect().width,
        right: node.getBoundingClientRect().right,
      })),
  }));
  expect(layout.width <= layout.viewport, JSON.stringify(layout)).toBe(true);
  await expect(
    page.getByRole("button", { name: "Label " + selected.track, exact: true }),
  ).toBeVisible();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
