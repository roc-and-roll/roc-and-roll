import { expect } from "@playwright/test";
import { uiTest } from "./rnrTest";

uiTest(`title is set correctly`, async ({ page }) => {
  expect(await page.title()).toBe("Roc & Roll");
});
