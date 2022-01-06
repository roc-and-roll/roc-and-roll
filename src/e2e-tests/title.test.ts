import { expect } from "@playwright/test";
import { uiTest } from "./uiTest";

uiTest(`title is set correctly`, async ({ page }) => {
  expect(await page.title()).toBe("Roc & Roll");
});
