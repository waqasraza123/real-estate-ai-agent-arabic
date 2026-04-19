import type {
  ApproveHandoverCustomerUpdateInput,
  CaseAgentActionType,
  CaseAgentBlockedReason,
  CaseAgentDecision,
  CaseAgentRiskLevel,
  CaseAgentTriggerType,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  CreateHandoverBlockerInput,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  ListGovernanceEventsQuery,
  ManageBulkCaseFollowUpInput,
  MarkHandoverCustomerUpdateDispatchReadyInput,
  ManageCaseFollowUpInput,
  PlanHandoverAppointmentInput,
  PrepareCaseReplyDraftQaReviewInput,
  RequestCaseQaReviewInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedGovernanceEventList,
  PersistedGovernanceSummary,
  PersistedHandoverCaseDetail,
  SupportedLocale,
  QualifyCaseInput,
  ResolveCaseQaReviewInput,
  ResolveHandoverCustomerUpdateQaReviewInput,
  ResolveHandoverPostCompletionFollowUpInput,
  SaveHandoverArchiveReviewInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
  SendCaseReplyInput,
  StartHandoverExecutionInput,
  UpdateAutomationStatusInput,
  UpdateHandoverArchiveStatusInput,
  UpdateHandoverBlockerInput,
  UpdateDocumentRequestInput,
  HandoverCustomerUpdateQaReviewStatus,
  UpdateHandoverMilestoneInput,
  UpdateHandoverTaskStatusInput
} from "@real-estate-ai/contracts";
import { caseAgentDecisionSchema } from "@real-estate-ai/contracts";
import {
  deriveCustomerUpdateStatusFromMilestone,
  buildHandoverCustomerUpdateQaSampleSummary,
  type CaseAgentCycleResult,
  detectHandoverCustomerUpdateQaPolicyMatches,
  deriveDocumentWorkflowNextAction,
  deriveHandoverCaseStatus,
  getHandoverCaseNextAction,
  getHandoverCaseNextActionDueAt,
  type FollowUpCycleResult,
  type LeadCaptureStore
} from "@real-estate-ai/database";
import type { HandoverCaseStatus } from "@real-estate-ai/contracts";

export class WorkflowRuleError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

function preserveAdvancedHandoverStatus(currentStatus: HandoverCaseStatus, derivedStatus: HandoverCaseStatus): HandoverCaseStatus {
  if (currentStatus === "completed" || currentStatus === "in_progress") {
    return currentStatus;
  }

  return derivedStatus;
}

export async function getPersistedCaseDetail(store: LeadCaptureStore, caseId: string): Promise<PersistedCaseDetail | null> {
  return store.getCaseDetail(caseId);
}

export async function getPersistedHandoverCaseDetail(
  store: LeadCaptureStore,
  handoverCaseId: string
): Promise<PersistedHandoverCaseDetail | null> {
  return store.getHandoverCaseDetail(handoverCaseId);
}

export async function listPersistedCases(store: LeadCaptureStore): Promise<PersistedCaseSummary[]> {
  return store.listCases();
}

export async function getPersistedGovernanceSummary(store: LeadCaptureStore): Promise<PersistedGovernanceSummary> {
  return store.getGovernanceSummary();
}

export async function listPersistedGovernanceEvents(
  store: LeadCaptureStore,
  input: ListGovernanceEventsQuery
): Promise<PersistedGovernanceEventList> {
  return store.listGovernanceEvents(input);
}

export async function managePersistedCaseFollowUp(
  store: LeadCaptureStore,
  caseId: string,
  input: ManageCaseFollowUpInput
): Promise<PersistedCaseDetail | null> {
  return store.manageCaseFollowUp(caseId, input);
}

export async function managePersistedBulkCaseFollowUp(
  store: LeadCaptureStore,
  input: ManageBulkCaseFollowUpInput
): Promise<PersistedCaseDetail[] | null> {
  const caseIds = Array.from(new Set(input.caseIds));
  const caseDetails = await Promise.all(caseIds.map((caseId) => store.getCaseDetail(caseId)));

  if (caseDetails.some((caseDetail) => caseDetail === null)) {
    return null;
  }

  if (caseDetails.some((caseDetail) => caseDetail !== null && caseDetail.ownerName !== input.expectedCurrentOwnerName)) {
    throw new WorkflowRuleError("case_follow_up_scope_mismatch");
  }

  return store.manageCaseFollowUpBulk(caseIds, {
    nextAction: input.nextAction,
    nextActionDueAt: input.nextActionDueAt,
    ownerName: input.ownerName
  });
}

export async function requestPersistedCaseQaReview(
  store: LeadCaptureStore,
  caseId: string,
  input: RequestCaseQaReviewInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  if (caseDetail.currentQaReview?.status === "pending_review") {
    throw new WorkflowRuleError("qa_review_already_pending");
  }

  return store.requestCaseQaReview(caseId, input);
}

export async function preparePersistedCaseReplyDraftQaReview(
  store: LeadCaptureStore,
  caseId: string,
  input: PrepareCaseReplyDraftQaReviewInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  if (caseDetail.currentQaReview?.status === "pending_review") {
    throw new WorkflowRuleError("qa_review_already_pending");
  }

  return store.prepareCaseReplyDraftQaReview(caseId, input);
}

export async function resolvePersistedCaseQaReview(
  store: LeadCaptureStore,
  caseId: string,
  qaReviewId: string,
  input: ResolveCaseQaReviewInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  const qaReview = caseDetail.qaReviews.find((review) => review.qaReviewId === qaReviewId);

  if (!qaReview) {
    return null;
  }

  if (qaReview.status !== "pending_review") {
    throw new WorkflowRuleError("qa_review_not_pending");
  }

  return store.resolveCaseQaReview(caseId, qaReviewId, input);
}

export async function sendPersistedCaseReply(
  store: LeadCaptureStore,
  caseId: string,
  input: SendCaseReplyInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  const currentQaReview = caseDetail.currentQaReview;

  if (currentQaReview?.status === "pending_review" || currentQaReview?.status === "follow_up_required") {
    throw new WorkflowRuleError("qa_review_reply_send_blocked");
  }

  const sentApprovedDraftQaReviewIds = new Set(
    caseDetail.auditEvents
      .filter((event) => event.eventType === "case_reply_sent")
      .map((event) => {
        const approvedDraftQaReviewId = event.payload?.approvedDraftQaReviewId;

        return typeof approvedDraftQaReviewId === "string" ? approvedDraftQaReviewId : null;
      })
      .filter((qaReviewId): qaReviewId is string => qaReviewId !== null)
  );

  const approvedDraftQaReviewId =
    currentQaReview?.subjectType === "prepared_reply_draft" &&
    currentQaReview.status === "approved" &&
    currentQaReview.draftMessage &&
    !sentApprovedDraftQaReviewIds.has(currentQaReview.qaReviewId)
      ? currentQaReview.qaReviewId
      : null;

  if (approvedDraftQaReviewId && input.message.trim() !== currentQaReview?.draftMessage?.trim()) {
    throw new WorkflowRuleError("qa_approved_reply_draft_mismatch");
  }

  return store.sendCaseReply(caseId, {
    ...input,
    approvedDraftQaReviewId
  });
}

export async function qualifyPersistedCase(
  store: LeadCaptureStore,
  caseId: string,
  input: QualifyCaseInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  return store.applyQualification(caseId, {
    ...input,
    nextAction:
      caseDetail.preferredLocale === "ar" ? "اقتراح مواعيد الزيارة ومتابعة التأكيد" : "Offer visit slots and confirm the preferred appointment",
    nextActionDueAt: createFutureTimestamp(4)
  });
}

export async function runPersistedFollowUpCycle(
  store: LeadCaptureStore,
  input?: {
    limit?: number;
    runAt?: string;
  }
): Promise<FollowUpCycleResult> {
  return store.runDueFollowUpCycle({
    limit: input?.limit ?? 25,
    runAt: input?.runAt ?? new Date().toISOString()
  });
}

export interface CaseAgentModelInput {
  allowedActions: CaseAgentActionType[];
  caseDetail: PersistedCaseDetail;
  documentGapSummary: string | null;
  now: string;
  repeatedTriggerCount: number;
  riskFlags: string[];
  triggerType: CaseAgentTriggerType;
}

export interface CaseAgentModelAdapter {
  modelMode: string;
  generateDecision(input: CaseAgentModelInput): Promise<CaseAgentDecision>;
}

const deterministicCaseAgentModelAdapter: CaseAgentModelAdapter = {
  modelMode: "deterministic_v1",
  async generateDecision(input) {
    return decideCaseAgentActionDeterministic(input);
  }
};

export function createDeterministicCaseAgentModelAdapter(): CaseAgentModelAdapter {
  return deterministicCaseAgentModelAdapter;
}

export async function runPersistedCaseAgentCycle(
  store: LeadCaptureStore,
  input?: {
    canSendWhatsApp?: boolean;
    limit?: number;
    modelAdapter?: CaseAgentModelAdapter;
    runAt?: string;
  }
): Promise<CaseAgentCycleResult> {
  const runAt = input?.runAt ?? new Date().toISOString();
  const modelAdapter = input?.modelAdapter ?? deterministicCaseAgentModelAdapter;
  const dueJobs = await store.getDueAutomationJobs({
    jobType: "case_agent_trigger",
    limit: input?.limit ?? 25,
    runAt
  });

  let blockedRuns = 0;
  let escalatedRuns = 0;
  let processedJobs = 0;
  const touchedCaseIds = new Set<string>();

  for (const job of dueJobs) {
    processedJobs += 1;
    touchedCaseIds.add(job.caseId);

    const triggerType = readCaseAgentTriggerType(job.payload?.triggerType);
    const caseDetail = await store.getCaseDetail(job.caseId);

    await store.markAutomationJobCompleted(job.jobId, runAt);

    if (!caseDetail || !triggerType) {
      continue;
    }

    const startedAt = runAt;
    const { decision, modelMode } = await resolveCaseAgentDecision(caseDetail, {
      canSendWhatsApp: input?.canSendWhatsApp ?? false,
      modelAdapter,
      now: runAt,
      triggerType
    });

    if (decision.status === "blocked") {
      blockedRuns += 1;
    }

    if (decision.status === "escalated") {
      escalatedRuns += 1;
    }

    if (decision.actionType === "send_whatsapp_message" && decision.proposedMessage) {
      if (decision.toolExecutionStatus === "blocked") {
        await store.recordWhatsAppOutboundAttempt(job.caseId, {
          blockReason:
            decision.blockedReason === "missing_phone"
              ? "missing_phone"
              : decision.blockedReason === "automation_paused"
                ? "automation_paused"
                : decision.blockedReason === "qa_hold"
                  ? "qa_hold"
                  : "client_credentials_pending",
          failureCode: decision.blockedReason,
          failureDetail: decision.rationaleSummary,
          jobId: job.jobId,
          messageBody: decision.proposedMessage,
          origin: "system",
          provider: "meta_whatsapp_cloud",
          providerMessageId: null,
          retryAfter: null,
          sentByName: null,
          status: "blocked",
          updatedAt: runAt
        });
      } else {
        await store.queueCaseAgentReply(job.caseId, {
          agentRunId: job.jobId,
          messageBody: decision.proposedMessage,
          nextAction: decision.proposedNextAction,
          nextActionDueAt: decision.proposedNextActionDueAt,
          triggerType,
          updatedAt: runAt
        });
      }
    } else if (decision.actionType === "request_document_follow_up" || decision.actionType === "save_follow_up_plan") {
      await store.saveCaseAgentFollowUp(job.caseId, {
        agentRunId: job.jobId,
        nextAction: decision.proposedNextAction,
        nextActionDueAt: decision.proposedNextActionDueAt,
        summary: decision.rationaleSummary,
        triggerType,
        updatedAt: runAt
      });
    } else if (decision.actionType === "create_reply_draft" && decision.proposedMessage) {
      await store.createCaseAgentReplyDraft(job.caseId, {
        agentRunId: job.jobId,
        messageBody: decision.proposedMessage,
        nextAction: decision.proposedNextAction,
        nextActionDueAt: decision.proposedNextActionDueAt,
        summary: decision.rationaleSummary,
        triggerType,
        updatedAt: runAt
      });
    }

    if (decision.status === "escalated" || decision.actionType === "request_manager_intervention") {
      await store.openCaseManagerIntervention(job.caseId, {
        agentRunId: job.jobId,
        severity: decision.riskLevel === "high" ? "critical" : "warning",
        summary: decision.escalationReason ?? decision.rationaleSummary,
        triggerType,
        updatedAt: runAt
      });
    }

    await store.upsertCaseAgentMemory(job.caseId, buildCaseAgentMemorySnapshot(caseDetail, {
      decisionSummary: decision.rationaleSummary,
      now: runAt
    }));

    await store.createCaseAgentRun(job.caseId, {
      actionType: decision.actionType,
      agentRunId: job.jobId,
      blockedReason: decision.blockedReason,
      confidence: decision.confidence,
      escalationReason: decision.escalationReason,
      finishedAt: runAt,
      modelMode,
      proposedMessage: decision.proposedMessage,
      proposedNextAction: decision.proposedNextAction,
      proposedNextActionDueAt: decision.proposedNextActionDueAt,
      rationaleSummary: decision.rationaleSummary,
      riskLevel: decision.riskLevel,
      startedAt,
      status: decision.status,
      toolExecutionStatus: decision.toolExecutionStatus,
      triggerType,
      updatedAt: runAt
    });
  }

  return {
    blockedRuns,
    escalatedRuns,
    processedJobs,
    touchedCaseIds: Array.from(touchedCaseIds)
  };
}

export async function schedulePersistedVisit(
  store: LeadCaptureStore,
  caseId: string,
  input: ScheduleVisitInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  return store.scheduleVisit(caseId, {
    ...input,
    nextAction:
      caseDetail.preferredLocale === "ar"
        ? "إرسال تذكير الزيارة والتأكد من الحضور"
        : "Send the visit reminder and confirm attendance",
    nextActionDueAt: input.scheduledAt
  });
}

export async function setPersistedAutomationStatus(
  store: LeadCaptureStore,
  caseId: string,
  input: UpdateAutomationStatusInput
): Promise<PersistedCaseDetail | null> {
  return store.setAutomationStatus(caseId, {
    status: input.status
  });
}

export async function startPersistedHandoverIntake(
  store: LeadCaptureStore,
  caseId: string,
  input: CreateHandoverIntakeInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  if (caseDetail.handoverCase) {
    throw new WorkflowRuleError("handover_case_exists");
  }

  if (!caseDetail.documentRequests.every((documentRequest) => documentRequest.status === "accepted")) {
    throw new WorkflowRuleError("documents_incomplete_for_handover");
  }

  return store.startHandoverIntake(caseId, {
    ...input,
    nextAction:
      caseDetail.preferredLocale === "ar"
        ? "بدء قائمة جاهزية التسليم مع الفريق الداخلي"
        : "Start the handover readiness checklist with the internal team",
    nextActionDueAt: createFutureTimestamp(24)
  });
}

export async function submitWebsiteLead(
  store: LeadCaptureStore,
  input: CreateWebsiteLeadInput
): Promise<CreateWebsiteLeadResult> {
  return store.createWebsiteLeadCase({
    ...input,
    nextAction:
      input.preferredLocale === "ar"
        ? "مراجعة الحالة وإرسال أول رد باللغة العربية"
        : "Review the lead and send the first response",
    nextActionDueAt: createFutureTimestamp(0.25)
  });
}

export async function updatePersistedDocumentRequest(
  store: LeadCaptureStore,
  caseId: string,
  documentRequestId: string,
  input: UpdateDocumentRequestInput
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  const updatedDocumentRequests = caseDetail.documentRequests.map((documentRequest) =>
    documentRequest.documentRequestId === documentRequestId ? { ...documentRequest, status: input.status } : documentRequest
  );

  return store.updateDocumentRequestStatus(caseId, documentRequestId, {
    nextAction: deriveDocumentWorkflowNextAction(updatedDocumentRequests, caseDetail.preferredLocale),
    nextActionDueAt: createFutureTimestamp(input.status === "accepted" ? 4 : 24),
    status: input.status
  });
}

export async function updatePersistedHandoverTask(
  store: LeadCaptureStore,
  handoverCaseId: string,
  handoverTaskId: string,
  input: UpdateHandoverTaskStatusInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const updatedTasks = handoverCase.tasks.map((task) => (task.taskId === handoverTaskId ? { ...task, status: input.status } : task));
  const nextHandoverStatus = preserveAdvancedHandoverStatus(
    handoverCase.status,
    deriveHandoverCaseStatus(updatedTasks, handoverCase.milestones, handoverCase.customerUpdates, handoverCase.appointment)
  );

  return store.updateHandoverTaskStatus(handoverCaseId, handoverTaskId, {
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      updatedTasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      updatedTasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus,
    status: input.status
  });
}

export async function createPersistedHandoverBlocker(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: CreateHandoverBlockerInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "scheduled") {
    throw new WorkflowRuleError("handover_execution_not_ready");
  }

  const updatedBlockers = [
    ...handoverCase.blockers,
    {
      blockerId: "pending",
      createdAt: new Date().toISOString(),
      dueAt: input.dueAt,
      ownerName: input.ownerName ?? handoverCase.ownerName,
      severity: input.severity,
      status: input.status,
      summary: input.summary,
      type: input.type,
      updatedAt: new Date().toISOString()
    }
  ];

  return store.createHandoverBlocker(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      updatedBlockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      updatedBlockers
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function updatePersistedHandoverBlocker(
  store: LeadCaptureStore,
  handoverCaseId: string,
  blockerId: string,
  input: UpdateHandoverBlockerInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const blocker = handoverCase.blockers.find((item) => item.blockerId === blockerId);

  if (!blocker) {
    return null;
  }

  const updatedBlockers = handoverCase.blockers.map((item) =>
    item.blockerId === blockerId
      ? {
          ...item,
          dueAt: input.dueAt,
          ownerName: input.ownerName ?? item.ownerName,
          severity: input.severity,
          status: input.status,
          summary: input.summary
        }
      : item
  );

  return store.updateHandoverBlocker(handoverCaseId, blockerId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      updatedBlockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      updatedBlockers
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function startPersistedHandoverExecution(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: StartHandoverExecutionInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "scheduled") {
    throw new WorkflowRuleError("handover_execution_not_ready");
  }

  if (handoverCase.appointment?.status !== "internally_confirmed") {
    throw new WorkflowRuleError("handover_execution_appointment_not_confirmed");
  }

  if (handoverCase.blockers.some((blocker) => blocker.status !== "resolved")) {
    throw new WorkflowRuleError("handover_execution_blockers_open");
  }

  return store.startHandoverExecution(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      input.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      input.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus: input.status
  });
}

export async function completePersistedHandover(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: CompleteHandoverInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "in_progress") {
    throw new WorkflowRuleError("handover_completion_not_ready");
  }

  if (handoverCase.blockers.some((blocker) => blocker.status !== "resolved")) {
    throw new WorkflowRuleError("handover_completion_blockers_open");
  }

  return store.completeHandover(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      input.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      input.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus: input.status
  });
}

export async function savePersistedHandoverReview(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: SaveHandoverReviewInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "completed") {
    throw new WorkflowRuleError("handover_review_not_ready");
  }

  const nextReview = {
    createdAt: handoverCase.review?.createdAt ?? new Date().toISOString(),
    outcome: input.outcome,
    reviewId: handoverCase.review?.reviewId ?? "pending",
    summary: input.summary,
    updatedAt: new Date().toISOString()
  };

  return store.saveHandoverReview(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      nextReview,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      nextReview,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function savePersistedHandoverArchiveReview(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: SaveHandoverArchiveReviewInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "completed") {
    throw new WorkflowRuleError("handover_archive_review_not_ready");
  }

  if (!handoverCase.review) {
    throw new WorkflowRuleError("handover_archive_review_requires_review");
  }

  if (handoverCase.review.outcome === "follow_up_required" && handoverCase.postCompletionFollowUp?.status !== "resolved") {
    throw new WorkflowRuleError("handover_archive_review_requires_follow_up_resolution");
  }

  const nextArchiveReview = {
    createdAt: handoverCase.archiveReview?.createdAt ?? new Date().toISOString(),
    outcome: input.outcome,
    reviewId: handoverCase.archiveReview?.reviewId ?? "pending",
    summary: input.summary,
    updatedAt: new Date().toISOString()
  };

  return store.saveHandoverArchiveReview(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      nextArchiveReview,
      handoverCase.archiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      nextArchiveReview,
      handoverCase.archiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function createPersistedHandoverPostCompletionFollowUp(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: CreateHandoverPostCompletionFollowUpInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "completed") {
    throw new WorkflowRuleError("handover_post_completion_follow_up_not_ready");
  }

  if (handoverCase.review?.outcome !== "follow_up_required") {
    throw new WorkflowRuleError("handover_follow_up_not_required");
  }

  const nextFollowUp = {
    createdAt: handoverCase.postCompletionFollowUp?.createdAt ?? new Date().toISOString(),
    dueAt: input.dueAt,
    followUpId: handoverCase.postCompletionFollowUp?.followUpId ?? "pending",
    ownerName: input.ownerName ?? handoverCase.ownerName,
    resolutionSummary: null,
    resolvedAt: null,
    status: input.status,
    summary: input.summary,
    updatedAt: new Date().toISOString()
  };

  return store.createHandoverPostCompletionFollowUp(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      nextFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      nextFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function resolvePersistedHandoverPostCompletionFollowUp(
  store: LeadCaptureStore,
  handoverCaseId: string,
  followUpId: string,
  input: ResolveHandoverPostCompletionFollowUpInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "completed") {
    throw new WorkflowRuleError("handover_post_completion_follow_up_not_ready");
  }

  if (!handoverCase.postCompletionFollowUp || handoverCase.postCompletionFollowUp.followUpId !== followUpId) {
    return null;
  }

  if (handoverCase.postCompletionFollowUp.status !== "open") {
    throw new WorkflowRuleError("handover_post_completion_follow_up_not_open");
  }

  const nextFollowUp = {
    ...handoverCase.postCompletionFollowUp,
    resolutionSummary: input.resolutionSummary,
    resolvedAt: new Date().toISOString(),
    status: input.status,
    updatedAt: new Date().toISOString()
  };

  return store.resolveHandoverPostCompletionFollowUp(handoverCaseId, followUpId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      nextFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      nextFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function updatePersistedHandoverArchiveStatus(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: UpdateHandoverArchiveStatusInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (handoverCase.status !== "completed") {
    throw new WorkflowRuleError("handover_archive_status_not_ready");
  }

  if (!handoverCase.archiveReview) {
    throw new WorkflowRuleError("handover_archive_status_requires_review");
  }

  if (input.status === "held" && handoverCase.archiveReview.outcome !== "hold_for_review") {
    throw new WorkflowRuleError("handover_archive_status_outcome_mismatch");
  }

  if (input.status === "ready" && handoverCase.archiveReview.outcome !== "ready_to_archive") {
    throw new WorkflowRuleError("handover_archive_status_outcome_mismatch");
  }

  if (input.status === "archived" && handoverCase.archiveStatus?.status !== "ready") {
    throw new WorkflowRuleError("handover_archive_status_requires_ready");
  }

  const nextArchiveStatus = {
    createdAt: handoverCase.archiveStatus?.createdAt ?? new Date().toISOString(),
    status: input.status,
    statusId: handoverCase.archiveStatus?.statusId ?? "pending",
    summary: input.summary,
    updatedAt: new Date().toISOString()
  };

  return store.updateHandoverArchiveStatus(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      nextArchiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      nextArchiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function planPersistedHandoverAppointment(
  store: LeadCaptureStore,
  handoverCaseId: string,
  input: PlanHandoverAppointmentInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const schedulingInvite = handoverCase.customerUpdates.find((customerUpdate) => customerUpdate.type === "scheduling_invite");

  if (handoverCase.status !== "customer_scheduling_ready" || schedulingInvite?.status !== "approved") {
    throw new WorkflowRuleError("handover_scheduling_boundary_not_approved");
  }

  const nextAppointment = {
    appointmentId: handoverCase.appointment?.appointmentId ?? "pending",
    coordinatorName: input.coordinatorName ?? handoverCase.ownerName,
    createdAt: handoverCase.appointment?.createdAt ?? new Date().toISOString(),
    location: input.location,
    scheduledAt: input.scheduledAt,
    status: "planned" as const,
    updatedAt: new Date().toISOString()
  };
  const updatedCustomerUpdates = handoverCase.customerUpdates.map((customerUpdate) =>
    customerUpdate.type === "appointment_confirmation" &&
    (customerUpdate.status === "prepared_for_delivery" || customerUpdate.status === "ready_to_dispatch")
        ? {
            ...customerUpdate,
            deliveryPreparedAt: null,
            deliverySummary: null,
            dispatchReadyAt: null,
            status: "approved" as const
          }
      : customerUpdate
  );
  const nextHandoverStatus = deriveHandoverCaseStatus(handoverCase.tasks, handoverCase.milestones, updatedCustomerUpdates, nextAppointment);

  return store.planHandoverAppointment(handoverCaseId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      nextAppointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      nextAppointment,
      handoverCase.blockers
    ),
    nextHandoverStatus
  });
}

export async function updatePersistedHandoverMilestone(
  store: LeadCaptureStore,
  handoverCaseId: string,
  milestoneId: string,
  input: UpdateHandoverMilestoneInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const milestoneRecord = handoverCase.milestones.find((milestone) => milestone.milestoneId === milestoneId);

  if (!milestoneRecord) {
    return null;
  }

  const updatedMilestones = handoverCase.milestones.map((milestone) =>
    milestone.milestoneId === milestoneId
      ? {
          ...milestone,
          ownerName: input.ownerName ?? milestone.ownerName,
          status: input.status,
          targetAt: input.targetAt
        }
      : milestone
  );

  const nextCustomerUpdateStatus = deriveCustomerUpdateStatusFromMilestone(input.status);
  const linkedCustomerUpdateType =
    milestoneRecord.type === "readiness_gate"
      ? "readiness_update"
      : milestoneRecord.type === "customer_scheduling_window"
        ? "scheduling_invite"
        : "appointment_confirmation";

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((customerUpdate) =>
    customerUpdate.type === linkedCustomerUpdateType
      ? {
          ...customerUpdate,
          deliveryPreparedAt: null,
          deliverySummary: null,
          dispatchReadyAt: null,
          status: nextCustomerUpdateStatus
        }
      : customerUpdate
  );

  const nextHandoverStatus = deriveHandoverCaseStatus(
    handoverCase.tasks,
    updatedMilestones,
    updatedCustomerUpdates,
    handoverCase.appointment
  );
  const preservedHandoverStatus = preserveAdvancedHandoverStatus(handoverCase.status, nextHandoverStatus);

  return store.updateHandoverMilestone(handoverCaseId, milestoneId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      preservedHandoverStatus,
      handoverCase.tasks,
      updatedMilestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      preservedHandoverStatus,
      handoverCase.tasks,
      updatedMilestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextCustomerUpdateStatus,
    nextHandoverStatus: preservedHandoverStatus
  });
}

export async function approvePersistedHandoverCustomerUpdate(
  store: LeadCaptureStore,
  handoverCaseId: string,
  customerUpdateId: string,
  input: ApproveHandoverCustomerUpdateInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const customerUpdate = handoverCase.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

  if (!customerUpdate) {
    return null;
  }

  if (customerUpdate.status !== "ready_for_approval") {
    throw new WorkflowRuleError("handover_customer_update_not_ready");
  }

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((item) =>
    item.customerUpdateId === customerUpdateId ? { ...item, status: input.status } : item
  );
  const nextHandoverStatus = preserveAdvancedHandoverStatus(
    handoverCase.status,
    deriveHandoverCaseStatus(handoverCase.tasks, handoverCase.milestones, updatedCustomerUpdates, handoverCase.appointment)
  );

  return store.updateHandoverCustomerUpdateStatus(handoverCaseId, customerUpdateId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus
  });
}

export async function confirmPersistedHandoverAppointment(
  store: LeadCaptureStore,
  handoverCaseId: string,
  appointmentId: string,
  input: ConfirmHandoverAppointmentInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  if (!handoverCase.appointment || handoverCase.appointment.appointmentId !== appointmentId) {
    throw new WorkflowRuleError("handover_appointment_not_planned");
  }

  const appointmentConfirmation = handoverCase.customerUpdates.find((customerUpdate) => customerUpdate.type === "appointment_confirmation");

  if (appointmentConfirmation?.status !== "approved") {
    throw new WorkflowRuleError("handover_appointment_confirmation_not_approved");
  }

  const confirmedAppointment = {
    ...handoverCase.appointment,
    status: input.status
  };
  const nextHandoverStatus = preserveAdvancedHandoverStatus(
    handoverCase.status,
    deriveHandoverCaseStatus(handoverCase.tasks, handoverCase.milestones, handoverCase.customerUpdates, confirmedAppointment)
  );

  return store.confirmHandoverAppointment(handoverCaseId, appointmentId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      confirmedAppointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      handoverCase.customerUpdates,
      confirmedAppointment,
      handoverCase.blockers
    ),
    nextHandoverStatus
  });
}

export async function preparePersistedHandoverCustomerUpdateDelivery(
  store: LeadCaptureStore,
  handoverCaseId: string,
  customerUpdateId: string,
  input: PrepareHandoverCustomerUpdateDeliveryInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const customerUpdate = handoverCase.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

  if (!customerUpdate || customerUpdate.type !== "appointment_confirmation") {
    throw new WorkflowRuleError("handover_delivery_target_not_supported");
  }

  if (customerUpdate.status !== "approved") {
    throw new WorkflowRuleError("handover_delivery_boundary_not_approved");
  }

  if (handoverCase.appointment?.status !== "internally_confirmed") {
    throw new WorkflowRuleError("handover_appointment_not_confirmed");
  }

  const qaPolicyMatches = detectHandoverCustomerUpdateQaPolicyMatches(input.deliverySummary);
  const nextQaReview =
    qaPolicyMatches.length > 0
      ? {
          policyMatches: qaPolicyMatches,
          sampleSummary: buildHandoverCustomerUpdateQaSampleSummary(
            handoverCase.preferredLocale,
            qaPolicyMatches.map((match) => match.signal)
          )
        }
      : null;
  const nextQaReviewStatus: HandoverCustomerUpdateQaReviewStatus = nextQaReview ? "pending_review" : "not_required";

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((item) =>
    item.customerUpdateId === customerUpdateId
      ? {
          ...item,
          deliveryPreparedAt: new Date().toISOString(),
          deliverySummary: input.deliverySummary,
          dispatchReadyAt: null,
          qaPolicySignals: nextQaReview?.policyMatches.map((match) => match.signal) ?? [],
          qaReviewSampleSummary: nextQaReview?.sampleSummary ?? null,
          qaReviewStatus: nextQaReviewStatus,
          qaReviewSummary: null,
          qaReviewedAt: null,
          qaReviewerName: null,
          qaTriggerEvidence: nextQaReview?.policyMatches.map((match) => match.evidence) ?? [],
          status: input.status
        }
      : item
  );
  const nextHandoverStatus = deriveHandoverCaseStatus(
    handoverCase.tasks,
    handoverCase.milestones,
    updatedCustomerUpdates,
    handoverCase.appointment
  );

  return store.prepareHandoverCustomerUpdateDelivery(handoverCaseId, customerUpdateId, {
    ...input,
    qaReview: nextQaReview,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus
  });
}

export async function resolvePersistedHandoverCustomerUpdateQaReview(
  store: LeadCaptureStore,
  handoverCaseId: string,
  customerUpdateId: string,
  input: ResolveHandoverCustomerUpdateQaReviewInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const customerUpdate = handoverCase.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

  if (!customerUpdate) {
    return null;
  }

  if (customerUpdate.status !== "prepared_for_delivery") {
    throw new WorkflowRuleError("handover_customer_update_qa_target_not_prepared");
  }

  if (customerUpdate.qaReviewStatus !== "pending_review") {
    throw new WorkflowRuleError("handover_customer_update_qa_review_not_pending");
  }
  const resolvedQaReviewStatus: HandoverCustomerUpdateQaReviewStatus = input.status;

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((item) =>
    item.customerUpdateId === customerUpdateId
      ? {
          ...item,
          qaReviewStatus: resolvedQaReviewStatus,
          qaReviewSummary: input.reviewSummary,
          qaReviewedAt: new Date().toISOString(),
          qaReviewerName: input.reviewerName ?? item.qaReviewerName ?? "QA Team"
        }
      : item
  );

  return store.resolveHandoverCustomerUpdateQaReview(handoverCaseId, customerUpdateId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      handoverCase.status,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers,
      handoverCase.review,
      handoverCase.postCompletionFollowUp,
      handoverCase.archiveReview,
      handoverCase.archiveStatus
    ),
    nextHandoverStatus: handoverCase.status
  });
}

export async function markPersistedHandoverCustomerUpdateDispatchReady(
  store: LeadCaptureStore,
  handoverCaseId: string,
  customerUpdateId: string,
  input: MarkHandoverCustomerUpdateDispatchReadyInput
): Promise<PersistedHandoverCaseDetail | null> {
  const handoverCase = await store.getHandoverCaseDetail(handoverCaseId);

  if (!handoverCase) {
    return null;
  }

  const customerUpdate = handoverCase.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

  if (!customerUpdate || customerUpdate.type !== "appointment_confirmation") {
    throw new WorkflowRuleError("handover_delivery_target_not_supported");
  }

  if (customerUpdate.status !== "prepared_for_delivery") {
    throw new WorkflowRuleError("handover_delivery_preparation_required");
  }

  if (customerUpdate.qaReviewStatus === "pending_review") {
    throw new WorkflowRuleError("handover_customer_update_qa_review_pending");
  }

  if (customerUpdate.qaReviewStatus === "follow_up_required") {
    throw new WorkflowRuleError("handover_customer_update_qa_follow_up_required");
  }

  if (handoverCase.appointment?.status !== "internally_confirmed") {
    throw new WorkflowRuleError("handover_appointment_not_confirmed");
  }

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((item) =>
    item.customerUpdateId === customerUpdateId
      ? {
          ...item,
          dispatchReadyAt: new Date().toISOString(),
          status: input.status
        }
      : item
  );
  const nextHandoverStatus = deriveHandoverCaseStatus(
    handoverCase.tasks,
    handoverCase.milestones,
    updatedCustomerUpdates,
    handoverCase.appointment
  );

  return store.markHandoverCustomerUpdateDispatchReady(handoverCaseId, customerUpdateId, {
    ...input,
    nextAction: getHandoverCaseNextAction(
      handoverCase.preferredLocale,
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextActionDueAt: getHandoverCaseNextActionDueAt(
      nextHandoverStatus,
      handoverCase.tasks,
      handoverCase.milestones,
      updatedCustomerUpdates,
      handoverCase.appointment,
      handoverCase.blockers
    ),
    nextHandoverStatus
  });
}

function buildCaseAgentMemorySnapshot(
  caseDetail: PersistedCaseDetail,
  input: {
    decisionSummary: string;
    now: string;
  }
) {
  const latestInboundEvent = [...caseDetail.auditEvents]
    .reverse()
    .find((event) => event.eventType === "whatsapp_inbound_received");
  const latestIntentSummary =
    typeof latestInboundEvent?.payload?.textBody === "string"
      ? latestInboundEvent.payload.textBody.slice(0, 280)
      : caseDetail.message.slice(0, 280);
  const lastObjectionSummary = extractRiskFlagSummary(caseDetail);
  const qualificationSummary = caseDetail.qualificationSnapshot
    ? `${caseDetail.qualificationSnapshot.readiness} | ${caseDetail.qualificationSnapshot.budgetBand} | ${caseDetail.qualificationSnapshot.moveInTimeline}`
    : null;
  const documentGapSummary = summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale);

  return {
    activeRiskFlags: buildRiskFlags(caseDetail),
    documentGapSummary,
    lastDecisionSummary: input.decisionSummary,
    lastInboundAt: caseDetail.channelSummary?.lastInboundAt ?? caseDetail.agentMemory?.lastInboundAt ?? null,
    lastObjectionSummary,
    lastSuccessfulOutboundAt:
      caseDetail.channelSummary?.latestOutboundStatus === "sent" || caseDetail.channelSummary?.latestOutboundStatus === "delivered"
        ? caseDetail.channelSummary.latestOutboundUpdatedAt
        : caseDetail.agentMemory?.lastSuccessfulOutboundAt ?? null,
    latestIntentSummary,
    qualificationSummary,
    updatedAt: input.now
  };
}

async function resolveCaseAgentDecision(
  caseDetail: PersistedCaseDetail,
  input: {
    canSendWhatsApp: boolean;
    modelAdapter: CaseAgentModelAdapter;
    now: string;
    triggerType: CaseAgentTriggerType;
  }
): Promise<{
  decision: CaseAgentDecision;
  modelMode: string;
}> {
  const baseBlockedReason = getCaseAgentBlockedReason(caseDetail, input.canSendWhatsApp);

  if (baseBlockedReason) {
    return {
      decision: buildBlockedCaseAgentDecision(caseDetail, {
        blockedReason: baseBlockedReason,
        triggerType: input.triggerType
      }),
      modelMode: "policy_guardrail_v1"
    };
  }

  const riskFlags = buildRiskFlags(caseDetail);
  const documentGapSummary = summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale);
  const repeatedTriggerCount = (caseDetail.agentRuns ?? []).filter((run) => run.triggerType === input.triggerType).length;
  const modelInput: CaseAgentModelInput = {
    allowedActions: [
      "send_whatsapp_message",
      "save_follow_up_plan",
      "request_manager_intervention",
      "pause_automation",
      "request_document_follow_up",
      "create_reply_draft"
    ],
    caseDetail,
    documentGapSummary,
    now: input.now,
    repeatedTriggerCount,
    riskFlags,
    triggerType: input.triggerType
  };

  try {
    const adapterDecision = caseAgentDecisionSchema.parse(await input.modelAdapter.generateDecision(modelInput));

    return {
      decision: applyCaseAgentDecisionGuardrails(caseDetail, adapterDecision, {
        now: input.now,
        repeatedTriggerCount,
        riskFlags,
        triggerType: input.triggerType
      }),
      modelMode: input.modelAdapter.modelMode
    };
  } catch {
    return {
      decision: decideCaseAgentActionDeterministic(modelInput),
      modelMode:
        input.modelAdapter.modelMode === deterministicCaseAgentModelAdapter.modelMode
          ? deterministicCaseAgentModelAdapter.modelMode
          : `${input.modelAdapter.modelMode}_fallback`
    };
  }
}

function decideCaseAgentActionDeterministic(input: CaseAgentModelInput): CaseAgentDecision {
  const { caseDetail } = input;
  const { documentGapSummary, repeatedTriggerCount, riskFlags, triggerType } = input;

  if (triggerType === "new_lead") {
    if (riskFlags.includes("policy_sensitive_lead")) {
      return {
        actionType: "request_manager_intervention",
        blockedReason: null,
        confidence: 0.88,
        escalationReason:
          caseDetail.preferredLocale === "ar"
            ? "الحالة تحتوي على إشارة حساسة وتحتاج قراراً بشرياً قبل أي رد تلقائي."
            : "The lead contains a sensitive signal and needs a human decision before any automated reply.",
        proposedMessage: null,
        proposedNextAction:
          caseDetail.preferredLocale === "ar" ? "تحويل الحالة إلى المدير لمراجعة الرد الأول" : "Route the case to a manager for first-reply review",
        proposedNextActionDueAt: createFutureTimestamp(1),
        rationaleSummary:
          caseDetail.preferredLocale === "ar"
            ? "تم تصعيد الحالة لأن محتوى العميل يتجاوز حدود الرد الآلي الآمن."
            : "Escalated because the customer message exceeds the safe automated-response boundary.",
        riskLevel: "high",
        status: "escalated",
        toolExecutionStatus: "executed",
        triggerType
      };
    }

    return {
      actionType: "send_whatsapp_message",
      blockedReason: null,
      confidence: 0.94,
      escalationReason: null,
      proposedMessage: buildTriggerMessage("new_lead", caseDetail, documentGapSummary),
      proposedNextAction:
        caseDetail.preferredLocale === "ar"
          ? "انتظار رد العميل ومتابعة التأهيل إذا عاد على واتساب"
          : "Wait for the customer reply and continue qualification on WhatsApp",
      proposedNextActionDueAt: createFutureTimestamp(4),
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "العميل جديد والمحتوى منخفض المخاطر، لذلك يمكن إرسال أول رد تلقائي آمن."
          : "The lead is new and low-risk, so the first reply can be sent automatically.",
      riskLevel: "low",
      status: "completed",
      toolExecutionStatus: "queued",
      triggerType
    };
  }

  if (triggerType === "document_missing") {
    if (repeatedTriggerCount >= 1) {
      return {
        actionType: "request_manager_intervention",
        blockedReason: null,
        confidence: 0.82,
        escalationReason:
          caseDetail.preferredLocale === "ar"
            ? "المستندات ما زالت ناقصة بعد متابعة سابقة وتحتاج تدخلاً بشرياً."
            : "Documents are still missing after a prior follow-up and now need human intervention.",
        proposedMessage: null,
        proposedNextAction:
          caseDetail.preferredLocale === "ar"
            ? "راجع التعثر مع العميل وحدد ما إذا كان يجب إعادة التعيين أو الإغلاق"
            : "Review the stall with the customer and decide whether to reassign or close the case",
        proposedNextActionDueAt: createFutureTimestamp(6),
        rationaleSummary:
          caseDetail.preferredLocale === "ar"
            ? "تم التصعيد لأن الحالة عالقة في المستندات بعد أكثر من دورة متابعة."
            : "Escalated because the case remains stuck in document collection after more than one cycle.",
        riskLevel: "medium",
        status: "escalated",
        toolExecutionStatus: "executed",
        triggerType
      };
    }

    return {
      actionType: "send_whatsapp_message",
      blockedReason: null,
      confidence: 0.9,
      escalationReason: null,
      proposedMessage: buildTriggerMessage("document_missing", caseDetail, documentGapSummary),
      proposedNextAction:
        caseDetail.preferredLocale === "ar"
          ? "تحقق من استلام المستندات المطلوبة أو صعد الحالة إذا استمر الغياب"
          : "Check for the required documents or escalate if they remain missing",
      proposedNextActionDueAt: createFutureTimestamp(24),
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "الحالة في مرحلة المستندات وما زالت هناك عناصر ناقصة، لذا أرسل متابعة وثائق واضحة."
          : "The case is in document collection with outstanding items, so a document chase message is appropriate.",
      riskLevel: "low",
      status: "completed",
      toolExecutionStatus: "queued",
      triggerType
    };
  }

  if (repeatedTriggerCount >= 1 || caseDetail.openInterventionsCount > 0) {
    return {
      actionType: "request_manager_intervention",
      blockedReason: null,
      confidence: 0.85,
      escalationReason:
        caseDetail.preferredLocale === "ar"
          ? "العميل ما زال صامتاً بعد متابعة سابقة ويحتاج تدخلاً من المدير."
          : "The customer is still silent after a prior follow-up and needs manager intervention.",
      proposedMessage: null,
      proposedNextAction:
        caseDetail.preferredLocale === "ar"
          ? "قرر التصعيد أو إعادة التعيين أو الإغلاق بناءً على صمت العميل"
          : "Decide whether to escalate, reassign, or close based on the continued silence",
      proposedNextActionDueAt: createFutureTimestamp(6),
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "تم التصعيد لأن المتابعة السابقة لم تستعد التفاعل."
          : "Escalated because the prior follow-up did not recover engagement.",
      riskLevel: "medium",
      status: "escalated",
      toolExecutionStatus: "executed",
      triggerType
    };
  }

  return {
    actionType: "send_whatsapp_message",
    blockedReason: null,
    confidence: 0.89,
    escalationReason: null,
    proposedMessage: buildTriggerMessage("no_response_follow_up", caseDetail, documentGapSummary),
    proposedNextAction:
      caseDetail.preferredLocale === "ar"
        ? "انتظر الرد التالي أو صعد الحالة إذا استمر الصمت"
        : "Wait for the next reply or escalate if the customer stays silent",
    proposedNextActionDueAt: createFutureTimestamp(24),
    rationaleSummary:
      caseDetail.preferredLocale === "ar"
        ? "المتابعة مستحقة والعميل لم يرد بعد، لذلك أرسل متابعة واتساب قصيرة وآمنة."
        : "The follow-up is due and the customer has not replied, so a short safe WhatsApp nudge is appropriate.",
    riskLevel: "low",
    status: "completed",
    toolExecutionStatus: "queued",
    triggerType
  };
}

function applyCaseAgentDecisionGuardrails(
  caseDetail: PersistedCaseDetail,
  decision: CaseAgentDecision,
  input: {
    now: string;
    repeatedTriggerCount: number;
    riskFlags: string[];
    triggerType: CaseAgentTriggerType;
  }
): CaseAgentDecision {
  if (decision.triggerType !== input.triggerType) {
    return decideCaseAgentActionDeterministic({
      allowedActions: [],
      caseDetail,
      documentGapSummary: summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale),
      now: input.now,
      repeatedTriggerCount: input.repeatedTriggerCount,
      riskFlags: input.riskFlags,
      triggerType: input.triggerType
    });
  }

  if (
    (decision.actionType === "send_whatsapp_message" || decision.actionType === "create_reply_draft") &&
    !decision.proposedMessage
  ) {
    return decideCaseAgentActionDeterministic({
      allowedActions: [],
      caseDetail,
      documentGapSummary: summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale),
      now: input.now,
      repeatedTriggerCount: input.repeatedTriggerCount,
      riskFlags: input.riskFlags,
      triggerType: input.triggerType
    });
  }

  if (input.triggerType === "new_lead" && input.riskFlags.includes("policy_sensitive_lead")) {
    return buildEscalatedDecision(caseDetail, {
      confidence: Math.max(decision.confidence, 0.88),
      escalationReason:
        caseDetail.preferredLocale === "ar"
          ? "الحالة تحتوي على إشارة حساسة وتحتاج قراراً بشرياً قبل أي رد تلقائي."
          : "The lead contains a sensitive signal and needs a human decision before any automated reply.",
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "تم تصعيد الحالة لأن محتوى العميل يتجاوز حدود الرد الآلي الآمن."
          : "Escalated because the customer message exceeds the safe automated-response boundary.",
      riskLevel: "high",
      triggerType: input.triggerType
    });
  }

  if (
    (input.triggerType === "no_response_follow_up" || input.triggerType === "document_missing") &&
    input.repeatedTriggerCount >= 1 &&
    decision.actionType === "send_whatsapp_message"
  ) {
    return buildEscalatedDecision(caseDetail, {
      confidence: Math.max(decision.confidence, 0.84),
      escalationReason:
        input.triggerType === "document_missing"
          ? caseDetail.preferredLocale === "ar"
            ? "المستندات ما زالت ناقصة بعد متابعة سابقة وتحتاج تدخلاً بشرياً."
            : "Documents are still missing after a prior follow-up and now need human intervention."
          : caseDetail.preferredLocale === "ar"
            ? "العميل ما زال صامتاً بعد متابعة سابقة ويحتاج تدخلاً من المدير."
            : "The customer is still silent after a prior follow-up and needs manager intervention.",
      rationaleSummary:
        input.triggerType === "document_missing"
          ? caseDetail.preferredLocale === "ar"
            ? "تم التصعيد لأن الحالة عالقة في المستندات بعد أكثر من دورة متابعة."
            : "Escalated because the case remains stuck in document collection after more than one cycle."
          : caseDetail.preferredLocale === "ar"
            ? "تم التصعيد لأن المتابعة السابقة لم تستعد التفاعل."
            : "Escalated because the prior follow-up did not recover engagement.",
      riskLevel: "medium",
      triggerType: input.triggerType
    });
  }

  if (decision.actionType === "send_whatsapp_message" && decision.riskLevel === "high") {
    return buildEscalatedDecision(caseDetail, {
      confidence: Math.max(decision.confidence, 0.9),
      escalationReason:
        decision.escalationReason ??
        (caseDetail.preferredLocale === "ar"
          ? "القرار المقترح عالي المخاطر ويحتاج موافقة بشرية قبل التواصل مع العميل."
          : "The proposed action is high-risk and needs human approval before contacting the customer."),
      rationaleSummary:
        decision.rationaleSummary ||
        (caseDetail.preferredLocale === "ar"
          ? "تم تصعيد الحالة لأن النموذج صنفها على أنها عالية المخاطر."
          : "Escalated because the model classified the case as high-risk."),
      riskLevel: "high",
      triggerType: input.triggerType
    });
  }

  if (
    decision.actionType === "send_whatsapp_message" &&
    (decision.riskLevel === "medium" || decision.confidence < 0.86)
  ) {
    return {
      ...decision,
      actionType: "create_reply_draft",
      escalationReason: null,
      status: "waiting",
      toolExecutionStatus: "executed"
    };
  }

  if (decision.actionType === "request_manager_intervention") {
    return {
      ...decision,
      status: "escalated",
      toolExecutionStatus: decision.toolExecutionStatus ?? "executed"
    };
  }

  if (decision.actionType === "create_reply_draft") {
    return {
      ...decision,
      status: "waiting",
      toolExecutionStatus: decision.toolExecutionStatus ?? "executed"
    };
  }

  return decision;
}

function buildBlockedCaseAgentDecision(
  caseDetail: PersistedCaseDetail,
  input: {
    blockedReason: Extract<
      CaseAgentBlockedReason,
      "missing_phone" | "automation_paused" | "qa_hold" | "client_credentials_pending"
    >;
    triggerType: CaseAgentTriggerType;
  }
): CaseAgentDecision {
  return {
    actionType: "send_whatsapp_message",
    blockedReason: input.blockedReason,
    confidence: 0.99,
    escalationReason: null,
    proposedMessage: buildTriggerMessage(
      input.triggerType,
      caseDetail,
      summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale)
    ),
    proposedNextAction: buildBlockedNextAction(caseDetail.preferredLocale, input.blockedReason),
    proposedNextActionDueAt: createFutureTimestamp(input.blockedReason === "client_credentials_pending" ? 24 : 4),
    rationaleSummary: buildBlockedRationale(caseDetail.preferredLocale, input.blockedReason),
    riskLevel: "medium",
    status: "blocked",
    toolExecutionStatus: "blocked",
    triggerType: input.triggerType
  };
}

function buildEscalatedDecision(
  caseDetail: PersistedCaseDetail,
  input: {
    confidence: number;
    escalationReason: string;
    rationaleSummary: string;
    riskLevel: CaseAgentRiskLevel;
    triggerType: CaseAgentTriggerType;
  }
): CaseAgentDecision {
  return {
    actionType: "request_manager_intervention",
    blockedReason: null,
    confidence: input.confidence,
    escalationReason: input.escalationReason,
    proposedMessage: null,
    proposedNextAction:
      input.triggerType === "new_lead"
        ? caseDetail.preferredLocale === "ar"
          ? "تحويل الحالة إلى المدير لمراجعة الرد الأول"
          : "Route the case to a manager for first-reply review"
        : input.triggerType === "document_missing"
        ? caseDetail.preferredLocale === "ar"
          ? "راجع التعثر مع العميل وحدد ما إذا كان يجب إعادة التعيين أو الإغلاق"
          : "Review the stall with the customer and decide whether to reassign or close the case"
        : caseDetail.preferredLocale === "ar"
          ? "قرر التصعيد أو إعادة التعيين أو الإغلاق بناءً على صمت العميل"
          : "Decide whether to escalate, reassign, or close based on the continued silence",
    proposedNextActionDueAt: createFutureTimestamp(input.triggerType === "new_lead" ? 1 : 6),
    rationaleSummary: input.rationaleSummary,
    riskLevel: input.riskLevel,
    status: "escalated",
    toolExecutionStatus: "executed",
    triggerType: input.triggerType
  };
}

function getCaseAgentBlockedReason(
  caseDetail: PersistedCaseDetail,
  canSendWhatsApp: boolean
): Extract<CaseAgentBlockedReason, "missing_phone" | "automation_paused" | "qa_hold" | "client_credentials_pending"> | null {
  if (!caseDetail.channelSummary?.contactValue && !caseDetail.phone) {
    return "missing_phone";
  }

  if (caseDetail.automationStatus === "paused") {
    return "automation_paused";
  }

  if (caseDetail.automationHoldReason !== null) {
    return "qa_hold";
  }

  if (!canSendWhatsApp) {
    return "client_credentials_pending";
  }

  return null;
}

function buildTriggerMessage(
  triggerType: CaseAgentTriggerType,
  caseDetail: PersistedCaseDetail,
  documentGapSummary: string | null
) {
  if (triggerType === "new_lead") {
    return caseDetail.preferredLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، استلمنا اهتمامك بمشروع ${caseDetail.projectInterest}. يمكننا متابعة التفاصيل المناسبة لك هنا على واتساب متى كان ذلك مناسباً.`
      : `Hi ${caseDetail.customerName}, we received your interest in ${caseDetail.projectInterest}. We can continue the next suitable details with you here on WhatsApp whenever you're ready.`;
  }

  if (triggerType === "document_missing") {
    return caseDetail.preferredLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، ما زلنا ننتظر بعض المستندات لإكمال الحالة${documentGapSummary ? `: ${documentGapSummary}` : ""}. أرسل ما هو متاح وسنتابع معك مباشرة.`
      : `Hi ${caseDetail.customerName}, we are still waiting on a few documents to keep the case moving${documentGapSummary ? `: ${documentGapSummary}` : ""}. Send what is available and we will continue from there.`;
  }

  return caseDetail.preferredLocale === "ar"
    ? `مرحباً ${caseDetail.customerName}، أتابع معك بخصوص ${caseDetail.projectInterest}. إذا ما زلت مهتماً يمكننا إكمال الخطوة التالية معك هنا على واتساب.`
    : `Hi ${caseDetail.customerName}, following up with you about ${caseDetail.projectInterest}. If you are still interested, we can complete the next step with you here on WhatsApp.`;
}

function buildBlockedNextAction(
  locale: SupportedLocale,
  blockedReason: "missing_phone" | "automation_paused" | "qa_hold" | "client_credentials_pending"
) {
  if (blockedReason === "missing_phone") {
    return locale === "ar" ? "احصل على رقم واتساب صالح قبل متابعة الأتمتة" : "Obtain a valid WhatsApp number before continuing automation";
  }

  if (blockedReason === "automation_paused") {
    return locale === "ar" ? "استأنف الأتمتة قبل تشغيل المتابعة الآلية" : "Resume automation before allowing the agent to act";
  }

  if (blockedReason === "qa_hold") {
    return locale === "ar" ? "انتظر قرار الجودة قبل أي رد آلي" : "Wait for QA before any automated reply";
  }

  return locale === "ar" ? "أكمل تهيئة بيانات مزود واتساب للعميل" : "Complete the client's WhatsApp provider setup";
}

function buildBlockedRationale(
  locale: SupportedLocale,
  blockedReason: "missing_phone" | "automation_paused" | "qa_hold" | "client_credentials_pending"
) {
  if (blockedReason === "missing_phone") {
    return locale === "ar"
      ? "تم حظر الإرسال لأن الحالة لا تحتوي على رقم واتساب صالح."
      : "The send was blocked because the case does not have a valid WhatsApp number.";
  }

  if (blockedReason === "automation_paused") {
    return locale === "ar"
      ? "تم حظر الإرسال لأن الأتمتة متوقفة على هذه الحالة."
      : "The send was blocked because automation is paused for this case.";
  }

  if (blockedReason === "qa_hold") {
    return locale === "ar"
      ? "تم حظر الإرسال لأن الحالة تقع تحت بوابة جودة مفتوحة."
      : "The send was blocked because the case is under an active QA hold.";
  }

  return locale === "ar"
    ? "تم حظر الإرسال لأن مفاتيح مزود واتساب لم تُفعّل بعد لهذا العميل."
    : "The send was blocked because the client's WhatsApp provider credentials are not configured yet.";
}

function summarizeDocumentGaps(caseDetail: PersistedCaseDetail, locale: SupportedLocale) {
  const missingTypes = caseDetail.documentRequests
    .filter((documentRequest) => documentRequest.status !== "accepted")
    .map((documentRequest) => {
      if (locale === "ar") {
        if (documentRequest.type === "government_id") {
          return "الهوية";
        }
        if (documentRequest.type === "proof_of_funds") {
          return "إثبات القدرة المالية";
        }
        return "خطاب العمل";
      }

      if (documentRequest.type === "government_id") {
        return "government ID";
      }
      if (documentRequest.type === "proof_of_funds") {
        return "proof of funds";
      }
      return "employment letter";
    });

  return missingTypes.length > 0 ? missingTypes.join(locale === "ar" ? "، " : ", ") : null;
}

function buildRiskFlags(caseDetail: PersistedCaseDetail) {
  const flags = new Set<string>();
  const textCorpus = [
    caseDetail.message,
    ...caseDetail.auditEvents
      .filter((event) => event.eventType === "whatsapp_inbound_received")
      .map((event) => (typeof event.payload?.textBody === "string" ? event.payload.textBody : ""))
  ]
    .join(" ")
    .toLowerCase();

  if (caseDetail.currentQaReview?.status === "pending_review" || caseDetail.currentQaReview?.status === "follow_up_required") {
    flags.add("qa_hold");
  }

  if (
    textCorpus.includes("lawyer") ||
    textCorpus.includes("legal") ||
    textCorpus.includes("guarantee") ||
    textCorpus.includes("special approval") ||
    textCorpus.includes("discount") ||
    textCorpus.includes("محامي") ||
    textCorpus.includes("قانون") ||
    textCorpus.includes("ضمان") ||
    textCorpus.includes("استثناء")
  ) {
    flags.add("policy_sensitive_lead");
  }

  if (caseDetail.openInterventionsCount > 0) {
    flags.add("existing_manager_intervention");
  }

  if (caseDetail.channelSummary?.latestOutboundStatus === "failed") {
    flags.add("delivery_failure");
  }

  return Array.from(flags);
}

function extractRiskFlagSummary(caseDetail: PersistedCaseDetail) {
  const riskFlags = buildRiskFlags(caseDetail);
  return riskFlags.length > 0 ? riskFlags.join(", ") : null;
}

function readCaseAgentTriggerType(value: unknown): CaseAgentTriggerType | null {
  if (value === "new_lead" || value === "no_response_follow_up" || value === "document_missing") {
    return value;
  }

  return null;
}

function createFutureTimestamp(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}
