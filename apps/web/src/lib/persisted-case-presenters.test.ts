import { describe, expect, it } from "vitest";

import type { PersistedCaseDetail } from "@real-estate-ai/contracts";

import {
  buildPersistedConversation,
  formatLatestManagerFollowUpSavedAt,
  formatLatestHumanReplySentAt,
  getPersistedAgentIntentLabel,
  getPersistedAgentNextStepLabel,
  getPersistedAgentObjectionLabels,
  getPersistedAgentSentimentLabel,
  getPersistedAgentUrgencyLabel,
  getPersistedChannelStatusLabel,
  getPersistedChannelStatusNote,
  getPersistedLatestManagerFollowUpLabel,
  getPersistedLatestManagerFollowUpNote,
  getPersistedLatestHumanReplyEscalationLabel,
  getPersistedLatestHumanReplyLabel,
  getPersistedLatestHumanReplyOwnershipLabel,
  getPersistedLatestHumanReplyOwnershipNote,
  hasPersistedLatestHumanReplyEscalation,
  hasPersistedLatestHumanReplyHandoff
} from "./persisted-case-presenters";

const qaReviewId = "11111111-1111-4111-8111-111111111111";

function buildCaseDetail(auditEvents: PersistedCaseDetail["auditEvents"]): PersistedCaseDetail {
  return {
    auditEvents,
    automationHoldReason: null,
    automationStatus: "active",
    budget: null,
    caseId: "22222222-2222-4222-8222-222222222222",
    channelSummary: null,
    createdAt: "2026-04-13T09:00:00.000Z",
    currentHandoverCustomerUpdateQaReview: null,
    latestHumanReply: null,
    latestManagerFollowUp: null,
    currentQaReview: {
      createdAt: "2026-04-13T09:05:00.000Z",
      draftMessage: "Approved reply draft text",
      policySignals: [],
      qaReviewId,
      requestedByName: "Revenue Ops",
      reviewSummary: "Approved for the next human response.",
      reviewedAt: "2026-04-13T09:10:00.000Z",
      reviewerName: "QA Desk",
      sampleSummary: "Review the prepared draft",
      status: "approved",
      subjectType: "prepared_reply_draft",
      triggerEvidence: [],
      triggerSource: "manual_request",
      updatedAt: "2026-04-13T09:10:00.000Z"
    },
    currentVisit: null,
    customerName: "Nadia Khan",
    documentRequests: [],
    email: "nadia@example.com",
    followUpStatus: "on_track",
    handoverCase: null,
    handoverClosure: null,
    managerInterventions: [],
    message: "Please send me the next reservation step.",
    nextAction: "Reply with the approved payment instructions",
    nextActionDueAt: "2026-04-14T09:00:00.000Z",
    openInterventionsCount: 0,
    ownerName: "Revenue Ops",
    phone: null,
    preferredLocale: "en",
    projectInterest: "Canal Heights",
    qaReviews: [
      {
        createdAt: "2026-04-13T09:05:00.000Z",
        draftMessage: "Approved reply draft text",
        policySignals: [],
        qaReviewId,
        requestedByName: "Revenue Ops",
        reviewSummary: "Approved for the next human response.",
        reviewedAt: "2026-04-13T09:10:00.000Z",
        reviewerName: "QA Desk",
        sampleSummary: "Review the prepared draft",
        status: "approved",
        subjectType: "prepared_reply_draft",
        triggerEvidence: [],
        triggerSource: "manual_request",
        updatedAt: "2026-04-13T09:10:00.000Z"
      }
    ],
    qualificationSnapshot: null,
    source: "website",
    stage: "new",
    updatedAt: "2026-04-13T09:12:00.000Z"
  };
}

describe("buildPersistedConversation", () => {
  it("replaces a consumed approved reply draft with the recorded human reply", () => {
    const messages = buildPersistedConversation(
      buildCaseDetail([
        {
          createdAt: "2026-04-13T09:12:00.000Z",
          eventType: "case_reply_sent",
          payload: {
            approvedDraftQaReviewId: qaReviewId,
            message: "Approved reply draft text",
            sentByName: "Amina Rahman"
          }
        }
      ]),
      "en"
    );

    const managerMessages = messages.filter((message) => message.sender === "manager");

    expect(managerMessages).toHaveLength(1);
    expect(managerMessages[0]?.body.en).toBe("Approved reply draft text");
    expect(managerMessages[0]?.state?.en).toBe("Human reply sent after QA approval");
  });

  it("formats the latest human reply state for manager-facing surfaces", () => {
    const caseDetail = buildCaseDetail([
      {
        createdAt: "2026-04-13T09:12:00.000Z",
        eventType: "case_reply_sent",
        payload: {
          approvedDraftQaReviewId: qaReviewId,
          message: "Approved reply draft text",
          nextAction: "Confirm receipt of the approved reply",
          nextActionDueAt: "2026-04-14T09:00:00.000Z",
          sentByName: "Amina Rahman"
        }
      }
    ]);

    caseDetail.latestHumanReply = {
      approvedFromQa: true,
      message: "Approved reply draft text",
      nextAction: "Confirm receipt of the approved reply",
      nextActionDueAt: "2026-04-14T09:00:00.000Z",
      sentAt: "2026-04-13T09:12:00.000Z",
      sentByName: "Amina Rahman"
    };

    expect(getPersistedLatestHumanReplyLabel("en", caseDetail.latestHumanReply)).toBe("Human reply after QA approval");
    expect(formatLatestHumanReplySentAt(caseDetail.latestHumanReply, "en")).toBe(new Date("2026-04-13T09:12:00.000Z").toLocaleString("en"));
  });

  it("formats the latest manager follow-up summary for manager-facing surfaces", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.latestManagerFollowUp = {
      nextAction: "Confirm tomorrow's discovery-call slot with the buyer.",
      nextActionDueAt: "2026-04-14T09:00:00.000Z",
      ownerName: "Manager Desk North",
      savedAt: "2026-04-13T09:15:00.000Z"
    };

    expect(getPersistedLatestManagerFollowUpLabel("en", caseDetail.latestManagerFollowUp)).toBe("Follow-up plan saved");
    expect(formatLatestManagerFollowUpSavedAt(caseDetail.latestManagerFollowUp, "en")).toBe(
      new Date("2026-04-13T09:15:00.000Z").toLocaleString("en")
    );
    expect(getPersistedLatestManagerFollowUpNote("en", caseDetail.latestManagerFollowUp)).toBe(
      `The current follow-up was saved for Manager Desk North, due ${new Date("2026-04-14T09:00:00.000Z").toLocaleString("en")}.`
    );
  });

  it("formats bulk manager follow-up summaries with batch context", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.latestManagerFollowUp = {
      bulkAction: {
        batchId: "33333333-3333-4333-8333-333333333333",
        caseCount: 3,
        scopedOwnerName: "Revenue Ops Queue"
      },
      nextAction: "Confirm the reset across the desk.",
      nextActionDueAt: "2026-04-14T11:00:00.000Z",
      ownerName: "Manager Desk North",
      savedAt: "2026-04-13T10:15:00.000Z"
    };

    expect(getPersistedLatestManagerFollowUpLabel("en", caseDetail.latestManagerFollowUp)).toBe("Bulk follow-up saved");
    expect(getPersistedLatestManagerFollowUpNote("en", caseDetail.latestManagerFollowUp)).toBe(
      `This update was saved as a 3-case bulk action from Revenue Ops Queue, with the active follow-up assigned to Manager Desk North, due ${new Date("2026-04-14T11:00:00.000Z").toLocaleString("en")}.`
    );
  });

  it("derives a handoff label when the reply sender and current owner differ", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.ownerName = "Manager Desk North";
    caseDetail.latestHumanReply = {
      approvedFromQa: false,
      message: "I have shared the visit options.",
      nextAction: "Confirm the preferred slot",
      nextActionDueAt: "2026-04-14T09:00:00.000Z",
      sentAt: "2026-04-13T09:12:00.000Z",
      sentByName: "Amina Rahman"
    };

    expect(hasPersistedLatestHumanReplyHandoff(caseDetail.ownerName, caseDetail.latestHumanReply)).toBe(true);
    expect(getPersistedLatestHumanReplyOwnershipLabel("en", caseDetail.ownerName, caseDetail.latestHumanReply)).toBe(
      "Follow-up handed to Manager Desk North"
    );
    expect(getPersistedLatestHumanReplyOwnershipNote("en", caseDetail.ownerName, caseDetail.latestHumanReply)).toBe(
      "Amina Rahman sent the latest reply, but Manager Desk North now owns the active follow-up."
    );
  });

  it("flags escalated handoffs when the handed-off follow-up is overdue or intervention-backed", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.ownerName = "Manager Desk North";
    caseDetail.followUpStatus = "attention";
    caseDetail.openInterventionsCount = 1;
    caseDetail.latestHumanReply = {
      approvedFromQa: false,
      message: "I have shared the visit options.",
      nextAction: "Confirm the preferred slot",
      nextActionDueAt: "2026-04-14T09:00:00.000Z",
      sentAt: "2026-04-13T09:12:00.000Z",
      sentByName: "Amina Rahman"
    };

    expect(
      hasPersistedLatestHumanReplyEscalation(
        caseDetail.ownerName,
        caseDetail.latestHumanReply,
        caseDetail.followUpStatus,
        caseDetail.openInterventionsCount
      )
    ).toBe(true);
    expect(
      getPersistedLatestHumanReplyEscalationLabel(
        "en",
        caseDetail.ownerName,
        caseDetail.latestHumanReply,
        caseDetail.followUpStatus,
        caseDetail.openInterventionsCount
      )
    ).toBe("Handed-off follow-up is overdue with an open intervention");
  });

  it("describes client-managed WhatsApp readiness when credentials are not configured yet", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.channelSummary = {
      channel: "whatsapp",
      contactValue: "+966551234567",
      lastInboundAt: null,
      latestOutboundBlockReason: "client_credentials_pending",
      latestOutboundFailureCode: "client_credentials_pending",
      latestOutboundFailureDetail: "Meta WhatsApp send code is ready, but client credentials are not configured for this environment yet.",
      latestOutboundMessage: "Hello from the configured reply path.",
      latestOutboundProviderMessageId: null,
      latestOutboundStatus: "blocked",
      latestOutboundUpdatedAt: "2026-04-13T09:12:00.000Z",
      provider: "meta_whatsapp_cloud"
    };

    expect(getPersistedChannelStatusLabel("en", caseDetail.channelSummary)).toBe("WhatsApp awaiting client credentials");
    expect(getPersistedChannelStatusNote("en", caseDetail.channelSummary)).toBe(
      "The WhatsApp code path is ready, but it is waiting for real client credentials before activation."
    );
  });

  it("formats structured agent conversation intelligence for lead surfaces", () => {
    const caseDetail = buildCaseDetail([]);

    caseDetail.agentMemory = {
      activeRiskFlags: ["pricing_request"],
      customerSentiment: "urgent",
      documentGapSummary: null,
      lastDecisionSummary: "The customer asked for pricing and an immediate callback.",
      lastInboundAt: "2026-04-13T09:30:00.000Z",
      lastIntentCategory: "pricing",
      lastObjectionSummary: "The customer is asking for pricing information or discussing budget.",
      lastSuccessfulOutboundAt: null,
      latestIntentSummary: "Please call me today and explain the payment plan.",
      objectionCategories: ["pricing"],
      qualificationSummary: null,
      requestedNextStep: "human_callback",
      responseUrgency: "high",
      updatedAt: "2026-04-13T09:31:00.000Z"
    };

    expect(getPersistedAgentIntentLabel("en", caseDetail.agentMemory)).toBe("Pricing");
    expect(getPersistedAgentNextStepLabel("en", caseDetail.agentMemory)).toBe("Callback request");
    expect(getPersistedAgentUrgencyLabel("en", caseDetail.agentMemory)).toBe("High");
    expect(getPersistedAgentSentimentLabel("en", caseDetail.agentMemory)).toBe("Urgent");
    expect(getPersistedAgentObjectionLabels("en", caseDetail.agentMemory)).toEqual(["Pricing objection"]);
  });
});
