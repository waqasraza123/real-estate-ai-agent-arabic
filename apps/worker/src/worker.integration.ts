import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createAlphaLeadCaptureStore } from "@real-estate-ai/database";
import { managePersistedCaseFollowUp, runPersistedFollowUpCycle } from "@real-estate-ai/workflows";

describe("follow-up worker", () => {
  let store: Awaited<ReturnType<typeof createAlphaLeadCaptureStore>>;

  beforeEach(async () => {
    store = await createAlphaLeadCaptureStore({
      inMemory: true
    });
  });

  afterEach(async () => {
    await store.close();
  });

  it("opens an intervention for an overdue case and re-arms follow-up after manager intervention", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Maya Cole",
      email: "maya@example.com",
      message: "Need a quick callback about a premium unit this afternoon.",
      nextAction: "Call the buyer back immediately",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      preferredLocale: "en",
      projectInterest: "Marina Crest"
    });

    const firstCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(firstCycle.processedJobs).toBe(1);
    expect(firstCycle.openedInterventions).toBe(1);

    const overdueCase = await store.getCaseDetail(createdCase.caseId);

    expect(overdueCase?.openInterventionsCount).toBe(1);
    expect(overdueCase?.managerInterventions[0]?.type).toBe("follow_up_overdue");

    const updatedCase = await managePersistedCaseFollowUp(store, createdCase.caseId, {
      nextAction: "Manager callback confirmed for tomorrow morning",
      nextActionDueAt: "2026-04-13T09:30:00.000Z",
      ownerName: "Manager Desk North"
    });

    expect(updatedCase?.openInterventionsCount).toBe(0);
    expect(updatedCase?.ownerName).toBe("Manager Desk North");

    const secondCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-13T12:00:00.000Z"
    });

    expect(secondCycle.processedJobs).toBe(1);
    expect(secondCycle.openedInterventions).toBe(1);
  });

  it("skips overdue intervention creation when automation is paused", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Layal Abbas",
      email: "layal@example.com",
      message: "Need a bilingual callback later today.",
      nextAction: "Prepare first bilingual reply",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      preferredLocale: "ar",
      projectInterest: "Palm Horizon"
    });

    await store.setAutomationStatus(createdCase.caseId, {
      status: "paused"
    });

    const cycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(cycle.processedJobs).toBe(0);
    expect(cycle.openedInterventions).toBe(0);

    const caseDetail = await store.getCaseDetail(createdCase.caseId);

    expect(caseDetail?.automationStatus).toBe("paused");
    expect(caseDetail?.openInterventionsCount).toBe(0);
  });

  it("suppresses overdue automation while QA is open and re-arms follow-up once QA clears", async () => {
    const createdCase = await store.createWebsiteLeadCase({
      customerName: "Noura Aziz",
      email: "noura@example.com",
      message:
        "I am frustrated and need a special approval on the deposit terms. If this keeps happening, my lawyer will step in.",
      nextAction: "Call the customer back with the next revenue update",
      nextActionDueAt: "2026-04-12T08:00:00.000Z",
      preferredLocale: "en",
      projectInterest: "Harbor Gate"
    });

    expect(createdCase.automationHoldReason).toBe("qa_pending_review");
    expect(createdCase.currentQaReview?.status).toBe("pending_review");

    const heldCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:00:00.000Z"
    });

    expect(heldCycle.processedJobs).toBe(0);
    expect(heldCycle.openedInterventions).toBe(0);

    const pendingCase = await store.getCaseDetail(createdCase.caseId);

    expect(pendingCase?.automationHoldReason).toBe("qa_pending_review");
    expect(pendingCase?.openInterventionsCount).toBe(0);

    const resolvedCase = await store.resolveCaseQaReview(createdCase.caseId, createdCase.currentQaReview!.qaReviewId, {
      reviewSummary: "The escalation can proceed with a compliant human-managed response.",
      reviewerName: "QA Desk",
      status: "approved"
    });

    expect(resolvedCase?.automationHoldReason).toBeNull();
    expect(resolvedCase?.currentQaReview?.status).toBe("approved");

    const resumedCycle = await runPersistedFollowUpCycle(store, {
      limit: 10,
      runAt: "2026-04-12T12:05:00.000Z"
    });

    expect(resumedCycle.processedJobs).toBe(1);
    expect(resumedCycle.openedInterventions).toBe(1);

    const escalatedCase = await store.getCaseDetail(createdCase.caseId);

    expect(escalatedCase?.automationHoldReason).toBeNull();
    expect(escalatedCase?.openInterventionsCount).toBe(1);
    expect(escalatedCase?.managerInterventions[0]?.type).toBe("follow_up_overdue");
  });
});
