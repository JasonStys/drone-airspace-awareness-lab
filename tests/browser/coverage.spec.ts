/** @file Jason Stys: actual native-backed declared-pair coverage, input invalidation and export. Map: docs/SOURCE_MAP.md. */
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("excluded observations remain inspectable and exportable rather than reassuringly absent", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  const report = {
    track: "Fresh",
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
    as_of_s: 1000,
    reports: [
      report,
      { ...report, track: "Old", observed_s: 980 },
      { ...report, track: "Unknown", altitude_reference: "UNKNOWN" },
    ],
  };
  await page
    .getByLabel("Replay JSON", { exact: false })
    .fill(JSON.stringify(source));
  await page
    .getByRole("button", { name: "Analyze replay", exact: true })
    .click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await page.getByLabel("Inspect declared track").selectOption("Fresh");
  await expect(page.getByLabel("Declared partner coverage")).toContainText(
    "stale-observation:Old",
  );
  await expect(page.getByLabel("Declared partner coverage")).toContainText(
    "unknown-altitude-reference",
  );
  await page.getByLabel("Inspect declared track").selectOption("Old");
  await expect(
    page.getByLabel("Declared partner coverage").locator("tr"),
  ).toHaveCount(2);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  const path = await (await pending).path();
  const saved = JSON.parse(await readFile(path!, "utf8"));
  expect(saved.analysis.assessment_coverage.pairs).toHaveLength(3);
  expect(saved.analysis.assessment_coverage.status_counts).toEqual({
    "not-assessed": 3,
  });
  await page.getByLabel("Horizon (seconds, 0–120)").fill("30");
  await expect(page.getByLabel("Declared partner coverage")).toBeEmpty();
  await expect(
    page.getByLabel("Inspect declared track").locator("option"),
  ).toHaveCount(0);
});
