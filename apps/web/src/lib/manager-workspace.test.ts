import { describe, expect, it } from "vitest";

import { getDefaultManagerPath, getManagerWorkspaceFallbackAction, getManagerWorkspacePath } from "./manager-workspace";

describe("manager workspace routing", () => {
  it("uses dedicated manager routes for single-surface roles", () => {
    expect(getDefaultManagerPath("en", "sales_manager")).toBe("/en/manager/revenue");
    expect(getDefaultManagerPath("en", "handover_manager")).toBe("/en/manager/handover");
  });

  it("keeps the manager gateway for roles that can access both surfaces", () => {
    expect(getDefaultManagerPath("en", "admin")).toBe("/en/manager");
  });

  it("falls back to the dashboard when a role has no manager workspace", () => {
    expect(getDefaultManagerPath("en", "handover_coordinator")).toBe("/en/dashboard");
  });

  it("returns localized fallback actions for denied manager routes", () => {
    expect(getManagerWorkspaceFallbackAction("en", "handover_manager")).toEqual({
      href: "/en/manager/handover",
      label: "Open handover command center"
    });
    expect(getManagerWorkspaceFallbackAction("ar", "sales_manager")).toEqual({
      href: "/ar/manager/revenue",
      label: "فتح قيادة الإيرادات"
    });
  });

  it("builds stable manager workspace paths", () => {
    expect(getManagerWorkspacePath("en", "manager_revenue")).toBe("/en/manager/revenue");
    expect(getManagerWorkspacePath("ar", "manager_handover")).toBe("/ar/manager/handover");
  });
});
