import type {
  ApproveHandoverCustomerUpdateInput,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  CreateHandoverBlockerInput,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  MarkHandoverCustomerUpdateDispatchReadyInput,
  ManageCaseFollowUpInput,
  PlanHandoverAppointmentInput,
  RequestCaseQaReviewInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedHandoverCaseDetail,
  QualifyCaseInput,
  ResolveCaseQaReviewInput,
  ResolveHandoverPostCompletionFollowUpInput,
  SaveHandoverArchiveReviewInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
  StartHandoverExecutionInput,
  UpdateAutomationStatusInput,
  UpdateHandoverArchiveStatusInput,
  UpdateHandoverBlockerInput,
  UpdateDocumentRequestInput,
  UpdateHandoverMilestoneInput,
  UpdateHandoverTaskStatusInput
} from "@real-estate-ai/contracts";
import {
  deriveCustomerUpdateStatusFromMilestone,
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

export async function managePersistedCaseFollowUp(
  store: LeadCaptureStore,
  caseId: string,
  input: ManageCaseFollowUpInput
): Promise<PersistedCaseDetail | null> {
  return store.manageCaseFollowUp(caseId, input);
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

  const updatedCustomerUpdates = handoverCase.customerUpdates.map((item) =>
    item.customerUpdateId === customerUpdateId
      ? {
          ...item,
          deliveryPreparedAt: new Date().toISOString(),
          deliverySummary: input.deliverySummary,
          dispatchReadyAt: null,
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

function createFutureTimestamp(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}
