import { randomUUID } from "node:crypto";

import type {
  ApproveHandoverCustomerUpdateInput,
  CaseAgentActionType,
  CaseAgentBlockedReason,
  CaseAgentDecision,
  CaseAgentIntentCategory,
  CaseAgentObjectionCategory,
  CaseAgentRiskLevel,
  CaseAgentRequestedNextStep,
  CaseAgentSentiment,
  CaseAgentTriggerType,
  CaseAgentUrgencyLevel,
  CommercialFactGroundingStatus,
  CommercialFactKind,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  CreateHandoverBlockerInput,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  DocumentTextExtractionSource,
  DocumentTextExtractionStatus,
  DocumentRequestStatus,
  DocumentRequestType,
  DocumentUploadAnalysisRecommendation,
  DocumentUploadAnalysisStatus,
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
  PersistedCommercialFactReference,
  PersistedDocumentUpload,
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
  commercialFactGrounding: CaseAgentFactGrounding;
  conversationIntelligence: CaseConversationIntelligence;
  documentGapSummary: string | null;
  now: string;
  repeatedTriggerCount: number;
  riskFlags: string[];
  triggerType: CaseAgentTriggerType;
}

export interface CaseConversationIntelligence {
  customerSentiment: CaseAgentSentiment | null;
  intentCategory: CaseAgentIntentCategory | null;
  objectionCategories: CaseAgentObjectionCategory[];
  requestedNextStep: CaseAgentRequestedNextStep | null;
  urgencyLevel: CaseAgentUrgencyLevel | null;
}

export interface CaseAgentFactGrounding {
  checkedAt: string;
  references: PersistedCommercialFactReference[];
  requiredKinds: CommercialFactKind[];
  status: CommercialFactGroundingStatus;
  warnings: string[];
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

export interface DocumentUploadAnalysisInput {
  caseDetail: PersistedCaseDetail;
  documentRequest: PersistedCaseDetail["documentRequests"][number];
  extractedTextFailureDetail: string | null;
  extractedTextPreview: string | null;
  extractedTextSource: DocumentTextExtractionSource;
  extractedTextStatus: DocumentTextExtractionStatus;
  now: string;
  upload: PersistedDocumentUpload;
}

export interface DocumentUploadAnalysisDecision {
  confidence: number;
  detectedType: DocumentRequestType | null;
  evidence: string[];
  recommendation: DocumentUploadAnalysisRecommendation;
  summary: string;
}

export interface DocumentUploadAnalysisModelAdapter {
  analyzeDocument(input: DocumentUploadAnalysisInput): Promise<DocumentUploadAnalysisDecision>;
  modelMode: string;
}

const deterministicDocumentUploadAnalysisModelAdapter: DocumentUploadAnalysisModelAdapter = {
  modelMode: "deterministic_document_analysis_v1",
  async analyzeDocument(input) {
    return decideDocumentUploadAnalysisDeterministic(input);
  }
};

export function createDeterministicDocumentUploadAnalysisModelAdapter(): DocumentUploadAnalysisModelAdapter {
  return deterministicDocumentUploadAnalysisModelAdapter;
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
    const commercialFactGrounding = await buildCaseAgentFactGrounding(store, caseDetail, runAt);
    const { decision, modelMode } = await resolveCaseAgentDecision(caseDetail, {
      canSendWhatsApp: input?.canSendWhatsApp ?? false,
      commercialFactGrounding,
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
      commercialFactGroundingStatus: commercialFactGrounding.status,
      commercialFactReferences: commercialFactGrounding.references,
      commercialFactRequiredKinds: commercialFactGrounding.requiredKinds,
      commercialFactWarnings: commercialFactGrounding.warnings,
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

export async function uploadPersistedDocument(
  store: LeadCaptureStore,
  caseId: string,
  documentRequestId: string,
  input: {
    checksumSha256: string;
    documentUploadId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
    uploadedAt: string;
  }
): Promise<PersistedCaseDetail | null> {
  const caseDetail = await store.getCaseDetail(caseId);

  if (!caseDetail) {
    return null;
  }

  const projectedDocumentRequests = caseDetail.documentRequests.map((documentRequest) =>
    documentRequest.documentRequestId === documentRequestId
      ? {
          ...documentRequest,
          latestUpload: {
            analysis: {
              analysisId: input.documentUploadId,
              analyzedAt: null,
              confidencePercent: null,
              detectedType: null,
              evidence: [],
              extractedTextFailureDetail: null,
              extractedTextPreview: null,
              extractedTextSource: "none" as const,
              extractedTextStatus: "not_available" as const,
              providerMode: "queued_pending_analysis",
              recommendation: null,
              status: "pending" as const,
              summary: "Queued for document analysis.",
              updatedAt: input.uploadedAt
            },
            checksumSha256: input.checksumSha256,
            createdAt: input.uploadedAt,
            documentUploadId: input.documentUploadId,
            fileName: input.fileName,
            mimeType: input.mimeType,
            sizeBytes: input.sizeBytes,
            uploadedAt: input.uploadedAt
          },
          status: "under_review" as const,
          uploads: [
            {
              analysis: {
                analysisId: input.documentUploadId,
                analyzedAt: null,
                confidencePercent: null,
                detectedType: null,
                evidence: [],
                extractedTextFailureDetail: null,
                extractedTextPreview: null,
                extractedTextSource: "none" as const,
                extractedTextStatus: "not_available" as const,
                providerMode: "queued_pending_analysis",
                recommendation: null,
                status: "pending" as const,
                summary: "Queued for document analysis.",
                updatedAt: input.uploadedAt
              },
              checksumSha256: input.checksumSha256,
              createdAt: input.uploadedAt,
              documentUploadId: input.documentUploadId,
              fileName: input.fileName,
              mimeType: input.mimeType,
              sizeBytes: input.sizeBytes,
              uploadedAt: input.uploadedAt
            },
            ...documentRequest.uploads
          ]
        }
      : documentRequest
  );

  return store.recordDocumentUpload(caseId, documentRequestId, {
    ...input,
    nextAction: deriveDocumentWorkflowNextAction(projectedDocumentRequests, caseDetail.preferredLocale),
    nextActionDueAt: createFutureTimestamp(12)
  });
}

export async function resolvePersistedDocumentUploadAnalysis(
  store: LeadCaptureStore,
  input: {
    caseDetail: PersistedCaseDetail;
    documentRequestId: string;
    documentUploadId: string;
    extractedTextFailureDetail: string | null;
    extractedTextPreview: string | null;
    extractedTextSource: DocumentTextExtractionSource;
    extractedTextStatus: DocumentTextExtractionStatus;
    modelAdapter?: DocumentUploadAnalysisModelAdapter;
    now?: string;
  }
): Promise<PersistedCaseDetail | null> {
  const now = input.now ?? new Date().toISOString();
  const modelAdapter = input.modelAdapter ?? deterministicDocumentUploadAnalysisModelAdapter;
  const documentRequest = input.caseDetail.documentRequests.find((item) => item.documentRequestId === input.documentRequestId);
  const upload = documentRequest?.uploads.find((item) => item.documentUploadId === input.documentUploadId);

  if (!documentRequest || !upload) {
    return null;
  }

  let decision: DocumentUploadAnalysisDecision;
  let modelMode = modelAdapter.modelMode;

  try {
    decision = await modelAdapter.analyzeDocument({
      caseDetail: input.caseDetail,
      documentRequest,
      extractedTextFailureDetail: input.extractedTextFailureDetail,
      extractedTextPreview: input.extractedTextPreview,
      extractedTextSource: input.extractedTextSource,
      extractedTextStatus: input.extractedTextStatus,
      now,
      upload
    });
  } catch {
    decision = decideDocumentUploadAnalysisDeterministic({
      caseDetail: input.caseDetail,
      documentRequest,
      extractedTextFailureDetail: input.extractedTextFailureDetail,
      extractedTextPreview: input.extractedTextPreview,
      extractedTextSource: input.extractedTextSource,
      extractedTextStatus: input.extractedTextStatus,
      now,
      upload
    });
    modelMode =
      modelAdapter.modelMode === deterministicDocumentUploadAnalysisModelAdapter.modelMode
        ? deterministicDocumentUploadAnalysisModelAdapter.modelMode
        : `${modelAdapter.modelMode}_fallback`;
  }

  const resolvedAnalysis = applyDocumentUploadAnalysisGuardrails(input.caseDetail, documentRequest, {
    decision,
    extractedTextFailureDetail: input.extractedTextFailureDetail,
    extractedTextPreview: input.extractedTextPreview,
    extractedTextSource: input.extractedTextSource,
    extractedTextStatus: input.extractedTextStatus,
    modelMode,
    now
  });
  const projectedDocumentRequests = input.caseDetail.documentRequests.map((currentRequest) =>
    currentRequest.documentRequestId === input.documentRequestId
      ? {
          ...currentRequest,
          latestUpload:
            currentRequest.latestUpload?.documentUploadId === input.documentUploadId
              ? {
                  ...currentRequest.latestUpload,
                  analysis: resolvedAnalysis.analysis
                }
              : currentRequest.latestUpload,
          status: resolvedAnalysis.uploadStatus,
          uploads: currentRequest.uploads.map((currentUpload) =>
            currentUpload.documentUploadId === input.documentUploadId
              ? {
                  ...currentUpload,
                  analysis: resolvedAnalysis.analysis
                }
              : currentUpload
          )
        }
      : currentRequest
  );

  return store.saveDocumentUploadAnalysis(input.caseDetail.caseId, input.documentRequestId, input.documentUploadId, {
    analyzedAt: resolvedAnalysis.analysis.analyzedAt,
    confidencePercent: resolvedAnalysis.analysis.confidencePercent,
    detectedType: resolvedAnalysis.analysis.detectedType,
    evidence: resolvedAnalysis.analysis.evidence,
    extractedTextFailureDetail: resolvedAnalysis.analysis.extractedTextFailureDetail,
    extractedTextPreview: resolvedAnalysis.analysis.extractedTextPreview,
    extractedTextSource: resolvedAnalysis.analysis.extractedTextSource,
    extractedTextStatus: resolvedAnalysis.analysis.extractedTextStatus,
    nextAction: deriveDocumentWorkflowNextAction(projectedDocumentRequests, input.caseDetail.preferredLocale),
    nextActionDueAt: resolvedAnalysis.nextActionDueAt,
    providerMode: resolvedAnalysis.analysis.providerMode,
    queueDocumentMissingTrigger: resolvedAnalysis.queueDocumentMissingTrigger,
    recommendation: resolvedAnalysis.analysis.recommendation,
    status: resolvedAnalysis.analysis.status,
    summary: resolvedAnalysis.analysis.summary,
    updatedAt: now,
    uploadAnalysisId: resolvedAnalysis.analysis.analysisId,
    uploadStatus: resolvedAnalysis.uploadStatus
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

function applyDocumentUploadAnalysisGuardrails(
  caseDetail: PersistedCaseDetail,
  documentRequest: PersistedCaseDetail["documentRequests"][number],
  input: {
    decision: DocumentUploadAnalysisDecision;
    extractedTextFailureDetail: string | null;
    extractedTextPreview: string | null;
    extractedTextSource: DocumentTextExtractionSource;
    extractedTextStatus: DocumentTextExtractionStatus;
    modelMode: string;
    now: string;
  }
) {
  const confidencePercent = Math.max(0, Math.min(100, Math.round(input.decision.confidence * 100)));
  const safeEvidence = input.decision.evidence.filter(Boolean).slice(0, 4);
  const recommendation =
    input.decision.detectedType && input.decision.detectedType !== documentRequest.type && input.decision.recommendation === "accept"
      ? "request_reupload"
      : input.decision.recommendation;
  const canAutoAccept =
    recommendation === "accept" &&
    confidencePercent >= 97 &&
    Boolean(input.extractedTextPreview && input.extractedTextPreview.length >= 80) &&
    documentRequest.latestUpload?.mimeType === "application/pdf" &&
    input.decision.detectedType === documentRequest.type;
  const canAutoReject = recommendation === "request_reupload" && confidencePercent >= 90;
  const status: DocumentUploadAnalysisStatus = canAutoAccept || canAutoReject ? "completed" : "manual_review_required";
  const uploadStatus: DocumentRequestStatus = canAutoAccept ? "accepted" : canAutoReject ? "rejected" : "under_review";

  return {
    analysis: {
      analysisId: randomAnalysisId(),
      analyzedAt: input.now,
      confidencePercent,
      detectedType: input.decision.detectedType,
      evidence: safeEvidence,
      extractedTextFailureDetail: input.extractedTextFailureDetail,
      extractedTextPreview: input.extractedTextPreview,
      extractedTextSource: input.extractedTextSource,
      extractedTextStatus: input.extractedTextStatus,
      providerMode: input.modelMode,
      recommendation,
      status,
      summary: input.decision.summary,
      updatedAt: input.now
    },
    nextActionDueAt: createFutureTimestamp(canAutoReject ? 1 : canAutoAccept ? 4 : 12),
    queueDocumentMissingTrigger: canAutoReject,
    uploadStatus
  };
}

function decideDocumentUploadAnalysisDeterministic(input: DocumentUploadAnalysisInput): DocumentUploadAnalysisDecision {
  const expectedLabel = getDocumentTypeLabel(input.caseDetail.preferredLocale, input.documentRequest.type);

  if (input.extractedTextStatus === "failed") {
    return {
      confidence: 0.6,
      detectedType: null,
      evidence: [
        input.extractedTextFailureDetail ??
          (input.caseDetail.preferredLocale === "ar"
            ? "تعذر استخراج نص قابل للاستخدام من الملف."
            : "The worker could not extract usable text from the file.")
      ],
      recommendation: "manual_review",
      summary:
        input.caseDetail.preferredLocale === "ar"
          ? `تم حفظ ${expectedLabel} لكن استخراج النص فشل، لذلك تحتاج الحالة مراجعة بشرية.`
          : `The ${expectedLabel} was stored, but text extraction failed, so it needs human review.`
    };
  }

  if (input.upload.sizeBytes < 2048) {
    return {
      confidence: 0.99,
      detectedType: null,
      evidence: [
        input.caseDetail.preferredLocale === "ar" ? "حجم الملف صغير جداً للمراجعة" : "The file size is too small to review safely."
      ],
      recommendation: "request_reupload",
      summary:
        input.caseDetail.preferredLocale === "ar"
          ? `الملف المرفوع يبدو صغيراً أو غير صالح. اطلب نسخة أوضح من ${expectedLabel}.`
          : `The uploaded file looks too small or incomplete. Ask for a clearer ${expectedLabel}.`
    };
  }

  const signalSummary = detectDocumentSignals(`${input.upload.fileName} ${input.extractedTextPreview ?? ""}`);
  const expectedScore = signalSummary.expectedScoreByType.get(input.documentRequest.type) ?? 0;
  const expectedKeywords = signalSummary.expectedKeywordsByType.get(input.documentRequest.type) ?? [];
  const strongestOtherSignal = signalSummary.strongestOtherType;

  if (
    strongestOtherSignal &&
    strongestOtherSignal.type !== input.documentRequest.type &&
    strongestOtherSignal.score >= 2 &&
    expectedScore === 0
  ) {
    return {
      confidence: 0.95,
      detectedType: strongestOtherSignal.type,
      evidence: [
        buildSignalEvidence(input.caseDetail.preferredLocale, strongestOtherSignal.type, strongestOtherSignal.keywords),
        input.caseDetail.preferredLocale === "ar"
          ? `المطلوب: ${expectedLabel}`
          : `Expected: ${expectedLabel}`
      ],
      recommendation: "request_reupload",
      summary:
        input.caseDetail.preferredLocale === "ar"
          ? `الملف المرفوع يبدو أقرب إلى ${getDocumentTypeLabel(input.caseDetail.preferredLocale, strongestOtherSignal.type)} وليس ${expectedLabel}.`
          : `The uploaded file looks closer to ${getDocumentTypeLabel(input.caseDetail.preferredLocale, strongestOtherSignal.type)} than ${expectedLabel}.`
    };
  }

  if (
    input.upload.mimeType === "application/pdf" &&
    expectedScore >= 2 &&
    signalSummary.competingScore === 0 &&
    Boolean(input.extractedTextPreview && input.extractedTextPreview.length >= 80)
  ) {
    return {
      confidence: 0.97,
      detectedType: input.documentRequest.type,
      evidence: [
        buildSignalEvidence(input.caseDetail.preferredLocale, input.documentRequest.type, expectedKeywords),
        input.caseDetail.preferredLocale === "ar"
          ? "تم العثور على إشارات نصية قوية داخل الملف."
          : "Strong text signals were found inside the file."
      ],
      recommendation: "accept",
      summary:
        input.caseDetail.preferredLocale === "ar"
          ? `الملف النصي يطابق على الأرجح ${expectedLabel} ويمكن قبوله تلقائياً.`
          : `The text-based file strongly matches ${expectedLabel} and can be auto-accepted.`
    };
  }

  if (expectedScore >= 1 && signalSummary.competingScore === 0) {
    return {
      confidence: input.upload.mimeType === "application/pdf" ? 0.84 : 0.74,
      detectedType: input.documentRequest.type,
      evidence: [
        buildSignalEvidence(input.caseDetail.preferredLocale, input.documentRequest.type, expectedKeywords),
        input.upload.mimeType.startsWith("image/")
          ? input.caseDetail.preferredLocale === "ar"
            ? "الملف صورة ويحتاج OCR أو مراجعة بشرية قبل الاعتماد."
            : "The upload is an image and still needs OCR or human review before approval."
          : input.caseDetail.preferredLocale === "ar"
            ? "الإشارات الحالية غير كافية للقبول التلقائي."
            : "The current signals are not strong enough for auto-accept."
      ],
      recommendation: "manual_review",
      summary:
        input.caseDetail.preferredLocale === "ar"
          ? `الملف يبدو قريباً من ${expectedLabel} لكنه يحتاج مراجعة بشرية قبل الاعتماد.`
          : `The upload likely matches ${expectedLabel}, but it still needs human review.`
    };
  }

  return {
    confidence: 0.68,
    detectedType: null,
    evidence: [
      input.caseDetail.preferredLocale === "ar"
        ? "لم يتم العثور على إشارات كافية لقرار تلقائي آمن."
        : "Not enough strong signals were found for a safe automated decision."
    ],
    recommendation: "manual_review",
    summary:
      input.caseDetail.preferredLocale === "ar"
        ? `تم حفظ الملف لكن القرار الآلي غير واثق بما يكفي. راجع ${expectedLabel} يدوياً.`
        : `The file was stored, but automation is not confident enough yet. Review the ${expectedLabel} manually.`
  };
}

function buildSignalEvidence(locale: SupportedLocale, type: DocumentRequestType, keywords: string[]) {
  const signalText = keywords.slice(0, 3).join(locale === "ar" ? "، " : ", ");

  if (signalText.length === 0) {
    return locale === "ar"
      ? `تمت مطابقة الملف مع ${getDocumentTypeLabel(locale, type)}.`
      : `The upload matches ${getDocumentTypeLabel(locale, type)}.`;
  }

  return locale === "ar"
    ? `إشارات مطابقة ${getDocumentTypeLabel(locale, type)}: ${signalText}`
    : `${getDocumentTypeLabel(locale, type)} signals: ${signalText}`;
}

function detectDocumentSignals(value: string) {
  const corpus = value.toLowerCase();
  const signalMap = {
    employment_letter: ["employment", "employer", "hr", "salary", "job title", "offer letter", "خطاب", "وظيفة", "راتب"],
    government_id: ["passport", "national id", "identity", "iqama", "passport no", "هوية", "جواز", "إقامة"],
    proof_of_funds: ["bank", "statement", "balance", "funds", "iban", "account", "كشف", "رصيد", "حساب"]
  } satisfies Record<DocumentRequestType, string[]>;
  const entries = (Object.entries(signalMap) as Array<[DocumentRequestType, string[]]>).map(([type, keywords]) => {
    const matchedKeywords = keywords.filter((keyword) => corpus.includes(keyword));

    return {
      keywords: matchedKeywords,
      score: matchedKeywords.length,
      type
    };
  });
  const [topEntry, secondEntry] = [...entries].sort((left, right) => right.score - left.score);

  return {
    competingScore: secondEntry?.score ?? 0,
    expectedKeywordsByType: new Map(entries.map((entry) => [entry.type, entry.keywords])),
    expectedScoreByType: new Map(entries.map((entry) => [entry.type, entry.score])),
    strongestOtherType: topEntry?.score ? topEntry : null
  };
}

function getDocumentTypeLabel(locale: SupportedLocale, type: DocumentRequestType) {
  if (locale === "ar") {
    if (type === "government_id") {
      return "الهوية";
    }

    if (type === "proof_of_funds") {
      return "إثبات القدرة المالية";
    }

    return "خطاب العمل";
  }

  if (type === "government_id") {
    return "government ID";
  }

  if (type === "proof_of_funds") {
    return "proof of funds";
  }

  return "employment letter";
}

function randomAnalysisId() {
  return randomUUID();
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
  const latestInboundMessage = getLatestInboundMessage(caseDetail);
  const conversationIntelligence = analyzeConversationIntelligence(caseDetail, latestInboundMessage);
  const latestIntentSummary = latestInboundMessage ? latestInboundMessage.slice(0, 280) : caseDetail.message.slice(0, 280);
  const lastObjectionSummary = summarizeLatestObjection(caseDetail, latestInboundMessage, conversationIntelligence);
  const qualificationSummary = caseDetail.qualificationSnapshot
    ? `${caseDetail.qualificationSnapshot.readiness} | ${caseDetail.qualificationSnapshot.budgetBand} | ${caseDetail.qualificationSnapshot.moveInTimeline}`
    : null;
  const documentGapSummary = summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale);

  return {
    activeRiskFlags: buildRiskFlags(caseDetail, conversationIntelligence),
    customerSentiment: conversationIntelligence.customerSentiment,
    documentGapSummary,
    lastDecisionSummary: input.decisionSummary,
    lastInboundAt: caseDetail.channelSummary?.lastInboundAt ?? caseDetail.agentMemory?.lastInboundAt ?? null,
    lastIntentCategory: conversationIntelligence.intentCategory,
    lastObjectionSummary,
    objectionCategories: conversationIntelligence.objectionCategories,
    lastSuccessfulOutboundAt:
      caseDetail.channelSummary?.latestOutboundStatus === "sent" || caseDetail.channelSummary?.latestOutboundStatus === "delivered"
        ? caseDetail.channelSummary.latestOutboundUpdatedAt
        : caseDetail.agentMemory?.lastSuccessfulOutboundAt ?? null,
    latestIntentSummary,
    qualificationSummary,
    requestedNextStep: conversationIntelligence.requestedNextStep,
    responseUrgency: conversationIntelligence.urgencyLevel,
    updatedAt: input.now
  };
}

async function resolveCaseAgentDecision(
  caseDetail: PersistedCaseDetail,
  input: {
    canSendWhatsApp: boolean;
    commercialFactGrounding: CaseAgentFactGrounding;
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

  const conversationIntelligence = analyzeConversationIntelligence(caseDetail);
  const riskFlags = buildRiskFlags(caseDetail, conversationIntelligence);
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
    commercialFactGrounding: input.commercialFactGrounding,
    conversationIntelligence,
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
        commercialFactGrounding: input.commercialFactGrounding,
        conversationIntelligence,
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
  const { conversationIntelligence, documentGapSummary, repeatedTriggerCount, riskFlags, triggerType } = input;
  const latestInboundMessage = getLatestInboundMessage(caseDetail);
  const responseLocale = getCaseResponseLocale(caseDetail, latestInboundMessage);
  const requestedNextStep = conversationIntelligence.requestedNextStep;
  const customerSentiment = conversationIntelligence.customerSentiment;
  const urgencyLevel = conversationIntelligence.urgencyLevel;
  const objectionCategories = conversationIntelligence.objectionCategories;
  const needsPricingClarification = requestedNextStep === "share_pricing" || objectionCategories.includes("pricing");
  const needsHumanToneReview = customerSentiment === "frustrated" || objectionCategories.includes("trust");
  const nextTouchHours =
    urgencyLevel === "high" || requestedNextStep === "human_callback"
      ? 1
      : requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call"
        ? 2
        : requestedNextStep === "review_documents"
          ? 4
          : 6;

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

    if (needsHumanToneReview) {
      return {
        actionType: "create_reply_draft",
        blockedReason: null,
        confidence: 0.85,
        escalationReason: null,
        proposedMessage: buildTriggerMessage("new_lead", caseDetail, documentGapSummary, conversationIntelligence),
        proposedNextAction:
          responseLocale === "ar"
            ? "راجع مسودة الرد الأول قبل المتابعة مع العميل"
            : "Review the first-reply draft before continuing with the customer",
        proposedNextActionDueAt: createFutureTimestamp(2),
        rationaleSummary:
          responseLocale === "ar"
            ? "تم خفض الرد الأول إلى مسودة لأن العميل يحمل إشارة حساسة في النبرة أو الثقة."
            : "Downgraded the first reply to a draft because the customer shows tone or trust signals that need human review.",
        riskLevel: "medium",
        status: "waiting",
        toolExecutionStatus: "executed",
        triggerType
      };
    }

    return {
      actionType: "send_whatsapp_message",
      blockedReason: null,
      confidence: 0.94,
      escalationReason: null,
      proposedMessage: buildTriggerMessage("new_lead", caseDetail, documentGapSummary, conversationIntelligence),
      proposedNextAction:
        requestedNextStep === "human_callback" || requestedNextStep === "schedule_call"
          ? responseLocale === "ar"
            ? "أكد وقت المكالمة الأنسب ثم واصل التأهيل على واتساب"
            : "Confirm the best callback time, then continue qualification on WhatsApp"
          : requestedNextStep === "share_pricing"
            ? responseLocale === "ar"
              ? "أكد الميزانية ونوع الوحدة قبل مشاركة التفاصيل المناسبة"
              : "Confirm budget and unit type before sharing the right pricing details"
            : responseLocale === "ar"
              ? "انتظر رد العميل وواصل التأهيل على واتساب"
              : "Wait for the customer reply and continue qualification on WhatsApp",
      proposedNextActionDueAt: createFutureTimestamp(nextTouchHours),
      rationaleSummary:
        needsPricingClarification
          ? responseLocale === "ar"
            ? "العميل منخفض المخاطر لكنه يحتاج توضيحاً منظماً للتسعير قبل التقدم."
            : "The lead is low-risk but needs a structured pricing clarification before progressing."
          : responseLocale === "ar"
            ? "العميل جديد والمحتوى منخفض المخاطر، لذلك يمكن إرسال أول رد تلقائي آمن."
            : "The lead is new and low-risk, so the first reply can be sent automatically.",
      riskLevel: "low",
      status: "completed",
      toolExecutionStatus: "queued",
      triggerType
    };
  }

  if (triggerType === "inbound_customer_message") {
    if (riskFlags.includes("policy_sensitive_lead")) {
      return {
        actionType: "request_manager_intervention",
        blockedReason: null,
        confidence: 0.9,
        escalationReason:
          responseLocale === "ar"
            ? "رسالة العميل تحتوي على طلب حساس أو استثناء وتحتاج قراراً بشرياً قبل أي رد."
            : "The customer message contains a sensitive request or exception and needs a human decision before any reply.",
        proposedMessage: null,
        proposedNextAction:
          responseLocale === "ar"
            ? "راجع الرسالة وحدد الرد أو مسار الاستثناء المناسب"
            : "Review the message and decide the correct reply or exception path",
        proposedNextActionDueAt: createFutureTimestamp(2),
        rationaleSummary:
          responseLocale === "ar"
            ? "تم التصعيد لأن الرسالة الواردة تتجاوز حدود الرد الآلي الآمن."
            : "Escalated because the inbound message exceeds the safe automated-reply boundary.",
        riskLevel: "high",
        status: "escalated",
        toolExecutionStatus: "executed",
        triggerType
      };
    }

    if (needsHumanToneReview) {
      return {
        actionType: "create_reply_draft",
        blockedReason: null,
        confidence: 0.84,
        escalationReason: null,
        proposedMessage: buildTriggerMessage(triggerType, caseDetail, documentGapSummary, conversationIntelligence),
        proposedNextAction:
          responseLocale === "ar"
            ? "راجع مسودة الرد قبل تهدئة العميل ومتابعة الحالة"
            : "Review the reply draft before de-escalating the customer and continuing the case",
        proposedNextActionDueAt: createFutureTimestamp(2),
        rationaleSummary:
          objectionCategories.includes("trust")
            ? responseLocale === "ar"
              ? "تم خفض القرار إلى مسودة لأن العميل يحمل مخاوف ثقة أو قانونية تتطلب مراجعة بشرية."
              : "Downgraded to a draft because the customer raised trust or legal concerns that need human review."
            : responseLocale === "ar"
              ? "تم خفض القرار إلى مسودة لأن لهجة العميل متوترة وتحتاج مراجعة بشرية سريعة."
              : "Downgraded to a draft because the customer tone is tense and needs quick human review.",
        riskLevel: "medium",
        status: "waiting",
        toolExecutionStatus: "executed",
        triggerType
      };
    }

    return {
      actionType: "send_whatsapp_message",
      blockedReason: null,
      confidence: 0.92,
      escalationReason: null,
      proposedMessage: buildTriggerMessage(triggerType, caseDetail, documentGapSummary, conversationIntelligence),
      proposedNextAction:
        requestedNextStep === "review_documents"
          ? responseLocale === "ar"
            ? "راجع المستندات الواردة وأكد للعميل أي عناصر إضافية إذا لزم الأمر"
            : "Review the incoming documents and confirm any additional items if needed"
          : requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call" || requestedNextStep === "human_callback"
            ? responseLocale === "ar"
              ? "ثبّت وقت الخطوة التالية مع العميل"
              : "Confirm the timing for the next step with the customer"
            : needsPricingClarification
              ? responseLocale === "ar"
                ? "أكد الميزانية ونوع الوحدة قبل مشاركة أي تفاصيل تسعير"
                : "Confirm budget and unit type before sharing any pricing details"
              : responseLocale === "ar"
                ? "تابع التأهيل بناءً على آخر رسالة واردة من العميل"
                : "Continue qualification based on the customer's latest inbound message",
      proposedNextActionDueAt: createFutureTimestamp(nextTouchHours),
      rationaleSummary:
        requestedNextStep === "review_documents"
          ? responseLocale === "ar"
            ? "رسالة العميل تتعلق بالمستندات ويمكن الرد عليها تلقائياً مع متابعة سريعة للمراجعة."
            : "The customer's message is about documents and can be answered automatically with a quick review follow-up."
          : requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call" || requestedNextStep === "human_callback"
            ? responseLocale === "ar"
              ? "رسالة العميل تركز على الخطوة التالية المباشرة ويمكن الرد عليها تلقائياً لتثبيت التقدم."
              : "The customer's message is focused on the next concrete step and can be answered automatically to keep momentum."
            : needsPricingClarification
              ? responseLocale === "ar"
                ? "العميل يطلب معلومات تسعير غير استثنائية ويمكن الرد بأمان مع طلب توضيح إضافي."
                : "The customer is asking for non-exception pricing information and can be answered safely with clarification."
              : responseLocale === "ar"
                ? "الرسالة الواردة منخفضة المخاطر ويمكن الرد عليها تلقائياً لمواصلة التقدم."
                : "The inbound message is low-risk and can be answered automatically to keep progress moving.",
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
      proposedMessage: buildTriggerMessage("document_missing", caseDetail, documentGapSummary, conversationIntelligence),
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
    proposedMessage: buildTriggerMessage("no_response_follow_up", caseDetail, documentGapSummary, conversationIntelligence),
    proposedNextAction:
      requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call" || requestedNextStep === "human_callback"
        ? responseLocale === "ar"
          ? "انتظر تأكيد الموعد التالي أو صعد الحالة إذا استمر الصمت"
          : "Wait for the next appointment confirmation or escalate if silence continues"
        : needsPricingClarification
          ? responseLocale === "ar"
            ? "انتظر رد العميل لتوضيح الميزانية أو صعد الحالة إذا استمر الصمت"
            : "Wait for the customer to clarify budget or escalate if silence continues"
          : responseLocale === "ar"
            ? "انتظر الرد التالي أو صعد الحالة إذا استمر الصمت"
            : "Wait for the next reply or escalate if the customer stays silent",
    proposedNextActionDueAt: createFutureTimestamp(urgencyLevel === "high" ? 12 : 24),
    rationaleSummary:
      requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call" || requestedNextStep === "human_callback"
        ? responseLocale === "ar"
          ? "المتابعة مستحقة على خطوة مباشرة، لذلك أرسل تذكيراً قصيراً يركز على الموعد التالي."
          : "The follow-up is due on a concrete next step, so a short reminder focused on the next appointment is appropriate."
        : needsPricingClarification
          ? responseLocale === "ar"
            ? "المتابعة مستحقة ويمكن تذكير العميل بأمان بتوضيح الميزانية أو الوحدة المطلوبة."
            : "The follow-up is due and it is safe to remind the customer to clarify budget or unit preference."
          : responseLocale === "ar"
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
    commercialFactGrounding: CaseAgentFactGrounding;
    conversationIntelligence: CaseConversationIntelligence;
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
      commercialFactGrounding: input.commercialFactGrounding,
      conversationIntelligence: input.conversationIntelligence,
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
      commercialFactGrounding: input.commercialFactGrounding,
      conversationIntelligence: input.conversationIntelligence,
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

  if (input.triggerType === "inbound_customer_message" && input.riskFlags.includes("policy_sensitive_lead")) {
    return buildEscalatedDecision(caseDetail, {
      confidence: Math.max(decision.confidence, 0.9),
      escalationReason:
        caseDetail.preferredLocale === "ar"
          ? "رسالة العميل تحتوي على طلب حساس أو استثناء وتحتاج قراراً بشرياً قبل أي رد."
          : "The customer message contains a sensitive request or exception and needs a human decision before any reply.",
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "تم تصعيد الحالة لأن الرسالة الواردة تتجاوز حدود الرد الآلي الآمن."
          : "Escalated because the inbound message exceeds the safe automated-reply boundary.",
      riskLevel: "high",
      triggerType: input.triggerType
    });
  }

  if (
    input.triggerType === "inbound_customer_message" &&
    (input.riskFlags.includes("frustrated_customer_language") ||
      input.conversationIntelligence.objectionCategories.includes("trust")) &&
    decision.actionType === "send_whatsapp_message"
  ) {
    return {
      actionType: "create_reply_draft",
      blockedReason: null,
      confidence: Math.max(decision.confidence, 0.84),
      escalationReason: null,
      proposedMessage: decision.proposedMessage,
      proposedNextAction:
        caseDetail.preferredLocale === "ar"
          ? "راجع مسودة الرد قبل تهدئة العميل ومتابعة الحالة"
          : "Review the reply draft before de-escalating the customer and continuing the case",
      proposedNextActionDueAt: createFutureTimestamp(2),
      rationaleSummary:
        input.conversationIntelligence.objectionCategories.includes("trust")
          ? caseDetail.preferredLocale === "ar"
            ? "تم خفض القرار إلى مسودة لأن الرسالة تحمل اعتراض ثقة أو قانون يحتاج مراجعة بشرية."
            : "Downgraded to a draft because the message includes a trust or legal concern that needs human review."
          : caseDetail.preferredLocale === "ar"
            ? "تم خفض القرار إلى مسودة لأن لهجة العميل متوترة وتحتاج مراجعة بشرية سريعة."
            : "Downgraded to a draft because the customer tone is tense and needs quick human review.",
      riskLevel: "medium",
      status: "waiting",
      toolExecutionStatus: "executed",
      triggerType: input.triggerType
    };
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

  const outboundCommitmentRisk =
    decision.actionType === "send_whatsapp_message" && decision.proposedMessage
      ? analyzeOutboundCommitmentRisk(decision.proposedMessage)
      : null;

  if (outboundCommitmentRisk?.unsafeCommitment) {
    return buildEscalatedDecision(caseDetail, {
      confidence: Math.max(decision.confidence, 0.91),
      escalationReason:
        caseDetail.preferredLocale === "ar"
          ? "الرد المقترح يحتوي على وعد تجاري أو قانوني يحتاج موافقة بشرية قبل الإرسال."
          : "The proposed reply contains a commercial or legal commitment that needs human approval before send.",
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? "أوقفت بوابة الحقائق التجارية الإرسال لأن الرسالة تحمل وعداً لا يجوز إرساله من دون اعتماد صريح."
          : "The commercial fact boundary stopped the send because the message carries a promise that requires explicit approval.",
      riskLevel: "high",
      triggerType: input.triggerType
    });
  }

  if (
    outboundCommitmentRisk?.requiresGrounding &&
    input.commercialFactGrounding.status === "missing_required_evidence"
  ) {
    return {
      ...decision,
      actionType: "create_reply_draft",
      escalationReason: null,
      rationaleSummary:
        caseDetail.preferredLocale === "ar"
          ? `تم خفض الرد إلى مسودة لأن ${input.commercialFactGrounding.warnings.join("، ")}.`
          : `Downgraded to a draft because ${input.commercialFactGrounding.warnings.join(", ")}.`,
      riskLevel: "medium",
      status: "waiting",
      toolExecutionStatus: "executed"
    };
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
      summarizeDocumentGaps(caseDetail, caseDetail.preferredLocale),
      analyzeConversationIntelligence(caseDetail)
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
        : input.triggerType === "inbound_customer_message"
        ? caseDetail.preferredLocale === "ar"
          ? "راجع رسالة العميل وحدد الرد أو الاستثناء المناسب قبل المتابعة"
          : "Review the customer message and decide the correct reply or exception path before proceeding"
        : input.triggerType === "document_missing"
        ? caseDetail.preferredLocale === "ar"
          ? "راجع التعثر مع العميل وحدد ما إذا كان يجب إعادة التعيين أو الإغلاق"
          : "Review the stall with the customer and decide whether to reassign or close the case"
        : caseDetail.preferredLocale === "ar"
          ? "قرر التصعيد أو إعادة التعيين أو الإغلاق بناءً على صمت العميل"
          : "Decide whether to escalate, reassign, or close based on the continued silence",
    proposedNextActionDueAt: createFutureTimestamp(
      input.triggerType === "new_lead" ? 1 : input.triggerType === "inbound_customer_message" ? 2 : 6
    ),
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
  documentGapSummary: string | null,
  conversationIntelligence: CaseConversationIntelligence
) {
  const latestInboundMessage = getLatestInboundMessage(caseDetail);
  const responseLocale = getCaseResponseLocale(caseDetail, latestInboundMessage);
  const requestedNextStep = conversationIntelligence.requestedNextStep;
  const customerSentiment = conversationIntelligence.customerSentiment;
  const acknowledgeDelay =
    conversationIntelligence.objectionCategories.includes("responsiveness") && triggerType === "inbound_customer_message";

  if (triggerType === "new_lead") {
    if (requestedNextStep === "human_callback" || requestedNextStep === "schedule_call") {
      return responseLocale === "ar"
        ? `مرحباً ${caseDetail.customerName}، استلمنا اهتمامك بمشروع ${caseDetail.projectInterest}. يمكننا ترتيب مكالمة مناسبة لك ومتابعة التفاصيل معك مباشرة على واتساب.`
        : `Hi ${caseDetail.customerName}, we received your interest in ${caseDetail.projectInterest}. We can arrange a suitable call and continue the details with you directly on WhatsApp.`;
    }

    if (requestedNextStep === "share_pricing") {
      return responseLocale === "ar"
        ? `مرحباً ${caseDetail.customerName}، استلمنا اهتمامك بمشروع ${caseDetail.projectInterest}. شاركني الميزانية أو نوع الوحدة المطلوب وسأتابع معك الخيارات المناسبة هنا على واتساب.`
        : `Hi ${caseDetail.customerName}, we received your interest in ${caseDetail.projectInterest}. Share your budget or preferred unit type and I will continue with the suitable options here on WhatsApp.`;
    }

    return responseLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، استلمنا اهتمامك بمشروع ${caseDetail.projectInterest}. يمكننا متابعة التفاصيل المناسبة لك هنا على واتساب متى كان ذلك مناسباً.`
      : `Hi ${caseDetail.customerName}, we received your interest in ${caseDetail.projectInterest}. We can continue the next suitable details with you here on WhatsApp whenever you're ready.`;
  }

  if (triggerType === "inbound_customer_message") {
    if (requestedNextStep === "review_documents") {
      return responseLocale === "ar"
        ? `شكراً ${caseDetail.customerName}، استلمت رسالتك بخصوص المستندات. سنراجع ما ترسله ونخبرك مباشرة إذا احتجنا أي عنصر إضافي.`
        : `Thanks ${caseDetail.customerName}, I received your message about the documents. We will review what you send and let you know directly if anything else is needed.`;
    }

    if (requestedNextStep === "send_documents") {
      return responseLocale === "ar"
        ? `شكراً ${caseDetail.customerName}، يمكننا إكمال هذه الخطوة فور استلام المستندات المطلوبة${documentGapSummary ? `: ${documentGapSummary}` : ""}. أرسل ما هو متاح وسأتابع معك مباشرة.`
        : `Thanks ${caseDetail.customerName}, we can move this forward as soon as we receive the required documents${documentGapSummary ? `: ${documentGapSummary}` : ""}. Send what is available and I will continue directly with you.`;
    }

    if (requestedNextStep === "schedule_visit") {
      return responseLocale === "ar"
        ? `شكراً ${caseDetail.customerName}، يمكننا ترتيب الزيارة التالية حسب الوقت المناسب لك. أرسل اليوم أو الوقت الأنسب وسننسق معك مباشرة.`
        : `Thanks ${caseDetail.customerName}, we can arrange the next visit based on the time that suits you. Share the best day or time and we will coordinate directly.`;
    }

    if (requestedNextStep === "schedule_call" || requestedNextStep === "human_callback") {
      return responseLocale === "ar"
        ? `شكراً ${caseDetail.customerName}، يمكننا ترتيب مكالمة في الوقت المناسب لك. أرسل الوقت الأنسب وسنتابع معك مباشرة.`
        : `Thanks ${caseDetail.customerName}, we can arrange a call at the time that suits you. Share the best time and we will follow up directly.`;
    }

    if (requestedNextStep === "share_pricing") {
      return responseLocale === "ar"
        ? `شكراً ${caseDetail.customerName}، يسعدني متابعة الخيارات المناسبة لك. شاركني الميزانية أو نوع الوحدة المطلوب وسأوضح لك التفاصيل المتاحة هنا على واتساب.`
        : `Thanks ${caseDetail.customerName}, I can help narrow the right options for you. Share your budget or preferred unit type and I will outline the suitable details here on WhatsApp.`;
    }

    return responseLocale === "ar"
      ? `${acknowledgeDelay ? "شكراً على صبرك، " : ""}استلمت رسالتك يا ${caseDetail.customerName} وسأتابع معك هنا على واتساب بالخطوة المناسبة التالية${customerSentiment === "urgent" ? " بأولوية سريعة" : ""}.`
      : `${acknowledgeDelay ? "Thanks for your patience, " : ""}I received your message, ${caseDetail.customerName}, and will continue with you here on WhatsApp with the next suitable step${customerSentiment === "urgent" ? " as a priority" : ""}.`;
  }

  if (triggerType === "document_missing") {
    return responseLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، ما زلنا ننتظر بعض المستندات لإكمال الحالة${documentGapSummary ? `: ${documentGapSummary}` : ""}. أرسل ما هو متاح وسنتابع معك مباشرة.`
      : `Hi ${caseDetail.customerName}, we are still waiting on a few documents to keep the case moving${documentGapSummary ? `: ${documentGapSummary}` : ""}. Send what is available and we will continue from there.`;
  }

  if (requestedNextStep === "schedule_visit" || requestedNextStep === "schedule_call" || requestedNextStep === "human_callback") {
    return responseLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، أتابع معك بخصوص ${caseDetail.projectInterest}. إذا ما زلت مهتماً يمكننا تثبيت الموعد التالي معك مباشرة على واتساب.`
      : `Hi ${caseDetail.customerName}, following up with you about ${caseDetail.projectInterest}. If you are still interested, we can lock the next appointment with you directly on WhatsApp.`;
  }

  if (requestedNextStep === "share_pricing") {
    return responseLocale === "ar"
      ? `مرحباً ${caseDetail.customerName}، أتابع معك بخصوص ${caseDetail.projectInterest}. إذا رغبت نكمل من هنا بتحديد الميزانية أو نوع الوحدة حتى نشاركك الخيارات الأنسب.`
      : `Hi ${caseDetail.customerName}, following up with you about ${caseDetail.projectInterest}. If helpful, we can continue here by confirming budget or unit type so we can share the most suitable options.`;
  }

  return responseLocale === "ar"
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
    .filter((documentRequest) => documentRequestNeedsCustomerUpload(documentRequest))
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

function documentRequestNeedsCustomerUpload(documentRequest: PersistedCaseDetail["documentRequests"][number]) {
  if (documentRequest.status === "accepted") {
    return false;
  }

  if (documentRequest.status === "rejected") {
    return true;
  }

  if (documentRequest.uploads.length === 0) {
    return true;
  }

  return documentRequest.uploads[0]?.analysis?.recommendation === "request_reupload";
}

function buildRiskFlags(caseDetail: PersistedCaseDetail, conversationIntelligence?: CaseConversationIntelligence) {
  const flags = new Set<string>();
  const intelligence = conversationIntelligence ?? analyzeConversationIntelligence(caseDetail);
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

  if (containsAnyKeyword(textCorpus, policySensitiveKeywords)) {
    flags.add("policy_sensitive_lead");
  }

  if (intelligence.customerSentiment === "frustrated") {
    flags.add("frustrated_customer_language");
  }

  if (intelligence.requestedNextStep === "schedule_visit" || intelligence.requestedNextStep === "schedule_call") {
    flags.add("scheduling_request");
  }

  if (intelligence.requestedNextStep === "send_documents" || intelligence.requestedNextStep === "review_documents") {
    flags.add("document_context");
  }

  if (intelligence.requestedNextStep === "share_pricing") {
    flags.add("pricing_request");
  }

  if (intelligence.urgencyLevel === "high") {
    flags.add("urgent_customer_request");
  }

  if (intelligence.objectionCategories.includes("pricing")) {
    flags.add("budget_or_pricing_objection");
  }

  if (intelligence.objectionCategories.includes("trust")) {
    flags.add("trust_objection");
  }

  if (intelligence.objectionCategories.includes("responsiveness")) {
    flags.add("responsiveness_objection");
  }

  if (caseDetail.openInterventionsCount > 0) {
    flags.add("existing_manager_intervention");
  }

  if (caseDetail.channelSummary?.latestOutboundStatus === "failed") {
    flags.add("delivery_failure");
  }

  return Array.from(flags);
}

async function buildCaseAgentFactGrounding(
  store: LeadCaptureStore,
  caseDetail: PersistedCaseDetail,
  checkedAt: string
): Promise<CaseAgentFactGrounding> {
  const conversationIntelligence = analyzeConversationIntelligence(caseDetail);
  const requiredKinds = getRequiredCommercialFactKinds(caseDetail, conversationIntelligence);

  if (requiredKinds.length === 0) {
    return {
      checkedAt,
      references: [],
      requiredKinds,
      status: "not_required",
      warnings: []
    };
  }

  const references = await store.listApprovedCommercialFacts({
    kinds: requiredKinds,
    locale: getCaseResponseLocale(caseDetail, getLatestInboundMessage(caseDetail)),
    now: checkedAt,
    projectInterest: caseDetail.projectInterest
  });
  const groundedKinds = new Set(references.map((fact) => fact.kind));
  const missingKinds = requiredKinds.filter((kind) => !groundedKinds.has(kind));

  return {
    checkedAt,
    references: references.map(toPersistedCommercialFactReference).slice(0, 6),
    requiredKinds,
    status: missingKinds.length === 0 ? "grounded" : "missing_required_evidence",
    warnings: missingKinds.map((kind) => buildMissingCommercialFactWarning(caseDetail.preferredLocale, kind))
  };
}

function getRequiredCommercialFactKinds(
  caseDetail: PersistedCaseDetail,
  conversationIntelligence: CaseConversationIntelligence
): CommercialFactKind[] {
  const requiredKinds = new Set<CommercialFactKind>();

  if (
    conversationIntelligence.requestedNextStep === "share_pricing" ||
    conversationIntelligence.objectionCategories.includes("pricing")
  ) {
    requiredKinds.add("pricing");
    requiredKinds.add("payment_plan");
    requiredKinds.add("policy");
  }

  if (
    conversationIntelligence.intentCategory === "availability" ||
    conversationIntelligence.requestedNextStep === "share_details"
  ) {
    requiredKinds.add("availability");
    requiredKinds.add("policy");
  }

  if (
    conversationIntelligence.requestedNextStep === "send_documents" ||
    conversationIntelligence.requestedNextStep === "review_documents" ||
    caseDetail.documentRequests.some((documentRequest) => documentRequest.status !== "accepted")
  ) {
    requiredKinds.add("document_requirement");
  }

  return Array.from(requiredKinds);
}

function toPersistedCommercialFactReference(value: PersistedCommercialFactReference): PersistedCommercialFactReference {
  return {
    approvedAt: value.approvedAt,
    content: value.content,
    expiresAt: value.expiresAt,
    factId: value.factId,
    kind: value.kind,
    locale: value.locale,
    projectInterest: value.projectInterest,
    sourceLabel: value.sourceLabel,
    sourceReference: value.sourceReference,
    title: value.title
  };
}

function buildMissingCommercialFactWarning(locale: SupportedLocale, kind: CommercialFactKind) {
  const labels = {
    ar: {
      availability: "دليل التوفر المعتمد مفقود",
      document_requirement: "دليل متطلبات المستندات المعتمد مفقود",
      payment_plan: "دليل خطة الدفع المعتمد مفقود",
      policy: "دليل حدود السياسة المعتمد مفقود",
      pricing: "دليل التسعير المعتمد مفقود"
    },
    en: {
      availability: "approved availability evidence is missing",
      document_requirement: "approved document-requirement evidence is missing",
      payment_plan: "approved payment-plan evidence is missing",
      policy: "approved policy-boundary evidence is missing",
      pricing: "approved pricing evidence is missing"
    }
  } as const;

  return labels[locale][kind];
}

function analyzeOutboundCommitmentRisk(message: string) {
  const normalizedMessage = normalizeConversationText(message);
  const unsafeCommitment = containsAnyKeyword(normalizedMessage, unsafeCommercialCommitmentKeywords);
  const requiresGrounding =
    unsafeCommitment ||
    containsAnyKeyword(normalizedMessage, pricingCommitmentKeywords) ||
    /(?:sar|ريال|﷼|\$|usd)\s*\d|\d+\s*(?:sar|ريال|﷼|usd)|\d+\s*%/.test(normalizedMessage);

  return {
    requiresGrounding,
    unsafeCommitment
  };
}

function extractRiskFlagSummary(caseDetail: PersistedCaseDetail, conversationIntelligence?: CaseConversationIntelligence) {
  const riskFlags = buildRiskFlags(caseDetail, conversationIntelligence);
  return riskFlags.length > 0 ? riskFlags.join(", ") : null;
}

function readCaseAgentTriggerType(value: unknown): CaseAgentTriggerType | null {
  if (
    value === "new_lead" ||
    value === "no_response_follow_up" ||
    value === "document_missing" ||
    value === "inbound_customer_message"
  ) {
    return value;
  }

  return null;
}

function createFutureTimestamp(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function getLatestInboundMessage(caseDetail: PersistedCaseDetail) {
  const latestInboundEvent = [...caseDetail.auditEvents]
    .reverse()
    .find((event) => event.eventType === "whatsapp_inbound_received");

  return typeof latestInboundEvent?.payload?.textBody === "string" ? latestInboundEvent.payload.textBody : null;
}

function getCaseResponseLocale(caseDetail: PersistedCaseDetail, latestInboundMessage: string | null): SupportedLocale {
  if (latestInboundMessage && /[\u0600-\u06FF]/.test(latestInboundMessage)) {
    return "ar";
  }

  return caseDetail.preferredLocale;
}

function analyzeConversationIntelligence(
  caseDetail: PersistedCaseDetail,
  latestInboundMessage = getLatestInboundMessage(caseDetail)
): CaseConversationIntelligence {
  const text = normalizeConversationText(latestInboundMessage ?? caseDetail.message);
  const requestedNextStep = inferRequestedNextStep(text);
  const objectionCategories = inferObjectionCategories(text);
  const intentCategory = inferIntentCategory(text);
  const customerSentiment = inferCustomerSentiment(text, intentCategory);
  const urgencyLevel = inferUrgencyLevel(text, requestedNextStep);

  return {
    customerSentiment,
    intentCategory,
    objectionCategories,
    requestedNextStep,
    urgencyLevel
  };
}

function summarizeLatestObjection(
  caseDetail: PersistedCaseDetail,
  latestInboundMessage: string | null,
  conversationIntelligence = analyzeConversationIntelligence(caseDetail, latestInboundMessage)
) {
  if (buildRiskFlags(caseDetail, conversationIntelligence).includes("policy_sensitive_lead")) {
    return caseDetail.preferredLocale === "ar"
      ? "العميل طلب استثناء أو قدم إشارة حساسة تحتاج قراراً بشرياً."
      : "The customer asked for an exception or raised a sensitive issue that needs a human decision.";
  }

  if (conversationIntelligence.objectionCategories.includes("trust")) {
    return caseDetail.preferredLocale === "ar"
      ? "العميل لديه مخاوف ثقة أو قانونية وتحتاج مراجعة بشرية قبل الرد."
      : "The customer raised trust or legal concerns that need human review before replying.";
  }

  if (conversationIntelligence.customerSentiment === "frustrated") {
    return caseDetail.preferredLocale === "ar"
      ? "لهجة العميل متوترة وتحتاج معالجة بشرية سريعة."
      : "The customer tone is tense and needs quick human handling.";
  }

  if (conversationIntelligence.requestedNextStep === "review_documents" || conversationIntelligence.requestedNextStep === "send_documents") {
    return caseDetail.preferredLocale === "ar"
      ? "العميل يتابع بخصوص المستندات أو رفع الملفات."
      : "The customer is following up about documents or uploaded files.";
  }

  if (
    conversationIntelligence.requestedNextStep === "schedule_visit" ||
    conversationIntelligence.requestedNextStep === "schedule_call" ||
    conversationIntelligence.requestedNextStep === "human_callback"
  ) {
    return caseDetail.preferredLocale === "ar"
      ? "العميل يطلب تنسيق زيارة أو مكالمة."
      : "The customer is asking to coordinate a visit or call.";
  }

  if (conversationIntelligence.requestedNextStep === "share_pricing") {
    return caseDetail.preferredLocale === "ar"
      ? "العميل يطلب معلومات تسعير أو يناقش الميزانية."
      : "The customer is asking for pricing information or discussing budget.";
  }

  return extractRiskFlagSummary(caseDetail, conversationIntelligence);
}

const policySensitiveKeywords = [
  "lawyer",
  "legal",
  "guarantee",
  "special approval",
  "discount",
  "exception",
  "محامي",
  "قانون",
  "ضمان",
  "استثناء",
  "خصم"
];
const pricingCommitmentKeywords = [
  "price",
  "pricing",
  "payment plan",
  "booking fee",
  "installment",
  "starting from",
  "starts from",
  "سعر",
  "التسعير",
  "خطة الدفع",
  "رسوم الحجز",
  "دفعة",
  "يبدأ من"
];
const unsafeCommercialCommitmentKeywords = [
  "guarantee",
  "guaranteed",
  "discount",
  "exception approval",
  "legal guarantee",
  "no legal issue",
  "possession date",
  "keys on",
  "lock in",
  "waive",
  "أضمن",
  "مضمون",
  "خصم",
  "اعتماد الاستثناء",
  "ضمان قانوني",
  "لا توجد مشكلة قانونية",
  "تاريخ التسليم",
  "المفاتيح في",
  "تثبيت السعر",
  "إعفاء"
];
const frustrationKeywords = [
  "frustrated",
  "angry",
  "upset",
  "annoyed",
  "not happy",
  "منزعج",
  "مستاء",
  "غاضب",
  "زعلان"
];
const urgencyKeywords = ["urgent", "asap", "today", "immediately", "now", "بأسرع", "اليوم", "فورا", "الآن", "حالاً"];
const pricingKeywords = [
  "price",
  "pricing",
  "budget",
  "installment",
  "payment plan",
  "cost",
  "discount",
  "special approval",
  "exception",
  "سعر",
  "ميزانية",
  "قسط",
  "دفعة",
  "تكلفة",
  "خصم",
  "استثناء"
];
const documentKeywords = [
  "upload",
  "uploaded",
  "attached",
  "document",
  "documents",
  "id",
  "bank statement",
  "proof",
  "employment",
  "مستند",
  "مستندات",
  "أرفقت",
  "ارسلت",
  "رفعت",
  "هوية",
  "كشف حساب",
  "تعريف"
];
const reviewDocumentKeywords = ["uploaded", "attached", "sent", "أرفقت", "ارسلت", "رفعت"];
const visitKeywords = ["visit", "tour", "site visit", "زيارة", "معاينة"];
const callKeywords = ["call", "meeting", "appointment", "اتصال", "مكالمة", "موعد"];
const callbackKeywords = ["callback", "call me", "اتصل", "كلمني", "كلموني"];
const availabilityKeywords = [
  "available",
  "availability",
  "layout",
  "unit",
  "bedroom",
  "available units",
  "متاح",
  "الوحدات",
  "وحدة",
  "غرفة",
  "غرفتين",
  "المخطط"
];
const qualificationKeywords = [
  "interested",
  "reservation",
  "reserve",
  "requirements",
  "next step",
  "details",
  "مهتم",
  "حجز",
  "الخطوة التالية",
  "التفاصيل"
];
const trustKeywords = ["contract", "legal", "lawyer", "guarantee", "موثق", "عقد", "محامي", "قانون", "ضمان"];
const responsivenessKeywords = [
  "no one replied",
  "nobody replied",
  "waiting for your reply",
  "late reply",
  "ماحد رد",
  "ما رديتوا",
  "منتظر ردكم",
  "تأخر الرد"
];
const timelineKeywords = [
  "later",
  "next month",
  "after summer",
  "not ready",
  "later on",
  "الشهر القادم",
  "لاحقا",
  "لاحقاً",
  "بعد",
  "غير جاهز",
  "مو جاهز"
];

function normalizeConversationText(value: string) {
  return value.toLowerCase();
}

function containsAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function inferIntentCategory(text: string): CaseAgentIntentCategory {
  if (containsAnyKeyword(text, documentKeywords)) {
    return "documents";
  }

  if (containsAnyKeyword(text, [...visitKeywords, ...callKeywords, ...callbackKeywords])) {
    return "scheduling";
  }

  if (containsAnyKeyword(text, pricingKeywords)) {
    return "pricing";
  }

  if (containsAnyKeyword(text, availabilityKeywords)) {
    return "availability";
  }

  if (containsAnyKeyword(text, qualificationKeywords)) {
    return "qualification";
  }

  return "general";
}

function inferRequestedNextStep(text: string): CaseAgentRequestedNextStep {
  if (containsAnyKeyword(text, visitKeywords)) {
    return "schedule_visit";
  }

  if (containsAnyKeyword(text, callbackKeywords)) {
    return "human_callback";
  }

  if (containsAnyKeyword(text, callKeywords)) {
    return "schedule_call";
  }

  if (containsAnyKeyword(text, reviewDocumentKeywords)) {
    return "review_documents";
  }

  if (containsAnyKeyword(text, documentKeywords)) {
    return "send_documents";
  }

  if (containsAnyKeyword(text, pricingKeywords)) {
    return "share_pricing";
  }

  if (containsAnyKeyword(text, [...availabilityKeywords, ...qualificationKeywords])) {
    return "share_details";
  }

  return "none";
}

function inferObjectionCategories(text: string): CaseAgentObjectionCategory[] {
  const categories = new Set<CaseAgentObjectionCategory>();

  if (containsAnyKeyword(text, pricingKeywords)) {
    categories.add("pricing");
  }

  if (containsAnyKeyword(text, documentKeywords)) {
    categories.add("documents");
  }

  if (containsAnyKeyword(text, trustKeywords)) {
    categories.add("trust");
  }

  if (containsAnyKeyword(text, responsivenessKeywords)) {
    categories.add("responsiveness");
  }

  if (containsAnyKeyword(text, timelineKeywords)) {
    categories.add("timeline");
  }

  return Array.from(categories);
}

function inferCustomerSentiment(text: string, intentCategory: CaseAgentIntentCategory): CaseAgentSentiment {
  if (containsAnyKeyword(text, frustrationKeywords)) {
    return "frustrated";
  }

  if (containsAnyKeyword(text, urgencyKeywords)) {
    return "urgent";
  }

  if (intentCategory !== "general") {
    return "interested";
  }

  return "neutral";
}

function inferUrgencyLevel(text: string, requestedNextStep: CaseAgentRequestedNextStep): CaseAgentUrgencyLevel {
  if (containsAnyKeyword(text, urgencyKeywords) || requestedNextStep === "human_callback") {
    return "high";
  }

  if (
    requestedNextStep === "schedule_visit" ||
    requestedNextStep === "schedule_call" ||
    requestedNextStep === "review_documents" ||
    requestedNextStep === "send_documents"
  ) {
    return "medium";
  }

  return "low";
}
