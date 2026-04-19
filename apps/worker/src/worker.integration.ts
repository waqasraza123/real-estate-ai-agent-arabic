import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";
import {
  createDeterministicDocumentUploadAnalysisModelAdapter,
  resolvePersistedDocumentUploadAnalysis,
  runPersistedCaseAgentCycle,
  runPersistedFollowUpCycle
} from "@real-estate-ai/workflows";

describe("case agent worker", () => {
  let store: Awaited<ReturnType<typeof createAlphaLeadCaptureStore>>;

  beforeEach(async () => {
    store = await createAlphaLeadCaptureStore({
      inMemory: true
    });
  });

  afterEach(async () => {
    await store.close();
  });

  it("queues a WhatsApp first reply for a new low-risk lead", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Maya Cole",
      email: "maya@example.com",
      message: "Need a callback about a premium unit this afternoon.",
      nextAction: "Call the buyer back immediately",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+1 555 200 1000",
      preferredLocale: "en",
      projectInterest: "Marina Crest"
    });
    const runAt = "2099-01-01T00:00:00.000Z";

    const cycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt
    });

    expect(cycle.processedJobs).toBe(1);
    expect(cycle.blockedRuns).toBe(0);

    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(caseDetail?.agentState?.latestTriggerType).toBe("new_lead");
    expect(caseDetail?.agentState?.latestRecommendedAction).toBe("send_whatsapp_message");
    expect(caseDetail?.agentState?.latestRunStatus).toBe("completed");
    expect(caseDetail?.channelSummary?.latestOutboundStatus).toBe("queued");
    expect(caseDetail?.agentRuns?.[0]?.proposedMessage).toContain("Marina Crest");
  });

  it("queues an Arabic WhatsApp reply when a low-risk inbound message asks to schedule the next step", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Layal Abbas",
      email: "layal@example.com",
      message: "Need details about the unit.",
      nextAction: "Review the lead and continue qualification",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 55 555 1111",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });

    await store.recordWhatsAppInboundMessage({
      messageId: "wamid.inbound.schedule.1",
      normalizedPhone: "+966555551111",
      profileName: "Layal Abbas",
      receivedAt: "2026-04-12T09:00:00.000Z",
      textBody: "ممكن نرتب زيارة غدا؟"
    });

    const cycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T09:05:00.000Z"
    });
    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(cycle.processedJobs).toBe(1);
    expect(caseDetail?.preferredLocale).toBe("ar");
    expect(caseDetail?.agentState?.latestTriggerType).toBe("inbound_customer_message");
    expect(caseDetail?.agentState?.latestRecommendedAction).toBe("send_whatsapp_message");
    expect(caseDetail?.agentState?.latestRunStatus).toBe("completed");
    expect(caseDetail?.channelSummary?.latestOutboundStatus).toBe("queued");
    expect(caseDetail?.agentRuns?.[0]?.proposedMessage).toContain("زيارة");
    expect(caseDetail?.agentMemory?.latestIntentSummary).toContain("زيارة");
  });

  it("blocks the inbound-message agent path behind QA when the customer asks for a risky exception", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Sami Khan",
      email: "sami@example.com",
      message: "Need details on the available layout.",
      nextAction: "Review the lead and continue qualification",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 54 000 9898",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });

    await store.recordWhatsAppInboundMessage({
      messageId: "wamid.inbound.exception.1",
      normalizedPhone: "+966540009898",
      profileName: "Sami Khan",
      receivedAt: "2026-04-12T09:00:00.000Z",
      textBody: "Can you give me a special approval or discount on this unit?"
    });

    const cycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T09:05:00.000Z"
    });
    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(cycle.processedJobs).toBe(1);
    expect(cycle.blockedRuns).toBe(1);
    expect(caseDetail?.currentQaReview?.status).toBe("pending_review");
    expect(caseDetail?.currentQaReview?.triggerSource).toBe("policy_rule");
    expect(caseDetail?.currentQaReview?.policySignals).toContain("exception_request");
    expect(caseDetail?.agentState?.latestTriggerType).toBe("inbound_customer_message");
    expect(caseDetail?.agentState?.latestRunStatus).toBe("blocked");
    expect(caseDetail?.agentState?.latestBlockedReason).toBe("qa_hold");
    expect(caseDetail?.channelSummary?.latestOutboundStatus).toBe("blocked");
  });

  it("records a blocked run when client WhatsApp credentials are not available", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Layal Abbas",
      email: "layal@example.com",
      message: "Need a bilingual callback later today.",
      nextAction: "Prepare first bilingual reply",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 55 555 1111",
      preferredLocale: "ar",
      projectInterest: "Palm Horizon"
    });
    const runAt = "2099-01-01T00:00:00.000Z";

    const cycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: false,
      runAt
    });

    expect(cycle.processedJobs).toBe(1);
    expect(cycle.blockedRuns).toBe(1);

    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(caseDetail?.agentState?.latestRunStatus).toBe("blocked");
    expect(caseDetail?.agentState?.latestBlockedReason).toBe("client_credentials_pending");
    expect(caseDetail?.channelSummary?.latestOutboundStatus).toBe("blocked");
    expect(caseDetail?.channelSummary?.latestOutboundBlockReason).toBe("client_credentials_pending");
  });

  it("escalates a repeated no-response case after an earlier automated follow-up", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Noura Aziz",
      email: "noura@example.com",
      message: "Need details on the available layout.",
      nextAction: "Review the lead and continue qualification",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 50 123 7777",
      preferredLocale: "en",
      projectInterest: "Harbor Gate"
    });

    await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T08:05:00.000Z"
    });

    await store.manageCaseFollowUp(createdCase.caseId, {
      nextAction: "Check back if the customer stays silent",
      nextActionDueAt: "2026-04-12T09:00:00.000Z",
      ownerName: "Revenue Ops Queue"
    });

    const firstDueCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });
    const firstAgentCycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(firstDueCycle.processedJobs).toBe(1);
    expect(firstAgentCycle.processedJobs).toBe(1);
    expect(firstAgentCycle.escalatedRuns).toBe(0);

    await store.manageCaseFollowUp(createdCase.caseId, {
      nextAction: "One more check-in before escalation",
      nextActionDueAt: "2026-04-12T13:00:00.000Z",
      ownerName: "Revenue Ops Queue"
    });

    const secondDueCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T16:00:00.000Z"
    });
    const secondAgentCycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T16:00:00.000Z"
    });

    expect(secondDueCycle.processedJobs).toBe(1);
    expect(secondAgentCycle.processedJobs).toBe(1);
    expect(secondAgentCycle.escalatedRuns).toBe(1);

    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(caseDetail?.agentState?.latestTriggerType).toBe("no_response_follow_up");
    expect(caseDetail?.agentState?.latestRunStatus).toBe("escalated");
    expect(caseDetail?.managerInterventions[0]?.type).toBe("agent_decision_required");
  });

  it("routes document-stage cases through the document-missing trigger", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Sami Khan",
      email: "sami@example.com",
      message: "I can send the remaining paperwork after the visit.",
      nextAction: "Track the lead after the visit",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 54 000 9898",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });

    const firstCase = await store.getCaseDetail(createdCase.caseId);
    const firstDocumentId = firstCase?.documentRequests[0]?.documentRequestId;

    expect(firstDocumentId).toBeTruthy();

    await store.updateDocumentRequestStatus(createdCase.caseId, firstDocumentId!, {
      nextAction: "Chase the missing documents",
      nextActionDueAt: "2026-04-12T10:00:00.000Z",
      status: "rejected"
    });

    const dueCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });
    const agentCycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(dueCycle.processedJobs).toBe(1);
    expect(agentCycle.processedJobs).toBe(1);

    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(caseDetail?.agentState?.latestTriggerType).toBe("document_missing");
    expect(caseDetail?.agentState?.latestRecommendedAction).toBe("send_whatsapp_message");
    expect(caseDetail?.agentMemory?.documentGapSummary).toContain("government");
  });

  it("stops document-missing escalation once all outstanding document requests have uploaded evidence", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Nadia Ibrahim",
      email: "nadia@example.com",
      message: "I will upload the required files after the visit.",
      nextAction: "Track the lead after the visit",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 55 777 8181",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });
    const firstCase = await store.getCaseDetail(createdCase.caseId);

    expect(firstCase?.documentRequests).toHaveLength(3);

    for (const [index, documentRequest] of (firstCase?.documentRequests ?? []).entries()) {
      await store.recordDocumentUpload(createdCase.caseId, documentRequest.documentRequestId, {
        checksumSha256: `checksum-${index + 1}`,
        documentUploadId: `00000000-0000-4000-8000-00000000000${index + 1}`,
        fileName: `document-${index + 1}.pdf`,
        mimeType: "application/pdf",
        nextAction: "Review the uploaded files and either approve readiness or request a clear replacement",
        nextActionDueAt: "2026-04-12T10:00:00.000Z",
        sizeBytes: 1024,
        storagePath: `${createdCase.caseId}/${documentRequest.documentRequestId}/document-${index + 1}.pdf`,
        uploadedAt: "2026-04-12T09:00:00.000Z"
      });
    }

    const dueCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });
    const agentCycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T12:00:00.000Z"
    });
    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(dueCycle.processedJobs).toBe(1);
    expect(agentCycle.processedJobs).toBe(1);
    expect(caseDetail?.agentState?.latestTriggerType).toBe("no_response_follow_up");
    expect(caseDetail?.agentMemory?.documentGapSummary).toBeNull();
  });

  it("flags a mismatched upload for replacement and wakes the document-missing agent path immediately", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Rana Faisal",
      email: "rana@example.com",
      message: "I will upload the ID today.",
      nextAction: "Collect the remaining documents",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 55 101 2020",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });
    const initialCase = await store.getCaseDetail(createdCase.caseId);
    const documentRequest = initialCase?.documentRequests[0];

    expect(documentRequest?.type).toBe("government_id");

    await store.recordDocumentUpload(createdCase.caseId, documentRequest!.documentRequestId, {
      checksumSha256: "checksum-mismatch",
      documentUploadId: "00000000-0000-4000-8000-000000000031",
      fileName: "bank-statement.pdf",
      mimeType: "application/pdf",
      nextAction: "Review the uploaded files and either approve readiness or request a clear replacement",
      nextActionDueAt: "2026-04-12T10:00:00.000Z",
      sizeBytes: 12_000,
      storagePath: `${createdCase.caseId}/${documentRequest!.documentRequestId}/bank-statement.pdf`,
      uploadedAt: "2026-04-12T09:00:00.000Z"
    });

    const uploadedCase = await store.getCaseDetail(createdCase.caseId);

    await resolvePersistedDocumentUploadAnalysis(store, {
      caseDetail: uploadedCase!,
      documentRequestId: documentRequest!.documentRequestId,
      documentUploadId: "00000000-0000-4000-8000-000000000031",
      extractedTextFailureDetail: null,
      extractedTextPreview: "Bank statement account balance available funds IBAN",
      extractedTextSource: "text_preview",
      extractedTextStatus: "extracted",
      modelAdapter: createDeterministicDocumentUploadAnalysisModelAdapter(),
      now: "2026-04-12T09:05:00.000Z"
    });

    const analyzedCase = await store.getCaseDetail(createdCase.caseId);

    expect(analyzedCase?.documentRequests[0]?.status).toBe("rejected");
    expect(analyzedCase?.documentRequests[0]?.latestUpload?.analysis?.recommendation).toBe("request_reupload");

    const agentCycle = await runPersistedCaseAgentCycle(store, {
      canSendWhatsApp: true,
      runAt: "2026-04-12T09:05:00.000Z"
    });
    const caseAfterAgent = await store.getCaseDetail(createdCase.caseId);

    expect(agentCycle.processedJobs).toBe(1);
    expect(caseAfterAgent?.agentState?.latestTriggerType).toBe("document_missing");
    expect(caseAfterAgent?.channelSummary?.latestOutboundStatus).toBe("queued");
  });

  it("auto-accepts a strong text-based document match when analysis confidence is high", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Omar Kareem",
      email: "omar@example.com",
      message: "I can send proof of funds today.",
      nextAction: "Collect the required documents",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      phone: "+966 55 303 4040",
      preferredLocale: "en",
      projectInterest: "Palm Horizon"
    });
    const initialCase = await store.getCaseDetail(createdCase.caseId);
    const documentRequest = initialCase?.documentRequests.find((item) => item.type === "proof_of_funds");

    await store.recordDocumentUpload(createdCase.caseId, documentRequest!.documentRequestId, {
      checksumSha256: "checksum-proof",
      documentUploadId: "00000000-0000-4000-8000-000000000032",
      fileName: "proof-of-funds.pdf",
      mimeType: "application/pdf",
      nextAction: "Review the uploaded files and either approve readiness or request a clear replacement",
      nextActionDueAt: "2026-04-12T10:00:00.000Z",
      sizeBytes: 28_000,
      storagePath: `${createdCase.caseId}/${documentRequest!.documentRequestId}/proof-of-funds.pdf`,
      uploadedAt: "2026-04-12T09:00:00.000Z"
    });

    const uploadedCase = await store.getCaseDetail(createdCase.caseId);

    await resolvePersistedDocumentUploadAnalysis(store, {
      caseDetail: uploadedCase!,
      documentRequestId: documentRequest!.documentRequestId,
      documentUploadId: "00000000-0000-4000-8000-000000000032",
      extractedTextFailureDetail: null,
      extractedTextPreview:
        "Bank statement available funds account balance IBAN customer reference balance certificate for financing review",
      extractedTextSource: "text_preview",
      extractedTextStatus: "extracted",
      modelAdapter: createDeterministicDocumentUploadAnalysisModelAdapter(),
      now: "2026-04-12T09:06:00.000Z"
    });

    const analyzedCase = await store.getCaseDetail(createdCase.caseId);

    expect(analyzedCase?.documentRequests.find((item) => item.documentRequestId === documentRequest!.documentRequestId)?.status).toBe(
      "accepted"
    );
    expect(
      analyzedCase?.documentRequests.find((item) => item.documentRequestId === documentRequest!.documentRequestId)?.latestUpload?.analysis
        ?.recommendation
    ).toBe("accept");
  });
});
