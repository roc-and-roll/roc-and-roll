import { expect } from "@playwright/test";
import { RnRTest } from "./rnrtest"; //cspell: disable-line

RnRTest(`title is set correctly`, async ({ page }) => {
  expect(await page.title()).toBe("Roc & Roll");
});
