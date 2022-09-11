import { joinAs, makeGM } from "./helpers.js";
import { uiTest } from "./uiTest.js";

uiTest.skip(
  `revealed map areas are synced`,
  async ({ page: pageA, browser }) => {
    await joinAs("Christian", pageA);

    const pageB = await (await browser.newContext()).newPage();
    await pageB.goto("/");
    await joinAs("Tom", pageB);

    await makeGM(pageA);

    await pageA.locator(".map-reveal-areas").waitFor({ state: "detached" });
    await pageB.locator(".map-reveal-areas").waitFor({ state: "detached" });

    await pageA.click('button[title="Reveal"]');
    await pageA.click("text=Hide all");

    await pageA.locator(".map-reveal-areas").waitFor({ state: "visible" });
    await pageB.locator(".map-reveal-areas").waitFor({ state: "visible" });

    await pageA.click('button[title="Reveal"]');
    await pageA.click("text=Reveal all");

    await pageA.locator(".map-reveal-areas").waitFor({ state: "detached" });
    await pageB.locator(".map-reveal-areas").waitFor({ state: "detached" });
  }
);
