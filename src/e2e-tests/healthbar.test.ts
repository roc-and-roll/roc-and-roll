import { expect } from "@playwright/test";
import { GRID_SIZE } from "../shared/constants";
import { uiTest } from "./rnrTest";

uiTest(`editing HP via HPInlineEdit`, async ({ page }) => {
  const CHARACTER_NAME = "My Character";

  // Login
  await page.click("text=join as new player");
  await page.fill("input", "Christian");
  await page.press("input", "Enter");

  // Open the characters popup
  await page.click(".fa-chevron-up");
  await page.click(".fa-street-view");

  // Add a new character
  await page.click("text=Add Character");
  await page.fill('label:has-text("Name:") input', CHARACTER_NAME);
  await page.fill('label:has-text("HP") input', "100");
  await page.fill('label:has-text("Max HP") input', "100");
  // and close the character popup
  await page.click(".map-svg", { position: { x: 0, y: 0 } });

  // Drag the character onto the map
  await page.dragAndDrop(`text=${CHARACTER_NAME}`, ".map-svg", {
    targetPosition: { x: 1.5 * GRID_SIZE, y: 1.5 * GRID_SIZE },
  });

  await page.fill(".hp-inline-edit", "-5");
  await page.press(".hp-inline-edit", "Enter");
  await expect(page.locator(".hp-inline-edit")).toHaveValue("95");

  await page.fill(".hp-inline-edit", "+25");
  // https://github.com/microsoft/playwright/issues/10724
  await page.locator(".hp-inline-edit").evaluate((e) => e.blur());
  await expect(page.locator(".hp-inline-edit")).toHaveValue("120");

  await page.fill(".hp-inline-edit", "15");
  await page.press(".hp-inline-edit", "Enter");
  await expect(page.locator(".hp-inline-edit")).toHaveValue("15");
});
