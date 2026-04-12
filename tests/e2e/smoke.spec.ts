import { expect, test } from "@playwright/test";

import { smokeRoutes } from "@real-estate-ai/testing";

test("landing shell renders in English", async ({ page }) => {
  await page.goto(smokeRoutes.landing);

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Turn lead response, follow-up discipline, and handover visibility into a product advantage."
  );
  await expect(page.getByTestId("landing-shell-note")).toBeVisible();
  await expect(page.getByLabel("Customer name")).toBeVisible();
});

test("dashboard route renders in Arabic with rtl direction", async ({ page }) => {
  await page.goto(smokeRoutes.dashboardArabic);

  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("مركز قيادة عمليات الإيرادات");
});

test("conversation shell shows the seeded thread", async ({ page }) => {
  await page.goto(smokeRoutes.leadConversation);

  await expect(page.getByTestId("conversation-thread")).toBeVisible();
  await expect(page.getByText("Fixture-backed agent draft")).toBeVisible();
});

test("documents shell renders seeded checklist states", async ({ page }) => {
  await page.goto(smokeRoutes.leadDocuments);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Document center");
  await expect(page.getByText("missing")).toBeVisible();
});

test("handover shell renders milestone readiness", async ({ page }) => {
  await page.goto(smokeRoutes.handover);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Handover workspace");
  await expect(page.getByText("blocked", { exact: true })).toBeVisible();
});

test("manager shell renders the command-center fallback", async ({ page }) => {
  await page.goto(smokeRoutes.manager);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Manager command center");
  await expect(page.getByText("Cases that need manager action")).toBeVisible();
});
