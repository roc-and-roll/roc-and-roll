import type { Page } from "@playwright/test";

export async function joinAs(playerName: string, page: Page) {
  await page.click("text=join as new player");
  await page.fill("input", playerName);
  await page.press("input", "Enter");
}

export async function makeGM(page: Page) {
  await page.click(".fa-chevron-up");
  await page.click(".fa-cog");
  await page.click("text=User Settings");
  await page.check('label:has-text("Is GM:") input');
  // Close the settings popup by clicking outside it
  await page.click(".fa-cog", { force: true });
}
