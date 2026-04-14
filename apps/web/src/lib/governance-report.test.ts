import { describe, expect, it } from "vitest";

import {
  buildGovernanceReportHref,
  buildGovernanceReportSearchParams,
  parseGovernanceReportSearchParams,
  parseGovernanceReportView
} from "./governance-report";

describe("governance report filters", () => {
  it("parses defaults from empty search params", () => {
    expect(parseGovernanceReportSearchParams(undefined)).toEqual({
      limit: 50,
      windowDays: 30
    });
    expect(parseGovernanceReportView(undefined)).toBe("blended");
  });

  it("keeps the first value when repeated params are present", () => {
    expect(
      parseGovernanceReportSearchParams({
        kind: ["case_message", "handover_customer_update"],
        subjectType: "prepared_reply_draft",
        windowDays: "7"
      })
    ).toEqual({
      kind: "case_message",
      limit: 50,
      subjectType: "prepared_reply_draft",
      windowDays: 7
    });
  });

  it("serializes report filters into stable manager links", () => {
    expect(
      buildGovernanceReportSearchParams({
        kind: "handover_customer_update",
        status: "pending_review",
        windowDays: 7
      }).toString()
    ).toBe("kind=handover_customer_update&status=pending_review&windowDays=7");

    expect(
      buildGovernanceReportHref("en", {
        kind: "case_message",
        subjectType: "prepared_reply_draft",
        windowDays: 30
      })
    ).toBe("/en/manager/governance?kind=case_message&subjectType=prepared_reply_draft&windowDays=30");

    expect(
      buildGovernanceReportHref(
        "en",
        {
          kind: "case_message",
          windowDays: 30
        },
        "operational_risk"
      )
    ).toBe("/en/manager/governance?kind=case_message&windowDays=30&view=operational_risk");
  });
});
