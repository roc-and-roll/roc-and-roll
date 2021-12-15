import { expect } from "@playwright/test";
import { rnrtest } from "./rnrtest";

rnrtest(`title is set correctly`, async ({ page }) => {
  await page.goto("/");
  expect(await page.title()).toBe("Roc & Roll");
});
