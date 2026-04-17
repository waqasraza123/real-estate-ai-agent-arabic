import { describe, expect, it } from "vitest";

import { canUseOperatorRoleAccessKey, resolveOperatorRoleAccessKeys } from "./operator-access";

describe("operator access", () => {
  it("parses configured per-role access keys", () => {
    const keys = resolveOperatorRoleAccessKeys({
      NODE_ENV: "test",
      OPERATOR_ROLE_ACCESS_KEYS: "sales_manager:sales-key,handover_manager:handover-key"
    });

    expect(keys.get("sales_manager")).toBe("sales-key");
    expect(keys.get("handover_manager")).toBe("handover-key");
    expect(keys.has("admin")).toBe(false);
  });

  it("requires an exact access-key match for role switching", () => {
    process.env.OPERATOR_ROLE_ACCESS_KEYS = "admin:admin-secret";

    expect(canUseOperatorRoleAccessKey("admin", "admin-secret")).toBe(true);
    expect(canUseOperatorRoleAccessKey("admin", "admin-secret-2")).toBe(false);
    expect(canUseOperatorRoleAccessKey("sales_manager", "admin-secret")).toBe(false);
  });
});

