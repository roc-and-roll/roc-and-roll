import { expect } from "@playwright/test";
import { rnrtest } from "./rnrtest";

rnrtest(`title is set correctly`, async ({ page }) => {
  expect(await page.title()).toBe("Roc & Roll");
});
