/** @file Jason Stys: edit-during-request regressions; requests are paused then forwarded to the real service, never fulfilled with mocks. Lines: docs/SOURCE_MAP.md. */
import { test, expect } from "@playwright/test";
test("in-flight analysis and example cannot restore obsolete evidence or overwrite edits", async ({
  page,
}) => {
  const errors: string[] = [];
  const external: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:8872/"))
      external.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("#message")).toContainText("Analysis complete");
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/analyze",
    async (route) => {
      entered();
      await held;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await started;
  await expect(
    page.getByRole("button", { name: "Load example" }),
  ).toBeDisabled();
  await page.locator("#margin").fill("250");
  release();
  await expect(page.locator("#message")).toContainText(
    "Inputs changed during analysis",
  );
  await expect(page.locator("#alerts")).toBeEmpty();
  await expect(
    page.getByRole("button", { name: "Export evidence" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Analyze replay" }).click();
  await expect(page.locator("#message")).toContainText("Analysis complete");
  let releaseExample!: () => void;
  let enteredExample!: () => void;
  const exampleStarted = new Promise<void>((resolve) => {
    enteredExample = resolve;
  });
  const exampleHeld = new Promise<void>((resolve) => {
    releaseExample = resolve;
  });
  await page.route(
    "**/api/examples",
    async (route) => {
      enteredExample();
      await exampleHeld;
      await route.continue();
    },
    { times: 1 },
  );
  await page.getByRole("button", { name: "Load example" }).click();
  await exampleStarted;
  await page.locator("#replay").fill('{"as_of_s":1000,"reports":[]}');
  releaseExample();
  await expect(page.locator("#message")).toContainText(
    "Your edits were preserved",
  );
  await expect(page.locator("#replay")).toHaveValue(
    '{"as_of_s":1000,"reports":[]}',
  );
  await expect(
    page.getByRole("button", { name: "Export evidence" }),
  ).toBeDisabled();
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
});
