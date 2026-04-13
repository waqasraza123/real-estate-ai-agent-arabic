import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { operatorSessionHeaderName, type OperatorRole } from "@real-estate-ai/contracts";
import { createOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";

import { buildApiApp } from "./app";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";

function withOperatorSession(role: OperatorRole) {
  return {
    [operatorSessionHeaderName]: createOperatorSessionToken(role).token
  };
}

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
    expect(createdCase.currentQaReview).toBeNull();
    expect(createdCase.handoverCase).toBeNull();
    expect(createdCase.handoverClosure).toBeNull();

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().documentRequests).toHaveLength(3);
    expect(detailResponse.json().managerInterventions).toHaveLength(0);
    expect(detailResponse.json().handoverCase).toBeNull();
  });

  it("automatically opens a QA review when the inbound message matches policy triggers", async () => {
    const response = await app.inject({
      method: "POST",
      payload: {
        customerName: "Noura Aziz",
        email: "noura@example.com",
        message:
          "I am frustrated and need a special approval on the deposit terms. If this keeps happening, my lawyer will step in.",
        preferredLocale: "en",
        projectInterest: "Harbor Gate"
      },
      url: "/v1/website-leads"
    });

    expect(response.statusCode).toBe(201);

    const createdCase = response.json();

    expect(createdCase.automationHoldReason).toBe("qa_pending_review");
    expect(createdCase.currentQaReview.status).toBe("pending_review");
    expect(createdCase.currentQaReview.subjectType).toBe("case_message");
    expect(createdCase.currentQaReview.triggerSource).toBe("policy_rule");
    expect(createdCase.currentQaReview.policySignals).toEqual([
      "exception_request",
      "frustrated_customer_language",
      "legal_escalation_risk"
    ]);
    expect(createdCase.currentQaReview.triggerEvidence).toEqual(["special approval", "frustrated", "lawyer"]);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().qaReviews).toHaveLength(1);
    expect(detailResponse.json().auditEvents.some((event: { eventType: string }) => event.eventType === "qa_review_policy_opened")).toBe(true);

    const duplicateManualRequestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        requestedByName: "Revenue Ops",
        sampleSummary: "Attempt to add a manual QA request while the automatic policy review is already pending."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(duplicateManualRequestResponse.statusCode).toBe(409);
    expect(duplicateManualRequestResponse.json().error).toBe("qa_review_already_pending");
  });

  it("opens and resolves a QA review boundary with role-aware controls", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Layla Saeed",
        email: "layla@example.com",
        message: "Please review the latest reply draft before we send the next update to this customer.",
        preferredLocale: "en",
        projectInterest: "Canal Heights"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const unauthorizedRequestResponse = await app.inject({
      method: "POST",
      payload: {
        requestedByName: "Revenue Ops",
        sampleSummary: "Review a sensitive deposit exception request before the next outbound reply."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(unauthorizedRequestResponse.statusCode).toBe(401);

    const requestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        requestedByName: "Revenue Ops",
        sampleSummary: "Review a sensitive deposit exception request before the next outbound reply."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(requestResponse.statusCode).toBe(200);
    expect(requestResponse.json().automationHoldReason).toBe("qa_pending_review");
    expect(requestResponse.json().currentQaReview.status).toBe("pending_review");
    expect(requestResponse.json().qaReviews).toHaveLength(1);

    const qaReviewId = requestResponse.json().currentQaReview.qaReviewId;

    const duplicateRequestResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "POST",
      payload: {
        requestedByName: "Handover Manager",
        sampleSummary: "Attempt to open a second review while the first review is still pending."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(duplicateRequestResponse.statusCode).toBe(409);
    expect(duplicateRequestResponse.json().error).toBe("qa_review_already_pending");

    const forbiddenResolveResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        reviewSummary: "A sales manager attempted to resolve a QA review without reviewer authority.",
        reviewerName: "Revenue Ops",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(forbiddenResolveResponse.statusCode).toBe(403);
    expect(forbiddenResolveResponse.json().error).toBe("insufficient_role");

    const resolveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The draft stays inside approved disclosure boundaries, but the human operator should keep direct ownership of the reply.",
        reviewerName: "QA Desk",
        status: "follow_up_required"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json().automationHoldReason).toBe("qa_follow_up_required");
    expect(resolveResponse.json().currentQaReview.status).toBe("follow_up_required");
    expect(resolveResponse.json().currentQaReview.reviewerName).toBe("QA Desk");

    const repeatResolveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "Attempt to resolve an already closed QA review.",
        reviewerName: "QA Desk",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(repeatResolveResponse.statusCode).toBe(409);
    expect(repeatResolveResponse.json().error).toBe("qa_review_not_pending");

    const casesResponse = await app.inject({
      method: "GET",
      url: "/v1/cases"
    });

    expect(casesResponse.statusCode).toBe(200);
    expect(casesResponse.json().cases.find((caseItem: { caseId: string }) => caseItem.caseId === createdCase.caseId)?.currentQaReview?.status).toBe(
      "follow_up_required"
    );
    expect(casesResponse.json().cases.find((caseItem: { caseId: string }) => caseItem.caseId === createdCase.caseId)?.automationHoldReason).toBe(
      "qa_follow_up_required"
    );
  });

  it("clears the derived automation hold once a case QA review is approved", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Mila Hassan",
        email: "mila@example.com",
        message: "Please review this escalation path before the next customer reply goes out.",
        preferredLocale: "en",
        projectInterest: "Canal Heights"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const requestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        requestedByName: "Revenue Ops",
        sampleSummary: "Review the customer escalation before the next outbound reply."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(requestResponse.statusCode).toBe(200);
    expect(requestResponse.json().automationHoldReason).toBe("qa_pending_review");

    const qaReviewId = requestResponse.json().currentQaReview.qaReviewId;

    const resolveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The draft path is compliant. Resume normal follow-up.",
        reviewerName: "QA Desk",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json().automationHoldReason).toBeNull();
    expect(resolveResponse.json().currentQaReview.status).toBe("approved");

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().automationHoldReason).toBeNull();
    expect(detailResponse.json().currentQaReview.status).toBe("approved");
  });

  it("opens and resolves a prepared reply-draft QA gate with persisted draft context", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Rana Khaled",
        email: "rana@example.com",
        message: "Please send me the next steps for the reservation.",
        preferredLocale: "en",
        projectInterest: "Canal Heights"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const unauthorizedDraftRequestResponse = await app.inject({
      method: "POST",
      payload: {
        draftMessage: "We can definitely guarantee the exception and lock in the discount today.",
        requestedByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/reply-draft/qa-review`
    });

    expect(unauthorizedDraftRequestResponse.statusCode).toBe(401);

    const draftRequestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        draftMessage: "We can definitely guarantee the exception and lock in the discount today.",
        requestedByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/reply-draft/qa-review`
    });

    expect(draftRequestResponse.statusCode).toBe(200);
    expect(draftRequestResponse.json().currentQaReview.subjectType).toBe("prepared_reply_draft");
    expect(draftRequestResponse.json().currentQaReview.draftMessage).toBe(
      "We can definitely guarantee the exception and lock in the discount today."
    );
    expect(draftRequestResponse.json().currentQaReview.triggerSource).toBe("policy_rule");
    expect(draftRequestResponse.json().currentQaReview.policySignals).toEqual([
      "guaranteed_outcome_promise",
      "pricing_or_exception_promise"
    ]);

    const qaReviewId = draftRequestResponse.json().currentQaReview.qaReviewId;

    const resolveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "Remove the guarantee and discount promise before the next human reply is sent.",
        reviewerName: "QA Desk",
        status: "follow_up_required"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(resolveResponse.statusCode).toBe(200);
    expect(resolveResponse.json().currentQaReview.status).toBe("follow_up_required");
    expect(resolveResponse.json().currentQaReview.subjectType).toBe("prepared_reply_draft");
    expect(resolveResponse.json().currentQaReview.draftMessage).toBe(
      "We can definitely guarantee the exception and lock in the discount today."
    );

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(
      detailResponse
        .json()
        .auditEvents.some(
          (event: { eventType: string; payload?: { subjectType?: string } }) =>
            event.eventType === "qa_review_policy_opened" && event.payload?.subjectType === "prepared_reply_draft"
        )
    ).toBe(true);
    expect(
      detailResponse
        .json()
        .auditEvents.some(
          (event: { eventType: string; payload?: { subjectType?: string } }) =>
            event.eventType === "qa_review_resolved" && event.payload?.subjectType === "prepared_reply_draft"
        )
    ).toBe(true);
  });

  it("records a human reply after QA approves the prepared draft and consumes that draft boundary", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Hadiya Noor",
        email: "hadiya@example.com",
        message: "Please confirm the reservation process and next payment step.",
        preferredLocale: "en",
        projectInterest: "Canal Heights"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();
    const approvedDraftMessage = "The reservation process is confirmed, and I will send the exact next payment step today.";

    const draftRequestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        draftMessage: approvedDraftMessage,
        requestedByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/reply-draft/qa-review`
    });

    expect(draftRequestResponse.statusCode).toBe(200);

    const qaReviewId = draftRequestResponse.json().currentQaReview.qaReviewId;

    const approveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The draft is compliant for the next human response.",
        reviewerName: "QA Desk",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(approveResponse.statusCode).toBe(200);

    const unauthorizedSendResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "POST",
      payload: {
        message: approvedDraftMessage,
        sentByName: "QA Desk"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(unauthorizedSendResponse.statusCode).toBe(403);

    const nextAction = "Send the payment instructions and check that the customer received them.";
    const nextActionDueAt = "2026-04-14T15:00:00.000Z";

    const sendResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        message: approvedDraftMessage,
        nextAction,
        nextActionDueAt,
        sentByName: "Amina Rahman"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(sendResponse.statusCode).toBe(200);
    expect(sendResponse.json().nextAction).toBe(nextAction);
    expect(sendResponse.json().nextActionDueAt).toBe(nextActionDueAt);

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(
      detailResponse
        .json()
        .auditEvents.some(
          (event: {
            eventType: string;
            payload?: {
              approvedDraftQaReviewId?: string | null;
              message?: string;
              nextAction?: string;
              nextActionDueAt?: string;
              sentByName?: string | null;
            };
          }) =>
            event.eventType === "case_reply_sent" &&
            event.payload?.approvedDraftQaReviewId === qaReviewId &&
            event.payload?.message === approvedDraftMessage &&
            event.payload?.nextAction === nextAction &&
            event.payload?.nextActionDueAt === nextActionDueAt &&
            event.payload?.sentByName === "Amina Rahman"
        )
    ).toBe(true);

    const secondReplyResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        message: "Following up with the promised banking details and final booking checklist.",
        nextAction: "Check whether the banking details were received and confirm the booking window.",
        nextActionDueAt: "2026-04-15T12:00:00.000Z",
        sentByName: "Amina Rahman"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(secondReplyResponse.statusCode).toBe(200);
  });

  it("blocks a human reply while QA is still open and rejects edits to an approved draft", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Layla Abbas",
        email: "layla@example.com",
        message: "Please confirm the next standard reservation step for this unit.",
        preferredLocale: "en",
        projectInterest: "Harbor Gate"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const manualQaRequestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        requestedByName: "Revenue Ops",
        sampleSummary: "Review the next outbound response before a human replies to the customer."
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review`
    });

    expect(manualQaRequestResponse.statusCode).toBe(200);

    const blockedWhilePendingResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        message: "We are still reviewing the escalation internally and will return with a compliant answer.",
        nextAction: "Return with a compliant update after QA review closes.",
        nextActionDueAt: "2026-04-13T17:00:00.000Z",
        sentByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(blockedWhilePendingResponse.statusCode).toBe(409);
    expect(blockedWhilePendingResponse.json()).toEqual({
      error: "qa_review_reply_send_blocked"
    });

    const pendingQaReviewId = manualQaRequestResponse.json().currentQaReview.qaReviewId;

    const clearPendingResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The case can continue into a controlled reply-draft review.",
        reviewerName: "QA Desk",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${pendingQaReviewId}`
    });

    expect(clearPendingResponse.statusCode).toBe(200);

    const approveMessage = "We reviewed the request and can continue with the standard reservation path.";
    const draftRequestResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        draftMessage: approveMessage,
        requestedByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/reply-draft/qa-review`
    });

    expect(draftRequestResponse.statusCode).toBe(200);

    const qaReviewId = draftRequestResponse.json().currentQaReview.qaReviewId;

    const approveResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "This reply is compliant for the next human response.",
        reviewerName: "QA Desk",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${qaReviewId}`
    });

    expect(approveResponse.statusCode).toBe(200);

    const mismatchedSendResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        message: `${approveMessage} We can also guarantee the pricing exception today.`,
        nextAction: "Open a fresh draft review before sending any revised exception language.",
        nextActionDueAt: "2026-04-14T10:00:00.000Z",
        sentByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(mismatchedSendResponse.statusCode).toBe(409);
    expect(mismatchedSendResponse.json()).toEqual({
      error: "qa_approved_reply_draft_mismatch"
    });
  });

  it("resets an overdue intervention when a human reply saves the next follow-up plan", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Maya Saeed",
      email: "maya@example.com",
      message: "Please confirm the next reservation step for me.",
      nextAction: "Call back with the reservation instructions",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      preferredLocale: "en",
      projectInterest: "Canal Heights"
    });

    const followUpCycle = await store.runDueFollowUpCycle({
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(followUpCycle.openedInterventions).toBe(1);

    const sendResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        message: "I just sent the reservation instructions and will confirm receipt next.",
        nextAction: "Confirm that the customer received the reservation instructions.",
        nextActionDueAt: "2026-04-13T12:00:00.000Z",
        sentByName: "Revenue Ops"
      },
      url: `/v1/cases/${createdCase.caseId}/replies`
    });

    expect(sendResponse.statusCode).toBe(200);
    expect(sendResponse.json().openInterventionsCount).toBe(0);
    expect(sendResponse.json().nextAction).toBe("Confirm that the customer received the reservation instructions.");
    expect(sendResponse.json().nextActionDueAt).toBe("2026-04-13T12:00:00.000Z");

    const detailResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(detailResponse.statusCode).toBe(200);
    expect(detailResponse.json().openInterventionsCount).toBe(0);
    expect(detailResponse.json().managerInterventions.every((intervention: { status: string }) => intervention.status === "resolved")).toBe(true);
  });

  it("promotes a document-complete case into controlled handover execution and completion", async () => {
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
      headers: withOperatorSession("handover_manager"),
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
      headers: withOperatorSession("handover_coordinator"),
      method: "GET",
      url: `/v1/handover-cases/${handoverCaseId}`
    });

    expect(handoverDetailResponse.statusCode).toBe(200);
    expect(handoverDetailResponse.json().appointment).toBeNull();
    expect(handoverDetailResponse.json().tasks).toHaveLength(3);
    expect(handoverDetailResponse.json().milestones).toHaveLength(3);
    expect(handoverDetailResponse.json().customerUpdates).toHaveLength(3);

    const firstTaskId = handoverDetailResponse.json().tasks[0]?.taskId;
    const readinessMilestoneId = handoverDetailResponse.json().milestones[0]?.milestoneId;
    const readinessCustomerUpdateId = handoverDetailResponse.json().customerUpdates[0]?.customerUpdateId;
    const schedulingMilestoneId = handoverDetailResponse.json().milestones.find(
      (milestone: { type: string }) => milestone.type === "customer_scheduling_window"
    )?.milestoneId;
    const schedulingInviteId = handoverDetailResponse.json().customerUpdates.find(
      (customerUpdate: { type: string }) => customerUpdate.type === "scheduling_invite"
    )?.customerUpdateId;
    const appointmentHoldMilestoneId = handoverDetailResponse.json().milestones.find(
      (milestone: { type: string }) => milestone.type === "handover_appointment_hold"
    )?.milestoneId;
    const appointmentConfirmationId = handoverDetailResponse.json().customerUpdates.find(
      (customerUpdate: { type: string }) => customerUpdate.type === "appointment_confirmation"
    )?.customerUpdateId;

    const taskUpdateResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
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
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
    });

    expect(earlyCustomerApprovalResponse.statusCode).toBe(409);
    expect(earlyCustomerApprovalResponse.json().error).toBe("handover_customer_update_not_ready");

    const earlyAppointmentPlanResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment`
    });

    expect(earlyAppointmentPlanResponse.statusCode).toBe(409);
    expect(earlyAppointmentPlanResponse.json().error).toBe("handover_scheduling_boundary_not_approved");

    const milestoneUpdateResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
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
      headers: withOperatorSession("handover_manager"),
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

    const firstTaskCompletionResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "complete"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${firstTaskId}`
    });

    expect(firstTaskCompletionResponse.statusCode).toBe(200);

    const remainingTaskIds = handoverDetailResponse
      .json()
      .tasks.filter((task: { taskId: string }) => task.taskId !== firstTaskId)
      .map((task: { taskId: string }) => task.taskId);

    for (const taskId of remainingTaskIds) {
      const taskCompleteResponse = await app.inject({
        headers: withOperatorSession("handover_coordinator"),
        method: "PATCH",
        payload: {
          status: "complete"
        },
        url: `/v1/handover-cases/${handoverCaseId}/tasks/${taskId}`
      });

      expect(taskCompleteResponse.statusCode).toBe(200);
    }

    const schedulingMilestoneResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${schedulingMilestoneId}`
    });

    expect(schedulingMilestoneResponse.statusCode).toBe(200);
    expect(
      schedulingMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === schedulingInviteId
      )?.status
    ).toBe("ready_for_approval");

    const schedulingApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${schedulingInviteId}`
    });

    expect(schedulingApprovalResponse.statusCode).toBe(200);
    expect(schedulingApprovalResponse.json().status).toBe("customer_scheduling_ready");

    const appointmentPlanResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment`
    });

    expect(appointmentPlanResponse.statusCode).toBe(200);
    expect(appointmentPlanResponse.json().appointment.status).toBe("planned");
    expect(appointmentPlanResponse.json().appointment.location).toBe("Palm Horizon Tower A");

    const plannedAppointmentId = appointmentPlanResponse.json().appointment.appointmentId;

    const earlyAppointmentConfirmationResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment/${plannedAppointmentId}/confirmation`
    });

    expect(earlyAppointmentConfirmationResponse.statusCode).toBe(409);
    expect(earlyAppointmentConfirmationResponse.json().error).toBe("handover_appointment_confirmation_not_approved");

    const appointmentHoldMilestoneResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Project Ops",
        status: "ready",
        targetAt: "2026-04-21T09:00:00.000Z"
      },
      url: `/v1/handover-cases/${handoverCaseId}/milestones/${appointmentHoldMilestoneId}`
    });

    expect(appointmentHoldMilestoneResponse.statusCode).toBe(200);
    expect(
      appointmentHoldMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("ready_for_approval");

    const appointmentBoundaryApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}`
    });

    expect(appointmentBoundaryApprovalResponse.statusCode).toBe(200);

    const appointmentConfirmationResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/appointment/${plannedAppointmentId}/confirmation`
    });

    expect(appointmentConfirmationResponse.statusCode).toBe(200);
    expect(appointmentConfirmationResponse.json().appointment.status).toBe("internally_confirmed");

    const earlyDispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/dispatch-ready`
    });

    expect(earlyDispatchReadyResponse.statusCode).toBe(409);
    expect(earlyDispatchReadyResponse.json().error).toBe("handover_delivery_preparation_required");

    const deliveryPreparationResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        deliverySummary: "Arabic WhatsApp confirmation copy is prepared for manual dispatch after final ops review.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/delivery`
    });

    expect(deliveryPreparationResponse.statusCode).toBe(200);
    expect(
      deliveryPreparationResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("prepared_for_delivery");

    const earlyExecutionBlockerResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "open",
        summary: "Attempt to log a snag before the handover record is promoted into the scheduled boundary.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers`
    });

    expect(earlyExecutionBlockerResponse.statusCode).toBe(409);
    expect(earlyExecutionBlockerResponse.json().error).toBe("handover_execution_not_ready");

    const dispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/dispatch-ready`
    });

    expect(dispatchReadyResponse.statusCode).toBe(200);
    expect(dispatchReadyResponse.json().status).toBe("scheduled");
    expect(
      dispatchReadyResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === appointmentConfirmationId
      )?.status
    ).toBe("ready_to_dispatch");

    const blockerCreateResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "open",
        summary: "Two unit snag items remain unresolved at the apartment entrance and bathroom fit-out.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers`
    });

    expect(blockerCreateResponse.statusCode).toBe(201);
    expect(blockerCreateResponse.json().blockers).toHaveLength(1);
    expect(blockerCreateResponse.json().blockers[0]?.status).toBe("open");

    const blockerId = blockerCreateResponse.json().blockers[0]?.blockerId;

    const earlyExecutionStartResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${handoverCaseId}/execution`
    });

    expect(earlyExecutionStartResponse.statusCode).toBe(409);
    expect(earlyExecutionStartResponse.json().error).toBe("handover_execution_blockers_open");

    const blockerProgressResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-22T12:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "critical",
        status: "in_progress",
        summary: "The snag crew is actively addressing the entrance and bathroom fit-out issues."
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`
    });

    expect(blockerProgressResponse.statusCode).toBe(200);
    expect(blockerProgressResponse.json().blockers[0]?.status).toBe("in_progress");

    const blockerResolvedResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-22T15:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "warning",
        status: "resolved",
        summary: "The unit snag list was cleared and the final walkthrough notes were closed."
      },
      url: `/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`
    });

    expect(blockerResolvedResponse.statusCode).toBe(200);
    expect(blockerResolvedResponse.json().blockers[0]?.status).toBe("resolved");

    const earlyCompletionResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        completionSummary: "Attempt to complete the handover before execution has started on the live record.",
        status: "completed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/completion`
    });

    expect(earlyCompletionResponse.statusCode).toBe(409);
    expect(earlyCompletionResponse.json().error).toBe("handover_completion_not_ready");

    const earlyReviewResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        outcome: "accepted",
        summary: "Attempt to save the post-handover review before the execution state has been completed."
      },
      url: `/v1/handover-cases/${handoverCaseId}/review`
    });

    expect(earlyReviewResponse.statusCode).toBe(409);
    expect(earlyReviewResponse.json().error).toBe("handover_review_not_ready");

    const executionStartResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${handoverCaseId}/execution`
    });

    expect(executionStartResponse.statusCode).toBe(200);
    expect(executionStartResponse.json().status).toBe("in_progress");
    expect(executionStartResponse.json().executionStartedAt).not.toBeNull();

    const completionResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        completionSummary: "Keys were released, the final walkthrough was acknowledged, and the live handover record is now complete.",
        status: "completed"
      },
      url: `/v1/handover-cases/${handoverCaseId}/completion`
    });

    expect(completionResponse.statusCode).toBe(200);
    expect(completionResponse.json().status).toBe("completed");
    expect(completionResponse.json().completedAt).not.toBeNull();
    expect(completionResponse.json().completionSummary).toContain("final walkthrough");

    const earlyPostCompletionFollowUpResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-23T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "Attempt to open aftercare follow-up before the review marks follow-up as required."
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`
    });

    expect(earlyPostCompletionFollowUpResponse.statusCode).toBe(409);
    expect(earlyPostCompletionFollowUpResponse.json().error).toBe("handover_follow_up_not_required");

    const reviewResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        outcome: "follow_up_required",
        summary: "Customer requested one more aftercare check for access-card configuration after key release."
      },
      url: `/v1/handover-cases/${handoverCaseId}/review`
    });

    expect(reviewResponse.statusCode).toBe(200);
    expect(reviewResponse.json().review.outcome).toBe("follow_up_required");

    const followUpResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-23T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "Confirm the access-card configuration and close the final customer aftercare point."
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`
    });

    expect(followUpResponse.statusCode).toBe(200);
    expect(followUpResponse.json().postCompletionFollowUp.status).toBe("open");

    const followUpId = followUpResponse.json().postCompletionFollowUp.followUpId;

    const resolveFollowUpResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        resolutionSummary: "Access cards were configured correctly and the customer confirmed that the aftercare issue is closed.",
        status: "resolved"
      },
      url: `/v1/handover-cases/${handoverCaseId}/post-completion-follow-up/${followUpId}`
    });

    expect(resolveFollowUpResponse.statusCode).toBe(200);
    expect(resolveFollowUpResponse.json().postCompletionFollowUp.status).toBe("resolved");
    expect(resolveFollowUpResponse.json().postCompletionFollowUp.resolutionSummary).toContain("Access cards");

    const archiveReviewResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        outcome: "hold_for_review",
        summary: "Administrative closure should stay on hold until the aftercare resolution is double-checked by the manager."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-review`
    });

    expect(archiveReviewResponse.statusCode).toBe(200);
    expect(archiveReviewResponse.json().archiveReview.outcome).toBe("hold_for_review");

    const invalidArchiveReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready",
        summary: "Attempt to promote the record to archive-ready while the closure review still requires a hold."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-status`
    });

    expect(invalidArchiveReadyResponse.statusCode).toBe(409);
    expect(invalidArchiveReadyResponse.json().error).toBe("handover_archive_status_outcome_mismatch");

    const archiveHeldResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "held",
        summary: "Administrative closure remains on hold until the manager signs off the completed record."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-status`
    });

    expect(archiveHeldResponse.statusCode).toBe(200);
    expect(archiveHeldResponse.json().archiveStatus.status).toBe("held");

    const archiveReviewReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        outcome: "ready_to_archive",
        summary: "The completed record passed the final admin closure review and can move into archive readiness."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-review`
    });

    expect(archiveReviewReadyResponse.statusCode).toBe(200);
    expect(archiveReviewReadyResponse.json().archiveReview.outcome).toBe("ready_to_archive");

    const archiveReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready",
        summary: "Administrative closure is complete and the handover record is ready to archive."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-status`
    });

    expect(archiveReadyResponse.statusCode).toBe(200);
    expect(archiveReadyResponse.json().archiveStatus.status).toBe("ready");

    const archivedResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "archived",
        summary: "The completed handover record was archived after the ready-to-archive boundary was confirmed."
      },
      url: `/v1/handover-cases/${handoverCaseId}/archive-status`
    });

    expect(archivedResponse.statusCode).toBe(200);
    expect(archivedResponse.json().archiveStatus.status).toBe("archived");

    const refreshedCaseResponse = await app.inject({
      method: "GET",
      url: `/v1/cases/${createdCase.caseId}`
    });

    expect(refreshedCaseResponse.statusCode).toBe(200);
    expect(refreshedCaseResponse.json().handoverCase.status).toBe("completed");
    expect(refreshedCaseResponse.json().handoverCase.handoverCaseId).toBe(handoverCaseId);
    expect(refreshedCaseResponse.json().handoverClosure.status).toBe("archived");

    const caseListResponse = await app.inject({
      method: "GET",
      url: "/v1/cases"
    });

    expect(caseListResponse.statusCode).toBe(200);
    expect(
      caseListResponse.json().cases.find((caseItem: { caseId: string }) => caseItem.caseId === createdCase.caseId)?.handoverClosure?.status
    ).toBe("archived");
  }, 50000);

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
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        status: "stopped"
      },
      url: `/v1/cases/${createdCase.caseId}/automation`
    });

    expect(invalidAutomationResponse.statusCode).toBe(400);

    const earlyHandoverResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "POST",
      payload: {
        readinessSummary: "Attempt to skip document completion."
      },
      url: `/v1/cases/${createdCase.caseId}/handover-intake`
    });

    expect(earlyHandoverResponse.statusCode).toBe(409);
    expect(earlyHandoverResponse.json().error).toBe("documents_incomplete_for_handover");
  });

  it("lists active handover summaries across planning, execution, and closure surfaces", async () => {
    const planningRecord = await createPlanningBoundaryHandoverRecord(app);
    const scheduledRecord = await createScheduledHandoverRecord(app);
    const completedRecord = await createCompletedHandoverRecord(app);

    const listResponse = await app.inject({
      method: "GET",
      url: "/v1/cases"
    });

    expect(listResponse.statusCode).toBe(200);

    const persistedCases = listResponse.json().cases;
    const planningSummary = persistedCases.find((caseItem: { caseId: string }) => caseItem.caseId === planningRecord.caseId);
    const scheduledSummary = persistedCases.find((caseItem: { caseId: string }) => caseItem.caseId === scheduledRecord.caseId);
    const completedSummary = persistedCases.find((caseItem: { caseId: string }) => caseItem.caseId === completedRecord.caseId);

    expect(planningSummary?.handoverCase?.handoverCaseId).toBe(planningRecord.handoverCaseId);
    expect(["pending_readiness", "internal_tasks_open", "customer_scheduling_ready"]).toContain(planningSummary?.handoverCase?.status);
    expect(planningSummary?.handoverClosure).toBeNull();

    expect(scheduledSummary?.handoverCase?.handoverCaseId).toBe(scheduledRecord.handoverCaseId);
    expect(scheduledSummary?.handoverCase?.status).toBe("scheduled");
    expect(scheduledSummary?.handoverClosure).toBeNull();

    expect(completedSummary?.handoverCase?.handoverCaseId).toBe(completedRecord.handoverCaseId);
    expect(completedSummary?.handoverCase?.status).toBe("completed");
    expect(completedSummary?.handoverClosure?.status).toBe("closure_review_required");
  }, 50000);

  it("requires a trusted operator session for handover detail access", async () => {
    const planningRecord = await createPlanningBoundaryHandoverRecord(app);

    const unauthorizedResponse = await app.inject({
      method: "GET",
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}`
    });

    expect(unauthorizedResponse.statusCode).toBe(401);

    const invalidSessionResponse = await app.inject({
      headers: {
        [operatorSessionHeaderName]: "invalid.session"
      },
      method: "GET",
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}`
    });

    expect(invalidSessionResponse.statusCode).toBe(401);
    expect(invalidSessionResponse.json().error).toBe("operator_session_invalid");

    const legacyRoleHeaderResponse = await app.inject({
      headers: {
        "x-operator-role": "handover_manager"
      },
      method: "GET",
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}`
    });

    expect(legacyRoleHeaderResponse.statusCode).toBe(401);
    expect(legacyRoleHeaderResponse.json().error).toBe("operator_session_invalid");

    const forbiddenResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "GET",
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}`
    });

    expect(forbiddenResponse.statusCode).toBe(403);
    expect(forbiddenResponse.json().error).toBe("insufficient_workspace");

    const allowedResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "GET",
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}`
    });

    expect(allowedResponse.statusCode).toBe(200);
    expect(allowedResponse.json().handoverCaseId).toBe(planningRecord.handoverCaseId);
  });

  it("enforces role-aware governance on post-completion and archive boundaries", async () => {
    const completedHandoverRecord = await createCompletedHandoverRecord(app);

    const forbiddenReviewResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        outcome: "follow_up_required",
        summary: "A coordinator attempted to save a governance review without manager-level authority."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/review`
    });

    expect(forbiddenReviewResponse.statusCode).toBe(403);
    expect(forbiddenReviewResponse.json().error).toBe("insufficient_role");

    const allowedReviewResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        outcome: "follow_up_required",
        summary: "Manager review requires one explicit aftercare item before the record can move into archive review."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/review`
    });

    expect(allowedReviewResponse.statusCode).toBe(200);
    expect(allowedReviewResponse.json().review.outcome).toBe("follow_up_required");

    const forbiddenFollowUpCreateResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-27T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "A sales manager attempted to open a handover aftercare record without the required governance role."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/post-completion-follow-up`
    });

    expect(forbiddenFollowUpCreateResponse.statusCode).toBe(403);

    const allowedFollowUpCreateResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-27T10:00:00.000Z",
        ownerName: "Aftercare Desk",
        status: "open",
        summary: "The customer requested one final utilities orientation follow-up after completion."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/post-completion-follow-up`
    });

    expect(allowedFollowUpCreateResponse.statusCode).toBe(200);
    expect(allowedFollowUpCreateResponse.json().postCompletionFollowUp.status).toBe("open");

    const followUpId = allowedFollowUpCreateResponse.json().postCompletionFollowUp.followUpId;

    const forbiddenFollowUpResolveResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        resolutionSummary: "A coordinator attempted to resolve the aftercare item without the required governance role.",
        status: "resolved"
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/post-completion-follow-up/${followUpId}`
    });

    expect(forbiddenFollowUpResolveResponse.statusCode).toBe(403);

    const allowedFollowUpResolveResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        resolutionSummary: "The aftercare desk completed the final utilities orientation and cleared the follow-up boundary.",
        status: "resolved"
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/post-completion-follow-up/${followUpId}`
    });

    expect(allowedFollowUpResolveResponse.statusCode).toBe(200);
    expect(allowedFollowUpResolveResponse.json().postCompletionFollowUp.status).toBe("resolved");

    const forbiddenArchiveReviewResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        outcome: "ready_to_archive",
        summary: "A sales manager attempted to save the archive review without the handover governance role."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/archive-review`
    });

    expect(forbiddenArchiveReviewResponse.statusCode).toBe(403);

    const allowedArchiveReviewResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "PATCH",
      payload: {
        outcome: "ready_to_archive",
        summary: "Admin closure review confirms the completed and reviewed record is ready to archive."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/archive-review`
    });

    expect(allowedArchiveReviewResponse.statusCode).toBe(200);
    expect(allowedArchiveReviewResponse.json().archiveReview.outcome).toBe("ready_to_archive");

    const forbiddenArchiveStatusResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "ready",
        summary: "A coordinator attempted to move the record into the archive-ready state."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/archive-status`
    });

    expect(forbiddenArchiveStatusResponse.statusCode).toBe(403);

    const allowedArchiveStatusResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready",
        summary: "Manager moved the reviewed record into the archive-ready state."
      },
      url: `/v1/handover-cases/${completedHandoverRecord.handoverCaseId}/archive-status`
    });

    expect(allowedArchiveStatusResponse.statusCode).toBe(200);
    expect(allowedArchiveStatusResponse.json().archiveStatus.status).toBe("ready");
  }, 50000);

  it("enforces role-aware follow-up, automation, blocker, and execution controls", async () => {
    const createResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Rami Saeed",
        email: "rami@example.com",
        message: "Need a manager-owned follow-up path before my scheduled visit.",
        preferredLocale: "en",
        projectInterest: "Sunrise Residences"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createResponse.json();

    const forbiddenFollowUpResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "POST",
      payload: {
        nextAction: "Confirm tomorrow's discovery-call slot with the buyer and re-arm manager visibility.",
        nextActionDueAt: "2026-04-16T09:00:00.000Z",
        ownerName: "Sales Desk"
      },
      url: `/v1/cases/${createdCase.caseId}/follow-up-plan`
    });

    expect(forbiddenFollowUpResponse.statusCode).toBe(403);
    expect(forbiddenFollowUpResponse.json().permission).toBe("manage_case_follow_up");

    const allowedFollowUpResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        nextAction: "Confirm tomorrow's discovery-call slot with the buyer and re-arm manager visibility.",
        nextActionDueAt: "2026-04-16T09:00:00.000Z",
        ownerName: "Sales Desk"
      },
      url: `/v1/cases/${createdCase.caseId}/follow-up-plan`
    });

    expect(allowedFollowUpResponse.statusCode).toBe(200);
    expect(allowedFollowUpResponse.json().nextAction).toContain("discovery-call");

    const forbiddenAutomationResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "POST",
      payload: {
        status: "paused"
      },
      url: `/v1/cases/${createdCase.caseId}/automation`
    });

    expect(forbiddenAutomationResponse.statusCode).toBe(403);
    expect(forbiddenAutomationResponse.json().permission).toBe("manage_case_automation");

    const allowedAutomationResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "POST",
      payload: {
        status: "paused"
      },
      url: `/v1/cases/${createdCase.caseId}/automation`
    });

    expect(allowedAutomationResponse.statusCode).toBe(200);
    expect(allowedAutomationResponse.json().automationStatus).toBe("paused");

    const scheduledHandoverRecord = await createScheduledHandoverRecord(app);

    const forbiddenBlockerCreateResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "warning",
        status: "open",
        summary: "A sales manager attempted to log a snag without a handover execution role.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/blockers`
    });

    expect(forbiddenBlockerCreateResponse.statusCode).toBe(403);
    expect(forbiddenBlockerCreateResponse.json().permission).toBe("manage_handover_blockers");

    const allowedBlockerCreateResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "POST",
      payload: {
        dueAt: "2026-04-22T09:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "warning",
        status: "open",
        summary: "A unit snag was logged for the entryway touch-up before handover-day execution starts.",
        type: "unit_snag"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/blockers`
    });

    expect(allowedBlockerCreateResponse.statusCode).toBe(201);
    expect(allowedBlockerCreateResponse.json().blockers).toHaveLength(1);

    const blockerId = allowedBlockerCreateResponse.json().blockers[0]?.blockerId;

    const forbiddenExecutionResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/execution`
    });

    expect(forbiddenExecutionResponse.statusCode).toBe(403);
    expect(forbiddenExecutionResponse.json().permission).toBe("manage_handover_execution");

    const allowedBlockerResolveResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        dueAt: "2026-04-22T11:00:00.000Z",
        ownerName: "Project Defects Desk",
        severity: "warning",
        status: "resolved",
        summary: "The entryway touch-up was completed and the snag was cleared."
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/blockers/${blockerId}`
    });

    expect(allowedBlockerResolveResponse.statusCode).toBe(200);
    expect(allowedBlockerResolveResponse.json().blockers[0]?.status).toBe("resolved");

    const allowedExecutionResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "in_progress"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/execution`
    });

    expect(allowedExecutionResponse.statusCode).toBe(200);
    expect(allowedExecutionResponse.json().status).toBe("in_progress");

    const forbiddenCompletionResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        completionSummary: "A sales manager attempted to close the handover without the execution role.",
        status: "completed"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/completion`
    });

    expect(forbiddenCompletionResponse.statusCode).toBe(403);
    expect(forbiddenCompletionResponse.json().permission).toBe("manage_handover_execution");

    const allowedCompletionResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "PATCH",
      payload: {
        completionSummary: "The manager-approved handover execution was completed and the record is now closed.",
        status: "completed"
      },
      url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/completion`
    });

    expect(allowedCompletionResponse.statusCode).toBe(200);
    expect(allowedCompletionResponse.json().status).toBe("completed");
  }, 50000);

  it("enforces role-aware milestone, appointment, and customer-update planning controls", async () => {
    const planningRecord = await createPlanningBoundaryHandoverRecord(app);

    const forbiddenMilestoneResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.schedulingMilestoneId}`
    });

    expect(forbiddenMilestoneResponse.statusCode).toBe(403);
    expect(forbiddenMilestoneResponse.json().permission).toBe("manage_handover_milestones");

    const allowedMilestoneResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.schedulingMilestoneId}`
    });

    expect(allowedMilestoneResponse.statusCode).toBe(200);
    expect(
      allowedMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) => customerUpdate.customerUpdateId === planningRecord.schedulingInviteId
      )?.status
    ).toBe("ready_for_approval");

    const forbiddenSchedulingApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.schedulingInviteId}`
    });

    expect(forbiddenSchedulingApprovalResponse.statusCode).toBe(403);
    expect(forbiddenSchedulingApprovalResponse.json().permission).toBe("manage_handover_customer_updates");

    const allowedSchedulingApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.schedulingInviteId}`
    });

    expect(allowedSchedulingApprovalResponse.statusCode).toBe(200);
    expect(allowedSchedulingApprovalResponse.json().status).toBe("customer_scheduling_ready");

    const forbiddenAppointmentPlanResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment`
    });

    expect(forbiddenAppointmentPlanResponse.statusCode).toBe(403);
    expect(forbiddenAppointmentPlanResponse.json().permission).toBe("manage_handover_appointments");

    const allowedAppointmentPlanResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        coordinatorName: "Handover Control",
        location: "Palm Horizon Tower A",
        scheduledAt: "2026-04-21T13:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment`
    });

    expect(allowedAppointmentPlanResponse.statusCode).toBe(200);
    expect(allowedAppointmentPlanResponse.json().appointment.status).toBe("planned");

    const appointmentId = allowedAppointmentPlanResponse.json().appointment.appointmentId;

    const appointmentMilestoneResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Project Ops",
        status: "ready",
        targetAt: "2026-04-21T09:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.appointmentHoldMilestoneId}`
    });

    expect(appointmentMilestoneResponse.statusCode).toBe(200);
    expect(
      appointmentMilestoneResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) =>
          customerUpdate.customerUpdateId === planningRecord.appointmentConfirmationCustomerUpdateId
      )?.status
    ).toBe("ready_for_approval");

    const forbiddenAppointmentBoundaryApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}`
    });

    expect(forbiddenAppointmentBoundaryApprovalResponse.statusCode).toBe(403);
    expect(forbiddenAppointmentBoundaryApprovalResponse.json().permission).toBe("manage_handover_customer_updates");

    const allowedAppointmentBoundaryApprovalResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}`
    });

    expect(allowedAppointmentBoundaryApprovalResponse.statusCode).toBe(200);

    const forbiddenAppointmentConfirmationResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment/${appointmentId}/confirmation`
    });

    expect(forbiddenAppointmentConfirmationResponse.statusCode).toBe(403);
    expect(forbiddenAppointmentConfirmationResponse.json().permission).toBe("manage_handover_appointments");

    const allowedAppointmentConfirmationResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment/${appointmentId}/confirmation`
    });

    expect(allowedAppointmentConfirmationResponse.statusCode).toBe(200);
    expect(allowedAppointmentConfirmationResponse.json().appointment.status).toBe("internally_confirmed");

    const forbiddenDeliveryPreparationResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        deliverySummary: "A coordinator attempted to prepare outbound customer copy without the required customer-update role.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/delivery`
    });

    expect(forbiddenDeliveryPreparationResponse.statusCode).toBe(403);
    expect(forbiddenDeliveryPreparationResponse.json().permission).toBe("manage_handover_customer_updates");

    const allowedDeliveryPreparationResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "PATCH",
      payload: {
        deliverySummary: "The appointment confirmation copy is prepared for later manual outbound handling after final ops review.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/delivery`
    });

    expect(allowedDeliveryPreparationResponse.statusCode).toBe(200);
    expect(
      allowedDeliveryPreparationResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) =>
          customerUpdate.customerUpdateId === planningRecord.appointmentConfirmationCustomerUpdateId
      )?.status
    ).toBe("prepared_for_delivery");

    const forbiddenDispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/dispatch-ready`
    });

    expect(forbiddenDispatchReadyResponse.statusCode).toBe(403);
    expect(forbiddenDispatchReadyResponse.json().permission).toBe("manage_handover_customer_updates");

    const allowedDispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/dispatch-ready`
    });

    expect(allowedDispatchReadyResponse.statusCode).toBe(200);
    expect(allowedDispatchReadyResponse.json().status).toBe("scheduled");
  }, 50000);

  it("requires QA approval on risky prepared customer updates before dispatch readiness", async () => {
    const planningRecord = await createPlanningBoundaryHandoverRecord(app);

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.schedulingMilestoneId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.schedulingInviteId}`
    });

    const appointmentPlanResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        coordinatorName: "Field Handover Team",
        location: "Tower B Lobby",
        scheduledAt: "2026-04-22T09:30:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment`
    });

    const appointmentId = appointmentPlanResponse.json().appointment.appointmentId;

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Appointment Approvals",
        status: "ready",
        targetAt: "2026-04-21T12:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.appointmentHoldMilestoneId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment/${appointmentId}/confirmation`
    });

    const riskyDeliveryPreparationResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        deliverySummary: "We guarantee the keys by Friday and can waive the final admin fee if needed.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/delivery`
    });

    expect(riskyDeliveryPreparationResponse.statusCode).toBe(200);
    expect(
      riskyDeliveryPreparationResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) =>
          customerUpdate.customerUpdateId === planningRecord.appointmentConfirmationCustomerUpdateId
      )?.qaReviewStatus
    ).toBe("pending_review");
    expect(
      riskyDeliveryPreparationResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) =>
          customerUpdate.customerUpdateId === planningRecord.appointmentConfirmationCustomerUpdateId
      )?.qaPolicySignals
    ).toEqual(["possession_date_promise", "pricing_or_exception_promise"]);

    const blockedDispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/dispatch-ready`
    });

    expect(blockedDispatchReadyResponse.statusCode).toBe(409);
    expect(blockedDispatchReadyResponse.json().error).toBe("handover_customer_update_qa_review_pending");

    const forbiddenQaResolutionResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        reviewSummary: "A handover manager attempted to clear the QA gate directly.",
        reviewerName: "Handover Desk",
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/qa-review`
    });

    expect(forbiddenQaResolutionResponse.statusCode).toBe(403);
    expect(forbiddenQaResolutionResponse.json().permission).toBe("manage_qa_reviews");

    const allowedQaResolutionResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The draft was reviewed and can proceed to manual dispatch handling.",
        reviewerName: "QA Reviewer",
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/qa-review`
    });

    expect(allowedQaResolutionResponse.statusCode).toBe(200);
    expect(
      allowedQaResolutionResponse.json().customerUpdates.find(
        (customerUpdate: { customerUpdateId: string }) =>
          customerUpdate.customerUpdateId === planningRecord.appointmentConfirmationCustomerUpdateId
      )?.qaReviewStatus
    ).toBe("approved");

    const allowedDispatchReadyResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "ready_to_dispatch"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/dispatch-ready`
    });

    expect(allowedDispatchReadyResponse.statusCode).toBe(200);
    expect(allowedDispatchReadyResponse.json().status).toBe("scheduled");
  }, 50000);

  it("returns a governance summary with 7-day activity and recent events across QA boundaries", async () => {
    const policyTriggeredCaseResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Huda Karim",
        email: "huda@example.com",
        message: "I am frustrated and need a special approval, otherwise my lawyer will step in.",
        preferredLocale: "en",
        projectInterest: "Canal Heights"
      },
      url: "/v1/website-leads"
    });

    const policyTriggeredCase = policyTriggeredCaseResponse.json();

    const resolvePolicyCaseResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The message needs direct human follow-up before the conversation continues.",
        reviewerName: "QA Desk",
        status: "follow_up_required"
      },
      url: `/v1/cases/${policyTriggeredCase.caseId}/qa-review/${policyTriggeredCase.currentQaReview.qaReviewId}`
    });

    expect(resolvePolicyCaseResponse.statusCode).toBe(200);
    expect(resolvePolicyCaseResponse.json().currentQaReview.status).toBe("follow_up_required");

    const planningRecord = await createPlanningBoundaryHandoverRecord(app);

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Scheduling Desk",
        status: "ready",
        targetAt: "2026-04-20T10:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.schedulingMilestoneId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.schedulingInviteId}`
    });

    const appointmentPlanResponse = await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        coordinatorName: "Field Handover Team",
        location: "Tower B Lobby",
        scheduledAt: "2026-04-22T09:30:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment`
    });

    const appointmentId = appointmentPlanResponse.json().appointment.appointmentId;

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        ownerName: "Appointment Approvals",
        status: "ready",
        targetAt: "2026-04-21T12:00:00.000Z"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/milestones/${planningRecord.appointmentHoldMilestoneId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}`
    });

    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "internally_confirmed"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/appointment/${appointmentId}/confirmation`
    });

    const riskyDeliveryPreparationResponse = await app.inject({
      headers: withOperatorSession("handover_manager"),
      method: "PATCH",
      payload: {
        deliverySummary: "We guarantee the keys by Friday and can waive the final admin fee if needed.",
        status: "prepared_for_delivery"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/delivery`
    });

    expect(riskyDeliveryPreparationResponse.statusCode).toBe(200);

    const resolveDraftResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The prepared draft is approved for manual dispatch handling.",
        reviewerName: "QA Reviewer",
        status: "approved"
      },
      url: `/v1/handover-cases/${planningRecord.handoverCaseId}/customer-updates/${planningRecord.appointmentConfirmationCustomerUpdateId}/qa-review`
    });

    expect(resolveDraftResponse.statusCode).toBe(200);

    const unauthorizedSummaryResponse = await app.inject({
      method: "GET",
      url: "/v1/governance/summary"
    });

    expect(unauthorizedSummaryResponse.statusCode).toBe(401);

    const governanceSummaryResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "GET",
      url: "/v1/governance/summary"
    });

    expect(governanceSummaryResponse.statusCode).toBe(200);

    const governanceSummary = governanceSummaryResponse.json();

    expect(governanceSummary.currentOpenItems.totalCount).toBe(1);
    expect(governanceSummary.currentOpenItems.caseMessageCount).toBe(1);
    expect(governanceSummary.currentOpenItems.followUpRequiredCount).toBe(1);
    expect(governanceSummary.currentOpenItems.handoverCustomerUpdateCount).toBe(0);
    expect(governanceSummary.openedItems.totalCount).toBe(2);
    expect(governanceSummary.openedItems.caseMessageCount).toBe(1);
    expect(governanceSummary.openedItems.policyTriggeredCaseMessageCount).toBe(1);
    expect(governanceSummary.openedItems.handoverCustomerUpdateCount).toBe(1);
    expect(governanceSummary.resolvedItems.totalCount).toBe(2);
    expect(governanceSummary.resolvedItems.approvedCount).toBe(1);
    expect(governanceSummary.resolvedItems.followUpRequiredCount).toBe(1);
    expect(
      governanceSummary.topPolicySignals.some(
        (signal: { kind: string; signal: string }) => signal.kind === "handover_customer_update" && signal.signal === "possession_date_promise"
      )
    ).toBe(true);
    expect(
      governanceSummary.recentEvents.some(
        (event: { action: string; kind: string; status: string }) =>
          event.action === "resolved" && event.kind === "case_message" && event.status === "follow_up_required"
      )
    ).toBe(true);
    expect(
      governanceSummary.recentEvents.some(
        (event: { action: string; kind: string; status: string }) =>
          event.action === "resolved" && event.kind === "handover_customer_update" && event.status === "approved"
      )
    ).toBe(true);
    expect(
      governanceSummary.dailyActivity.reduce(
        (totals: { opened: number; resolved: number }, item: { openedCount: number; resolvedCount: number }) => ({
          opened: totals.opened + item.openedCount,
          resolved: totals.resolved + item.resolvedCount
        }),
        { opened: 0, resolved: 0 }
      )
    ).toEqual({
      opened: 2,
      resolved: 2
    });
  }, 50000);

  it("returns filtered governance events for manager-facing reporting", async () => {
    const createCaseResponse = await app.inject({
      method: "POST",
      payload: {
        customerName: "Rana Saeed",
        email: "rana@example.com",
        message: "Need a manager to review this lead before we send any commitments.",
        preferredLocale: "en",
        projectInterest: "Harbor Gate"
      },
      url: "/v1/website-leads"
    });

    const createdCase = createCaseResponse.json();

    const draftReviewResponse = await app.inject({
      headers: withOperatorSession("sales_manager"),
      method: "POST",
      payload: {
        draftMessage: "We guarantee the exception approval and can waive the fee today.",
        requestedByName: "Revenue Desk"
      },
      url: `/v1/cases/${createdCase.caseId}/reply-draft/qa-review`
    });

    expect(draftReviewResponse.statusCode).toBe(200);
    expect(draftReviewResponse.json().currentQaReview.subjectType).toBe("prepared_reply_draft");

    const resolvedDraftResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "PATCH",
      payload: {
        reviewSummary: "The draft may proceed after removing the guaranteed exception language.",
        reviewerName: "QA Shift Lead",
        status: "approved"
      },
      url: `/v1/cases/${createdCase.caseId}/qa-review/${draftReviewResponse.json().currentQaReview.qaReviewId}`
    });

    expect(resolvedDraftResponse.statusCode).toBe(200);

    const unauthorizedEventsResponse = await app.inject({
      method: "GET",
      url: "/v1/governance/events"
    });

    expect(unauthorizedEventsResponse.statusCode).toBe(401);

    const qaEventsResponse = await app.inject({
      headers: withOperatorSession("qa_reviewer"),
      method: "GET",
      url: "/v1/governance/events"
    });

    expect(qaEventsResponse.statusCode).toBe(403);

    const governanceEventsResponse = await app.inject({
      headers: withOperatorSession("admin"),
      method: "GET",
      url: "/v1/governance/events?windowDays=30&kind=case_message&subjectType=prepared_reply_draft"
    });

    expect(governanceEventsResponse.statusCode).toBe(200);

    const governanceEvents = governanceEventsResponse.json();

    expect(governanceEvents.totalCount).toBe(2);
    expect(governanceEvents.items).toHaveLength(2);
    expect(
      governanceEvents.items.every(
        (event: { kind: string; subjectType: string }) =>
          event.kind === "case_message" && event.subjectType === "prepared_reply_draft"
      )
    ).toBe(true);
    expect(
      governanceEvents.items.some(
        (event: {
          action: string;
          draftMessage: string | null;
          reviewSummary: string | null;
          sampleSummary: string | null;
          triggerEvidence: string[];
          triggerSource: string | null;
        }) =>
          event.action === "opened" &&
          event.triggerSource === "policy_rule" &&
          event.draftMessage?.includes("guarantee") === true &&
          event.sampleSummary !== null &&
          event.triggerEvidence.length > 0 &&
          event.reviewSummary === null
      )
    ).toBe(true);
    expect(
      governanceEvents.items.some(
        (event: { action: string; actorName: string | null; reviewSummary: string | null; status: string }) =>
          event.action === "resolved" &&
          event.actorName === "QA Shift Lead" &&
          event.status === "approved" &&
          event.reviewSummary?.includes("removing") === true
      )
    ).toBe(true);
  }, 50000);
});

async function createPlanningBoundaryHandoverRecord(app: ReturnType<typeof buildApiApp>) {
  const createResponse = await app.inject({
    method: "POST",
    payload: {
      customerName: "Maha Faisal",
      email: "maha@example.com",
      message: "Need a clear bilingual handover planning path with explicit scheduling boundaries.",
      preferredLocale: "ar",
      projectInterest: "Palm Horizon"
    },
    url: "/v1/website-leads"
  });

  const createdCase = createResponse.json();

  await app.inject({
    method: "POST",
    payload: {
      budgetBand: "SAR 1.8M to 2.0M",
      intentSummary: "Qualified buyer with final readiness confirmed and a handover date expected within the month.",
      moveInTimeline: "Within 30 days",
      readiness: "high"
    },
    url: `/v1/cases/${createdCase.caseId}/qualification`
  });

  const visitResponse = await app.inject({
    method: "POST",
    payload: {
      location: "Palm Horizon Discovery Center",
      scheduledAt: "2026-04-15T12:30:00.000Z"
    },
    url: `/v1/cases/${createdCase.caseId}/visits`
  });

  for (const documentRequest of visitResponse.json().documentRequests) {
    await app.inject({
      method: "PATCH",
      payload: {
        status: "accepted"
      },
      url: `/v1/cases/${createdCase.caseId}/documents/${documentRequest.documentRequestId}`
    });
  }

  const handoverIntakeResponse = await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "POST",
    payload: {
      ownerName: "Handover Desk Riyadh",
      readinessSummary: "Documents are accepted and the case is ready to enter the controlled handover flow."
    },
    url: `/v1/cases/${createdCase.caseId}/handover-intake`
  });

  const handoverCaseId = handoverIntakeResponse.json().handoverCase.handoverCaseId;
  const handoverDetailResponse = await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "GET",
    url: `/v1/handover-cases/${handoverCaseId}`
  });
  const handoverDetail = handoverDetailResponse.json();
  const readinessMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "readiness_gate"
  )?.milestoneId;
  const schedulingMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "customer_scheduling_window"
  )?.milestoneId;
  const appointmentHoldMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "handover_appointment_hold"
  )?.milestoneId;
  const readinessCustomerUpdateId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "readiness_update"
  )?.customerUpdateId;
  const schedulingInviteId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "scheduling_invite"
  )?.customerUpdateId;
  const appointmentConfirmationCustomerUpdateId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "appointment_confirmation"
  )?.customerUpdateId;

  for (const task of handoverDetail.tasks) {
    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "complete"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${task.taskId}`
    });
  }

  await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      ownerName: "Customer Care Desk",
      status: "ready",
      targetAt: "2026-04-18T09:00:00.000Z"
    },
    url: `/v1/handover-cases/${handoverCaseId}/milestones/${readinessMilestoneId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "approved"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
  });

  return {
    appointmentConfirmationCustomerUpdateId,
    appointmentHoldMilestoneId,
    caseId: createdCase.caseId,
    handoverCaseId,
    schedulingInviteId,
    schedulingMilestoneId
  };
}

async function createScheduledHandoverRecord(app: ReturnType<typeof buildApiApp>) {
  const createResponse = await app.inject({
    method: "POST",
    payload: {
      customerName: "Noura Al Harbi",
      email: "noura@example.com",
      message: "Need a bilingual handover path with clear follow-up ownership after move-in.",
      preferredLocale: "ar",
      projectInterest: "Palm Horizon"
    },
    url: "/v1/website-leads"
  });

  const createdCase = createResponse.json();

  await app.inject({
    method: "POST",
    payload: {
      budgetBand: "SAR 1.8M to 2.0M",
      intentSummary: "Qualified buyer with final readiness confirmed and a handover date expected within the month.",
      moveInTimeline: "Within 30 days",
      readiness: "high"
    },
    url: `/v1/cases/${createdCase.caseId}/qualification`
  });

  const visitResponse = await app.inject({
    method: "POST",
    payload: {
      location: "Palm Horizon Discovery Center",
      scheduledAt: "2026-04-15T12:30:00.000Z"
    },
    url: `/v1/cases/${createdCase.caseId}/visits`
  });

  for (const documentRequest of visitResponse.json().documentRequests) {
    await app.inject({
      method: "PATCH",
      payload: {
        status: "accepted"
      },
      url: `/v1/cases/${createdCase.caseId}/documents/${documentRequest.documentRequestId}`
    });
  }

  const handoverIntakeResponse = await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "POST",
    payload: {
      ownerName: "Handover Desk Riyadh",
      readinessSummary: "Documents are accepted and the case is ready to enter the controlled handover flow."
    },
    url: `/v1/cases/${createdCase.caseId}/handover-intake`
  });

  const handoverCaseId = handoverIntakeResponse.json().handoverCase.handoverCaseId;
  const handoverDetailResponse = await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "GET",
    url: `/v1/handover-cases/${handoverCaseId}`
  });
  const handoverDetail = handoverDetailResponse.json();
  const readinessMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "readiness_gate"
  )?.milestoneId;
  const schedulingMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "customer_scheduling_window"
  )?.milestoneId;
  const appointmentHoldMilestoneId = handoverDetail.milestones.find(
    (milestone: { type: string }) => milestone.type === "handover_appointment_hold"
  )?.milestoneId;
  const readinessCustomerUpdateId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "readiness_update"
  )?.customerUpdateId;
  const schedulingInviteId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "scheduling_invite"
  )?.customerUpdateId;
  const appointmentConfirmationId = handoverDetail.customerUpdates.find(
    (customerUpdate: { type: string }) => customerUpdate.type === "appointment_confirmation"
  )?.customerUpdateId;

  for (const task of handoverDetail.tasks) {
    await app.inject({
      headers: withOperatorSession("handover_coordinator"),
      method: "PATCH",
      payload: {
        status: "complete"
      },
      url: `/v1/handover-cases/${handoverCaseId}/tasks/${task.taskId}`
    });
  }

  await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      ownerName: "Customer Care Desk",
      status: "ready",
      targetAt: "2026-04-18T09:00:00.000Z"
    },
    url: `/v1/handover-cases/${handoverCaseId}/milestones/${readinessMilestoneId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "approved"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${readinessCustomerUpdateId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      ownerName: "Scheduling Desk",
      status: "ready",
      targetAt: "2026-04-20T10:00:00.000Z"
    },
    url: `/v1/handover-cases/${handoverCaseId}/milestones/${schedulingMilestoneId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "approved"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${schedulingInviteId}`
  });

  const appointmentResponse = await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      coordinatorName: "Handover Control",
      location: "Palm Horizon Tower A",
      scheduledAt: "2026-04-21T13:00:00.000Z"
    },
    url: `/v1/handover-cases/${handoverCaseId}/appointment`
  });

  const appointmentId = appointmentResponse.json().appointment.appointmentId;

  await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      ownerName: "Project Ops",
      status: "ready",
      targetAt: "2026-04-21T09:00:00.000Z"
    },
    url: `/v1/handover-cases/${handoverCaseId}/milestones/${appointmentHoldMilestoneId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "approved"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}`
  });

  await app.inject({
    headers: withOperatorSession("handover_coordinator"),
    method: "PATCH",
    payload: {
      status: "internally_confirmed"
    },
    url: `/v1/handover-cases/${handoverCaseId}/appointment/${appointmentId}/confirmation`
  });

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      deliverySummary: "Arabic confirmation copy is prepared for manual outbound dispatch after final ops review.",
      status: "prepared_for_delivery"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/delivery`
  });

  const scheduledResponse = await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "ready_to_dispatch"
    },
    url: `/v1/handover-cases/${handoverCaseId}/customer-updates/${appointmentConfirmationId}/dispatch-ready`
  });

  return {
    caseId: createdCase.caseId,
    handoverCaseId,
    handoverStatus: scheduledResponse.json().status
  };
}

async function createCompletedHandoverRecord(app: ReturnType<typeof buildApiApp>) {
  const scheduledHandoverRecord = await createScheduledHandoverRecord(app);

  await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      status: "in_progress"
    },
    url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/execution`
  });

  const completionResponse = await app.inject({
    headers: withOperatorSession("handover_manager"),
    method: "PATCH",
    payload: {
      completionSummary: "Keys were released, the walkthrough was acknowledged, and the live handover record is complete.",
      status: "completed"
    },
    url: `/v1/handover-cases/${scheduledHandoverRecord.handoverCaseId}/completion`
  });

  return {
    caseId: scheduledHandoverRecord.caseId,
    handoverCaseId: scheduledHandoverRecord.handoverCaseId,
    handoverStatus: completionResponse.json().status
  };
}
