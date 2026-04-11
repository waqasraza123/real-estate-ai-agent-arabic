import { expect, test } from "@playwright/test";

import { smokeRoutes } from "@real-estate-ai/testing";

test("landing desktop visual baseline @visual", async ({ page }) => {
  await page.setViewportSize({ height: 1400, width: 1440 });
  await page.goto(smokeRoutes.landing);
  await expect(page).toHaveScreenshot("landing-desktop.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true
  });
});

test("dashboard arabic desktop visual baseline @visual", async ({ page }) => {
  await page.setViewportSize({ height: 1400, width: 1440 });
  await page.goto(smokeRoutes.dashboardArabic);
  await expect(page).toHaveScreenshot("dashboard-ar-desktop.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true
  });
});

test("leads mobile visual baseline @visual", async ({ page }) => {
  await page.setViewportSize({ height: 1280, width: 430 });
  await page.goto("/en/leads");
  await expect(page).toHaveScreenshot("leads-mobile.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true
  });
});

test("manager mobile visual baseline @visual", async ({ page }) => {
  await page.setViewportSize({ height: 1280, width: 430 });
  await page.goto(smokeRoutes.manager);
  await expect(page).toHaveScreenshot("manager-mobile.png", {
    animations: "disabled",
    caret: "hide",
    fullPage: true
  });
});
