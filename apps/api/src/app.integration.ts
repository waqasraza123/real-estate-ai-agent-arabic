import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApiApp } from "./app";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";

describe("lead capture api", () => {
  let store: Awaited<ReturnType<typeof createAlphaLeadCaptureStore>>;
  let app: ReturnType<typeof buildApiApp>;

  beforeEach(async () => {
    store = await createAlphaLeadCaptureStore({
      inMemory: true
    });
    app = buildApiApp({
      store
    });
  });

  afterEach(async () => {
    await app.close();
    await store.close();
  });

  it("creates a persisted website lead case with seeded document requests", async () => {
    const response = await app.inject({
      method: "POST",
      payload: {
        budget: "USD 650,000",
        customerName: "Aisha Rahman",
        email: "aisha@example.com",
        message: "Looking for a three-bedroom apartment and can visit this weekend.",
        phone: "+1-555-0100",
        preferredLocale: "en",
        projectInterest: "Sunrise Residences"
      },
      url: "/v1/website-leads"
    });

    expect(response.statusCode).toBe(201);

    const createdCase = response.json();

    expect(createdCase.stage).toBe("new");
    expect(createdCase.source).toBe("website");
    expect(createdCase.ownerName).toBe("Revenue Ops Queue");
    expect(createdCase.followUpStatus).toBe("on_track");
    expect(createdCase.automationStatus).toBe("active");

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().documentRequests).toHaveLength(3);
    expect(detailResponse.json().managerInterventions).toHaveLength(0);
    expect(detailResponse.json().handoverCase).toBeNull();
  });

  it("promotes a document-complete case into persisted handover intake with milestone planning and customer update approval", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Omar Haddad",
        email: "omar@example.com",
        message: "Need an Arabic-speaking follow-up for a family home search.",
        preferredLocale: "ar",
        projectInterest: "Palm Horizon"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const qualificationResponse = await app.inject({
      method: "POST",
      payload: {
        budgetBand: "SAR 1.9M to 2.2M",
        intentSummary: "Family buyer with high intent and flexible weekend availability.",
        moveInTimeline: "Within 60 days",
        readiness: "high"
      },
      url: `/v1/cases/${createdCase.caseId}/qualification`
    });

    expect(qualificationResponse.statusCode).toBe(200);
    expect(qualificationResponse.json().stage).toBe("qualified");

    const visitResponse = await app.inject({
      method: "POST",
      payload: {
        location: "Palm Horizon Discovery Center",
        scheduledAt: "2026-04-15T12:30:00.000Z"
      },
      url: `/v1/cases/${createdCase.caseId}/visits`
    });

    expect(visitResponse.statusCode).toBe(200);

    const documentRequests = visitResponse.json().documentRequests;

    for (const documentRequest of documentRequests) {
      const documentResponse = await app.inject({
        method: "PATCH",
        payload: {
          status: "accepted"
        },
        url: `/v1/cases/${createdCase.caseId}/documents/${documentRequest.documentRequestId}`
      });

      expect(documentResponse.statusCode).toBe(200);
    }

    const handoverIntakeResponse = await app.inject({
      method: "POST",
      payload: {
        ownerName: "Handover Desk Riyadh",
        readinessSummary: "Documents are accepted and the case is ready to start internal handover readiness."
      },
      url: `/v1/cases/${createdCase.caseId}/handover-intake`
    });

    expect(handoverIntakeResponse.statusCode).toBe(200);
    expect(handoverIntakeResponse.json().stage).toBe("handover_initiated");
    expect(handoverIntakeResponse.json().handoverCase.status).toBe("pending_readiness");

    const handoverCaseId = handoverIntakeResponse.json().handoverCase.handoverCaseId;

    const handoverDetailResponse = await app.inject({
      method: "GET",
      url: `/v1/handover-cases/${handoverCaseId}`
    });

    expect(handoverDetailResponse.statusCode).toBe(200);
    expect(handoverDetailResponse.json().tasks).toHaveLength(3);
    expect(handoverDetailResponse.json().milestones).toHaveLength(3);
    expect(handoverDetailResponse.json().customerUpdates).toHaveLength(3);

    const firstTaskId = handoverDetailResponse.json().tasks[0]?.taskId;
    const readinessMilestoneId = handoverDetailResponse.json().milestones[0]?.milestoneId;
    const readinessCustomerUpdateId = handoverDetailResponse.json().customerUpdates[0]?.customerUpdateId;

    const taskUpdateResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "blocked"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${firstTaskId}`
    });

    expect(taskUpdateResponse.statusCode).toBe(200);
    expect(taskUpdateResponse.json().status).toBe("internal_tasks_open");
    expect(taskUpdateResponse.json().tasks[0]?.status).toBe("blocked");

    const earlyCustomerApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
    });

    expect(earlyCustomerApprovalResponse.statusCode).toBe(409);
    expect(earlyCustomerApprovalResponse.json().error).toBe("handover_customer_update_not_ready");

    const milestoneUpdateResponse = await app.inject({
      method: "PATCH",
      payload: {
        ownerName: "Customer Care Desk",
        status: "ready",
        targetAt: "2026-04-18T09:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${readinessMilestoneId}`
    });

    expect(milestoneUpdateResponse.statusCode).toBe(200);
    expect(
      milestoneUpdateResponse.json().milestones.find((milestone: { milestoneId: string }) => milestone.milestoneId === readinessMilestoneId)?.status
    ).toBe("ready");
    expect(
      milestoneUpdateResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === readinessCustomerUpdateId
      )?.status
    ).toBe("ready_for_approval");

    const customerApprovalResponse = await app.inject({
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
    });

    expect(customerApprovalResponse.statusCode).toBe(200);
    expect(
      customerApprovalResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === readinessCustomerUpdateId
      )?.status
    ).toBe("approved");

    const refreshedCaseResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(refreshedCaseResponse.statusCode).toBe(200);
    expect(refreshedCaseResponse.json().handoverCase.status).toBe("internal_tasks_open");
  });

  it("rejects invalid payloads and invalid handover promotion attempts", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "X",
        email: "invalid-email"
      },
      url: "/v1/website-leads"
    });

    expect(createResponse.statusCode).toBe(400);

    const liveCaseResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Layal Abbas",
        email: "layal@example.com",
        message: "Need a bilingual callback later today.",
        preferredLocale: "ar",
        projectInterest: "Palm Horizon"
      },
      url: "/v1/website-leads"
    });

    const createdCase = liveCaseResponse.json();

    const invalidAutomationResponse = await app.inject({
      method: "POST",
      payload: {
        status: "stopped"
      },
      url: `/v1/cases/${createdCase.caseId}/automation`
    });

    expect(invalidAutomationResponse.statusCode).toBe(400);

    const earlyHandoverResponse = await app.inject({
      method: "POST",
      payload: {
        readinessSummary: "Attempt to skip document completion."
      },
      url: `/v1/cases/${createdCase.caseId}/handover-intake`
    });

    expect(earlyHandoverResponse.statusCode).toBe(409);
    expect(earlyHandoverResponse.json().error).toBe("documents_incomplete_for_handover");
  });
});
