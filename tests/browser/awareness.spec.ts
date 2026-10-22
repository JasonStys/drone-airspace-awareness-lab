/** @file Jason Stys: native-backed user journeys, accessibility and responsive acceptance; lines: docs/SOURCE_MAP.md. */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("real replay, projection, invalidation and local export", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await expect(page.locator("#alerts")).toContainText("Training drone");
  await expect(page.locator("#quality")).toContainText("STALE");
  await expect(page.locator("#quality")).toContainText("UNKNOWN");
  await page.locator("#time").fill("30");
  await page.locator("#time").dispatchEvent("input");
  await expect(page.locator("#time-value")).toHaveText("30 s");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export evidence" }).click();
  expect((await download).suggestedFilename()).toBe(
    "synthetic-awareness-evidence.json",
  );
  await page.getByLabel("Horizon (seconds, 0–120)").fill("30");
  await expect(
    page.getByRole("button", { name: "Export evidence" }),
  ).toBeDisabled();
  await expect(page.locator("#alerts")).toBeEmpty();
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await page.locator("#replay").fill("{invalid}");
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await expect(page.locator("#message")).toContainText("Analysis failed");
  await expect(page.locator("#alerts")).toBeEmpty();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
});
test("missing data is not clear airspace; schema errors and accessible help", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  await page
    .locator("#replay")
    .fill(JSON.stringify({ as_of_s: 1000, reports: [] }));
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await expect(page.locator("#alerts")).toContainText(
    "not proof of clear airspace",
  );
  await expect(page.locator("#status")).toContainText("never a safe-to-fly");
  await page
    .locator("#replay")
    .fill(JSON.stringify({ as_of_s: 1000, reports: [], extra: "<script>" }));
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await expect(page.locator("#message")).toContainText("Analysis failed");
  await page.getByText("How to use this lab", { exact: true }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect(
    page.getByRole("link", { name: "GitHub / Contact" }),
  ).toHaveAttribute("href", "https://github.com/JasonStys");
});
