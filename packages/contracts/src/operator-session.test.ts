import { describe, expect, it } from "vitest";

import { canOperatorRoleAccessWorkspace } from "./index";
import { createOperatorSessionToken, verifyOperatorSessionToken } from "./operator-session";

describe("operator session contracts", () => {
  it("creates and verifies a signed operator session token", () => {
    const token = createOperatorSessionToken("handover_manager", {
      now: new Date("2026-04-12T10:00:00.000Z")
    }).token;

    const verifiedSession = verifyOperatorSessionToken(token, {
      now: new Date("2026-04-12T11:00:00.000Z")
    });

    expect(verifiedSession?.role).toBe("handover_manager");
    expect(verifiedSession?.version).toBe(1);
  });

  it("rejects a tampered operator session token", () => {
    const token = createOperatorSessionToken("admin").token;
    const tamperedToken = `${token}tampered`;

    expect(verifyOperatorSessionToken(tamperedToken)).toBeNull();
  });

  it("separates revenue and handover manager workspaces by role", () => {
    expect(canOperatorRoleAccessWorkspace("manager_revenue", "sales_manager")).toBe(true);
    expect(canOperatorRoleAccessWorkspace("manager_handover", "sales_manager")).toBe(false);
    expect(canOperatorRoleAccessWorkspace("manager_handover", "handover_manager")).toBe(true);
    expect(canOperatorRoleAccessWorkspace("manager_revenue", "handover_coordinator")).toBe(false);
  });
});
