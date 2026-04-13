import { expect, test, type BrowserContext } from "@playwright/test";

import { operatorSessionCookieName } from "@real-estate-ai/contracts";
import { createOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";
import { smokeRoutes } from "@real-estate-ai/testing";

async function setOperatorRoleCookie(
  context: BrowserContext,
  role: "sales_manager" | "handover_coordinator" | "handover_manager" | "admin"
) {
  await context.addCookies([
    {
      domain: "127.0.0.1",
      httpOnly: true,
      name: operatorSessionCookieName,
      path: "/",
      sameSite: "Lax",
      value: createOperatorSessionToken(role).token
    }
  ]);
}

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

test("manager entry resolves to the handover command center in default role mode", async ({ page }) => {
  await page.goto(smokeRoutes.manager);

  await expect(page).toHaveURL(/\/en\/manager\/handover$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Handover command center");
  await expect(page.getByRole("heading", { level: 2, name: "Fixture handover queue" })).toBeVisible();
});

test("sales manager lands in the revenue command center", async ({ context, page }) => {
  await setOperatorRoleCookie(context, "sales_manager");

  await page.goto(smokeRoutes.manager);

  await expect(page).toHaveURL(/\/en\/manager\/revenue$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Revenue command center");
  await expect(page.getByText("Revenue follow-up queue")).toBeVisible();
});

test("admin manager gateway exposes both dedicated manager routes", async ({ context, page }) => {
  await setOperatorRoleCookie(context, "admin");

  await page.goto(smokeRoutes.manager);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Manager command center");
  await expect(page.getByRole("link", { name: "Open revenue command center" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open handover command center" })).toBeVisible();
});

test("sales manager cannot open the handover command center directly", async ({ context, page }) => {
  await setOperatorRoleCookie(context, "sales_manager");

  await page.goto(smokeRoutes.managerHandover);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Handover command center");
  await expect(page.getByText("Handover command center required")).toBeVisible();
});

test("sales manager cannot open the handover workspace directly", async ({ context, page }) => {
  await setOperatorRoleCookie(context, "sales_manager");

  await page.goto(smokeRoutes.handover);

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Handover workspace");
  await expect(page.getByText("Handover workspace required")).toBeVisible();
});
