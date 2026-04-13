import type {
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedDocumentRequest,
  PersistedHandoverCaseDetail,
  SupportedLocale
} from "@real-estate-ai/contracts";
import type { ConversationMessage, JourneyEvent, LocalizedText } from "@real-estate-ai/domain";

import {
  getAutomationStatusLabel,
  getAutomationHoldReasonLabel,
  getAutomationHoldReasonNote,
  getCaseQaPolicySignalLabel,
  getCaseStageLabel,
  getCaseQaReviewStatusLabel,
  getCaseQaReviewSubjectTypeLabel,
  getCaseQaReviewTriggerSourceLabel,
  getDocumentRequestDetail,
  getDocumentRequestStatusLabel,
  getDocumentRequestTypeLabel,
  getFollowUpStatusLabel,
  getHandoverAppointmentStatusLabel,
  getHandoverClosureStateLabel,
  getHandoverArchiveOutcomeLabel,
  getHandoverArchiveStatusLabel,
  getHandoverBlockerSeverityLabel,
  getHandoverBlockerStatusLabel,
  getHandoverBlockerTypeDetail,
  getHandoverBlockerTypeLabel,
  getHandoverCaseStatusLabel,
  getHandoverCustomerUpdateStatusLabel,
  getHandoverCustomerUpdateQaPolicySignalLabel,
  getHandoverCustomerUpdateQaReviewStatusLabel,
  getHandoverCustomerUpdateTypeDetail,
  getHandoverCustomerUpdateTypeLabel,
  getHandoverMilestoneStatusLabel,
  getHandoverMilestoneTypeDetail,
  getHandoverMilestoneTypeLabel,
  getHandoverPostCompletionFollowUpStatusLabel,
  getHandoverReviewOutcomeLabel,
  getHandoverTaskStatusLabel,
  getHandoverTaskTypeDetail,
  getHandoverTaskTypeLabel,
  getInterventionSeverityLabel,
  getInterventionSummary,
  getQualificationReadinessLabel,
  getSourceLabel
} from "./live-copy";

export function buildCaseReferenceCode(caseId: string) {
  return `CASE-${caseId.slice(0, 8).toUpperCase()}`;
}

export function buildPersistedConversation(caseDetail: PersistedCaseDetail): ConversationMessage[] {
  const automationState =
    caseDetail.currentQaReview?.status === "pending_review"
      ? caseDetail.currentQaReview.triggerSource === "policy_rule"
        ? {
            ar: "مطلوب تدخل بشري بسبب إشارة سياسة تلقائية",
            en: "Human takeover required after an automatic policy trigger"
          }
        : {
            ar: "المحادثة بانتظار مراجعة جودة بشرية",
            en: "Conversation is waiting for human QA review"
          }
      : caseDetail.currentQaReview?.status === "follow_up_required"
        ? {
            ar: "حددت الجودة أن هذه الحالة تحتاج متابعة بشرية",
            en: "QA marked this case as needing human follow-up"
          }
        : caseDetail.currentHandoverCustomerUpdateQaReview?.reviewStatus === "pending_review"
          ? {
              ar: "تم تعليق التحديث المجهز بانتظار اعتماد جودة قبل الإرسال",
              en: "A prepared customer update is paused pending QA approval before dispatch"
            }
          : caseDetail.currentHandoverCustomerUpdateQaReview?.reviewStatus === "follow_up_required"
            ? {
                ar: "طلبت الجودة تعديل صياغة تحديث العميل قبل المتابعة",
                en: "QA requested changes to the prepared customer update before it can proceed"
              }
        : {
            ar: "تم توليدها من حالة حية محفوظة",
            en: "Generated from the persisted alpha workflow"
          };

  const conversation: ConversationMessage[] = [
    {
      body: {
        ar: caseDetail.message,
        en: caseDetail.message
      },
      id: `${caseDetail.caseId}-customer`,
      sender: "customer",
      timestamp: formatTimestamp(caseDetail.createdAt)
    },
    {
      body: {
        ar: caseDetail.nextAction,
        en: caseDetail.nextAction
      },
      id: `${caseDetail.caseId}-workflow`,
      sender: "automation",
      state: automationState,
      timestamp: formatTimestamp(caseDetail.updatedAt)
    }
  ];

  if (caseDetail.currentQaReview?.subjectType === "prepared_reply_draft" && caseDetail.currentQaReview.draftMessage) {
    conversation.push({
      body: {
        ar: caseDetail.currentQaReview.draftMessage,
        en: caseDetail.currentQaReview.draftMessage
      },
      id: `${caseDetail.caseId}-${caseDetail.currentQaReview.qaReviewId}-reply-draft`,
      sender: "manager",
      state: getPreparedReplyDraftState(caseDetail),
      timestamp: formatTimestamp(caseDetail.currentQaReview.updatedAt)
    });
  }

  return conversation;
}

export function buildPersistedHandoverTimeline(handoverCase: PersistedHandoverCaseDetail): JourneyEvent[] {
  return handoverCase.auditEvents
    .filter((event) => event.eventType.startsWith("handover_") || event.eventType === "document_request_updated")
    .map((event, index) => ({
      detail: {
        ar: describeHandoverAuditEvent(handoverCase, event.eventType, "ar", "detail"),
        en: describeHandoverAuditEvent(handoverCase, event.eventType, "en", "detail")
      },
      id: `${handoverCase.handoverCaseId}-${index}`,
      timestamp: formatTimestamp(event.createdAt),
      title: {
        ar: describeHandoverAuditEvent(handoverCase, event.eventType, "ar", "title"),
        en: describeHandoverAuditEvent(handoverCase, event.eventType, "en", "title")
      }
    }));
}

export function buildPersistedTimeline(caseDetail: PersistedCaseDetail): JourneyEvent[] {
  return caseDetail.auditEvents.map((event, index) => ({
    detail: {
      ar: describeAuditEvent(caseDetail, event.eventType, "ar", "detail"),
      en: describeAuditEvent(caseDetail, event.eventType, "en", "detail")
    },
    id: `${caseDetail.caseId}-${index}`,
    timestamp: formatTimestamp(event.createdAt),
    title: {
      ar: describeAuditEvent(caseDetail, event.eventType, "ar", "title"),
      en: describeAuditEvent(caseDetail, event.eventType, "en", "title")
    }
  }));
}

export function formatCaseLastChange(value: PersistedCaseDetail | PersistedCaseSummary, locale: SupportedLocale) {
  return new Date(value.updatedAt).toLocaleString(locale);
}

export function formatDueAt(value: PersistedCaseDetail | PersistedCaseSummary, locale: SupportedLocale) {
  return new Date(value.nextActionDueAt).toLocaleString(locale);
}

export function getPersistedAutomationLabel(locale: SupportedLocale, automationStatus: PersistedCaseDetail["automationStatus"]) {
  return getAutomationStatusLabel(locale, automationStatus);
}

export function getPersistedAutomationHoldReasonLabel(
  locale: SupportedLocale,
  automationHoldReason: PersistedCaseDetail["automationHoldReason"] | PersistedCaseSummary["automationHoldReason"]
) {
  return automationHoldReason ? getAutomationHoldReasonLabel(locale, automationHoldReason) : null;
}

export function getPersistedAutomationHoldReasonNote(
  locale: SupportedLocale,
  automationStatus: PersistedCaseDetail["automationStatus"],
  automationHoldReason: PersistedCaseDetail["automationHoldReason"]
) {
  return automationHoldReason ? getAutomationHoldReasonNote(locale, automationHoldReason, automationStatus) : null;
}

export function getPersistedCaseStageLabel(locale: SupportedLocale, caseStage: PersistedCaseDetail["stage"] | PersistedCaseSummary["stage"]) {
  return getCaseStageLabel(locale, caseStage);
}

export function getPersistedDocumentDisplay(locale: SupportedLocale, caseDetail: PersistedCaseDetail) {
  return caseDetail.documentRequests.map((documentRequest) => ({
    detail: getDocumentRequestDetail(locale, documentRequest.type),
    documentRequestId: documentRequest.documentRequestId,
    label: getDocumentRequestTypeLabel(locale, documentRequest.type),
    statusLabel: getDocumentRequestStatusLabel(locale, documentRequest.status),
    statusTone: getDocumentTone(documentRequest.status),
    updatedAt: new Date(documentRequest.updatedAt).toLocaleString(locale),
    value: documentRequest.status
  }));
}

export function getPersistedHandoverDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  return handoverCase.tasks.map((task) => ({
    dueAt: new Date(task.dueAt).toLocaleString(locale),
    ownerName: task.ownerName,
    status: task.status,
    statusLabel: getHandoverTaskStatusLabel(locale, task.status),
    statusTone: getHandoverTaskTone(task.status),
    taskId: task.taskId,
    title: getHandoverTaskTypeLabel(locale, task.type),
    type: task.type,
    updatedAt: new Date(task.updatedAt).toLocaleString(locale),
    summary: getHandoverTaskTypeDetail(locale, task.type)
  }));
}

export function getPersistedHandoverBlockerDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  return handoverCase.blockers.map((blocker) => ({
    blockerId: blocker.blockerId,
    dueAt: new Date(blocker.dueAt).toLocaleString(locale),
    dueAtInput: blocker.dueAt.slice(0, 16),
    ownerName: blocker.ownerName,
    severity: blocker.severity,
    severityLabel: getHandoverBlockerSeverityLabel(locale, blocker.severity),
    severityTone: getHandoverBlockerSeverityTone(blocker.severity),
    status: blocker.status,
    statusLabel: getHandoverBlockerStatusLabel(locale, blocker.status),
    statusTone: getHandoverBlockerTone(blocker.status),
    summary: blocker.summary,
    title: getHandoverBlockerTypeLabel(locale, blocker.type),
    type: blocker.type,
    typeDetail: getHandoverBlockerTypeDetail(locale, blocker.type),
    updatedAt: new Date(blocker.updatedAt).toLocaleString(locale)
  }));
}

export function getPersistedHandoverMilestoneDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  return handoverCase.milestones.map((milestone) => ({
    milestoneId: milestone.milestoneId,
    ownerName: milestone.ownerName,
    status: milestone.status,
    statusLabel: getHandoverMilestoneStatusLabel(locale, milestone.status),
    statusTone: getHandoverMilestoneTone(milestone.status),
    summary: getHandoverMilestoneTypeDetail(locale, milestone.type),
    targetAt: new Date(milestone.targetAt).toLocaleString(locale),
    targetAtInput: milestone.targetAt.slice(0, 16),
    title: getHandoverMilestoneTypeLabel(locale, milestone.type),
    type: milestone.type,
    updatedAt: new Date(milestone.updatedAt).toLocaleString(locale)
  }));
}

export function getPersistedHandoverCustomerUpdateDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  return handoverCase.customerUpdates.map((customerUpdate) => ({
    customerUpdateId: customerUpdate.customerUpdateId,
    deliveryPreparedAt: customerUpdate.deliveryPreparedAt ? new Date(customerUpdate.deliveryPreparedAt).toLocaleString(locale) : null,
    deliverySummary: customerUpdate.deliverySummary,
    dispatchReadyAt: customerUpdate.dispatchReadyAt ? new Date(customerUpdate.dispatchReadyAt).toLocaleString(locale) : null,
    qaPolicySignalLabels: customerUpdate.qaPolicySignals.map((signal) => getHandoverCustomerUpdateQaPolicySignalLabel(locale, signal)),
    qaPolicySignals: customerUpdate.qaPolicySignals,
    qaReviewSampleSummary: customerUpdate.qaReviewSampleSummary,
    qaReviewStatus: customerUpdate.qaReviewStatus,
    qaReviewStatusLabel: getHandoverCustomerUpdateQaReviewStatusLabel(locale, customerUpdate.qaReviewStatus),
    qaReviewStatusTone: getHandoverCustomerUpdateQaReviewTone(customerUpdate.qaReviewStatus),
    qaReviewSummary: customerUpdate.qaReviewSummary,
    qaReviewedAt: customerUpdate.qaReviewedAt ? new Date(customerUpdate.qaReviewedAt).toLocaleString(locale) : null,
    qaReviewerName: customerUpdate.qaReviewerName,
    qaTriggerEvidence: customerUpdate.qaTriggerEvidence,
    status: customerUpdate.status,
    statusLabel: getHandoverCustomerUpdateStatusLabel(locale, customerUpdate.status),
    statusTone: getHandoverCustomerUpdateTone(customerUpdate.status),
    summary: getHandoverCustomerUpdateTypeDetail(locale, customerUpdate.type),
    title: getHandoverCustomerUpdateTypeLabel(locale, customerUpdate.type),
    type: customerUpdate.type,
    updatedAt: new Date(customerUpdate.updatedAt).toLocaleString(locale)
  }));
}

export function getPersistedHandoverAppointmentDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  if (!handoverCase.appointment) {
    return null;
  }

  return {
    appointmentId: handoverCase.appointment.appointmentId,
    coordinatorName: handoverCase.appointment.coordinatorName,
    location: handoverCase.appointment.location,
    scheduledAt: new Date(handoverCase.appointment.scheduledAt).toLocaleString(locale),
    scheduledAtInput: handoverCase.appointment.scheduledAt.slice(0, 16),
    status: handoverCase.appointment.status,
    statusLabel: getHandoverAppointmentStatusLabel(locale, handoverCase.appointment.status),
    statusTone: getHandoverAppointmentTone(handoverCase.appointment.status),
    updatedAt: new Date(handoverCase.appointment.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverReviewDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  if (!handoverCase.review) {
    return null;
  }

  return {
    outcome: handoverCase.review.outcome,
    outcomeLabel: getHandoverReviewOutcomeLabel(locale, handoverCase.review.outcome),
    reviewId: handoverCase.review.reviewId,
    summary: handoverCase.review.summary,
    updatedAt: new Date(handoverCase.review.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverArchiveReviewDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  if (!handoverCase.archiveReview) {
    return null;
  }

  return {
    outcome: handoverCase.archiveReview.outcome,
    outcomeLabel: getHandoverArchiveOutcomeLabel(locale, handoverCase.archiveReview.outcome),
    reviewId: handoverCase.archiveReview.reviewId,
    summary: handoverCase.archiveReview.summary,
    updatedAt: new Date(handoverCase.archiveReview.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverArchiveStatusDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  if (!handoverCase.archiveStatus) {
    return null;
  }

  const statusTone: "success" | "warning" = handoverCase.archiveStatus.status === "held" ? "warning" : "success";

  return {
    status: handoverCase.archiveStatus.status,
    statusId: handoverCase.archiveStatus.statusId,
    statusLabel: getHandoverArchiveStatusLabel(locale, handoverCase.archiveStatus.status),
    statusTone,
    summary: handoverCase.archiveStatus.summary,
    updatedAt: new Date(handoverCase.archiveStatus.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverPostCompletionFollowUpDisplay(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail) {
  if (!handoverCase.postCompletionFollowUp) {
    return null;
  }

  const statusTone: "success" | "warning" = handoverCase.postCompletionFollowUp.status === "resolved" ? "success" : "warning";

  return {
    dueAt: new Date(handoverCase.postCompletionFollowUp.dueAt).toLocaleString(locale),
    dueAtInput: handoverCase.postCompletionFollowUp.dueAt.slice(0, 16),
    followUpId: handoverCase.postCompletionFollowUp.followUpId,
    ownerName: handoverCase.postCompletionFollowUp.ownerName,
    resolutionSummary: handoverCase.postCompletionFollowUp.resolutionSummary,
    resolvedAt: handoverCase.postCompletionFollowUp.resolvedAt
      ? new Date(handoverCase.postCompletionFollowUp.resolvedAt).toLocaleString(locale)
      : null,
    status: handoverCase.postCompletionFollowUp.status,
    statusLabel: getHandoverPostCompletionFollowUpStatusLabel(locale, handoverCase.postCompletionFollowUp.status),
    statusTone,
    summary: handoverCase.postCompletionFollowUp.summary,
    updatedAt: new Date(handoverCase.postCompletionFollowUp.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverStatusLabel(locale: SupportedLocale, handoverCase: PersistedHandoverCaseDetail | PersistedCaseDetail["handoverCase"]) {
  if (!handoverCase) {
    return null;
  }

  return getHandoverCaseStatusLabel(locale, handoverCase.status);
}

export function getPersistedInterventionDisplay(locale: SupportedLocale, caseDetail: PersistedCaseDetail) {
  return caseDetail.managerInterventions.map((intervention) => ({
    createdAt: new Date(intervention.createdAt).toLocaleString(locale),
    interventionId: intervention.interventionId,
    resolutionNote: intervention.resolutionNote,
    resolvedAt: intervention.resolvedAt ? new Date(intervention.resolvedAt).toLocaleString(locale) : null,
    severityLabel: getInterventionSeverityLabel(locale, intervention.severity),
    severityTone: getInterventionTone(intervention.severity),
    status: intervention.status,
    summary: getInterventionSummary(locale, intervention.type),
    type: intervention.type
  }));
}

export function getPersistedQaReviewDisplay(locale: SupportedLocale, caseDetail: PersistedCaseDetail | PersistedCaseSummary) {
  if (!caseDetail.currentQaReview) {
    return null;
  }

  const statusTone =
    caseDetail.currentQaReview.status === "approved"
      ? ("success" as const)
      : caseDetail.currentQaReview.status === "follow_up_required"
        ? ("warning" as const)
        : ("critical" as const);

  return {
    draftMessage: caseDetail.currentQaReview.draftMessage,
    policySignalLabels: caseDetail.currentQaReview.policySignals.map((signal) => getCaseQaPolicySignalLabel(locale, signal)),
    policySignals: caseDetail.currentQaReview.policySignals,
    qaReviewId: caseDetail.currentQaReview.qaReviewId,
    requestedByName: caseDetail.currentQaReview.requestedByName,
    reviewSummary: caseDetail.currentQaReview.reviewSummary,
    reviewedAt: caseDetail.currentQaReview.reviewedAt ? new Date(caseDetail.currentQaReview.reviewedAt).toLocaleString(locale) : null,
    reviewerName: caseDetail.currentQaReview.reviewerName,
    sampleSummary: caseDetail.currentQaReview.sampleSummary,
    status: caseDetail.currentQaReview.status,
    statusLabel: getCaseQaReviewStatusLabel(locale, caseDetail.currentQaReview.status),
    statusTone,
    subjectType: caseDetail.currentQaReview.subjectType,
    subjectTypeLabel: getCaseQaReviewSubjectTypeLabel(locale, caseDetail.currentQaReview.subjectType),
    triggerEvidence: caseDetail.currentQaReview.triggerEvidence,
    triggerSource: caseDetail.currentQaReview.triggerSource,
    triggerSourceLabel: getCaseQaReviewTriggerSourceLabel(locale, caseDetail.currentQaReview.triggerSource),
    updatedAt: new Date(caseDetail.currentQaReview.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverCustomerUpdateQaReviewDisplay(
  locale: SupportedLocale,
  caseDetail: PersistedCaseDetail | PersistedCaseSummary
) {
  if (!caseDetail.currentHandoverCustomerUpdateQaReview) {
    return null;
  }

  return {
    customerUpdateId: caseDetail.currentHandoverCustomerUpdateQaReview.customerUpdateId,
    deliverySummary: caseDetail.currentHandoverCustomerUpdateQaReview.deliverySummary,
    handoverCaseId: caseDetail.currentHandoverCustomerUpdateQaReview.handoverCaseId,
    policySignalLabels: caseDetail.currentHandoverCustomerUpdateQaReview.policySignals.map((signal) =>
      getHandoverCustomerUpdateQaPolicySignalLabel(locale, signal)
    ),
    policySignals: caseDetail.currentHandoverCustomerUpdateQaReview.policySignals,
    reviewSampleSummary: caseDetail.currentHandoverCustomerUpdateQaReview.reviewSampleSummary,
    reviewStatus: caseDetail.currentHandoverCustomerUpdateQaReview.reviewStatus,
    reviewStatusLabel: getHandoverCustomerUpdateQaReviewStatusLabel(locale, caseDetail.currentHandoverCustomerUpdateQaReview.reviewStatus),
    reviewStatusTone: getHandoverCustomerUpdateQaReviewTone(caseDetail.currentHandoverCustomerUpdateQaReview.reviewStatus),
    reviewSummary: caseDetail.currentHandoverCustomerUpdateQaReview.reviewSummary,
    reviewedAt: caseDetail.currentHandoverCustomerUpdateQaReview.reviewedAt
      ? new Date(caseDetail.currentHandoverCustomerUpdateQaReview.reviewedAt).toLocaleString(locale)
      : null,
    reviewerName: caseDetail.currentHandoverCustomerUpdateQaReview.reviewerName,
    triggerEvidence: caseDetail.currentHandoverCustomerUpdateQaReview.triggerEvidence,
    type: caseDetail.currentHandoverCustomerUpdateQaReview.type,
    typeLabel: getHandoverCustomerUpdateTypeLabel(locale, caseDetail.currentHandoverCustomerUpdateQaReview.type),
    updatedAt: new Date(caseDetail.currentHandoverCustomerUpdateQaReview.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedActiveQaItemDisplay(locale: SupportedLocale, caseDetail: PersistedCaseDetail | PersistedCaseSummary) {
  const caseQaReview = getPersistedQaReviewDisplay(locale, caseDetail);
  const handoverCustomerUpdateQaReview = getPersistedHandoverCustomerUpdateQaReviewDisplay(locale, caseDetail);

  if (!caseQaReview && !handoverCustomerUpdateQaReview) {
    return null;
  }

  if (!caseQaReview) {
    return {
      kind: "handover_customer_update" as const,
      policySignalLabels: handoverCustomerUpdateQaReview?.policySignalLabels ?? [],
      reviewSummary: handoverCustomerUpdateQaReview?.reviewSummary,
      sampleSummary: handoverCustomerUpdateQaReview?.reviewSampleSummary ?? "",
      statusLabel: handoverCustomerUpdateQaReview?.reviewStatusLabel ?? "",
      statusTone: handoverCustomerUpdateQaReview?.reviewStatusTone ?? "warning",
      subjectLabel: handoverCustomerUpdateQaReview?.typeLabel ?? "",
      triggerEvidence: handoverCustomerUpdateQaReview?.triggerEvidence ?? [],
      triggerSourceLabel: locale === "ar" ? "مسودة تحديث عميل" : "Customer-update draft",
      updatedAt: handoverCustomerUpdateQaReview?.updatedAt ?? ""
    };
  }

  if (!handoverCustomerUpdateQaReview) {
    return {
      kind: "case_message" as const,
      policySignalLabels: caseQaReview.policySignalLabels,
      reviewSummary: caseQaReview.reviewSummary,
      sampleSummary: caseQaReview.sampleSummary,
      statusLabel: caseQaReview.statusLabel,
      statusTone: caseQaReview.statusTone,
      subjectLabel: caseQaReview.subjectTypeLabel,
      triggerEvidence: caseQaReview.triggerEvidence,
      triggerSourceLabel: caseQaReview.triggerSourceLabel,
      updatedAt: caseQaReview.updatedAt
    };
  }

  const casePriority = getQaDisplayPriority(caseQaReview.status);
  const handoverPriority = getQaDisplayPriority(handoverCustomerUpdateQaReview.reviewStatus);
  const preferredReview =
    handoverPriority < casePriority ||
    (handoverPriority === casePriority &&
      new Date(handoverCustomerUpdateQaReview.updatedAt).getTime() > new Date(caseQaReview.updatedAt).getTime())
      ? {
          kind: "handover_customer_update" as const,
          policySignalLabels: handoverCustomerUpdateQaReview.policySignalLabels,
          reviewSummary: handoverCustomerUpdateQaReview.reviewSummary,
          sampleSummary: handoverCustomerUpdateQaReview.reviewSampleSummary,
          statusLabel: handoverCustomerUpdateQaReview.reviewStatusLabel,
          statusTone: handoverCustomerUpdateQaReview.reviewStatusTone,
          subjectLabel: handoverCustomerUpdateQaReview.typeLabel,
          triggerEvidence: handoverCustomerUpdateQaReview.triggerEvidence,
          triggerSourceLabel: locale === "ar" ? "مسودة تحديث عميل" : "Customer-update draft",
          updatedAt: handoverCustomerUpdateQaReview.updatedAt
        }
      : {
          kind: "case_message" as const,
          policySignalLabels: caseQaReview.policySignalLabels,
          reviewSummary: caseQaReview.reviewSummary,
          sampleSummary: caseQaReview.sampleSummary,
          statusLabel: caseQaReview.statusLabel,
          statusTone: caseQaReview.statusTone,
          subjectLabel: caseQaReview.subjectTypeLabel,
          triggerEvidence: caseQaReview.triggerEvidence,
          triggerSourceLabel: caseQaReview.triggerSourceLabel,
          updatedAt: caseQaReview.updatedAt
        };

  return preferredReview;
}

export function getPersistedQaReviewHistory(locale: SupportedLocale, caseDetail: PersistedCaseDetail) {
  return caseDetail.qaReviews.map((qaReview) => ({
    createdAt: new Date(qaReview.createdAt).toLocaleString(locale),
    draftMessage: qaReview.draftMessage,
    policySignalLabels: qaReview.policySignals.map((signal) => getCaseQaPolicySignalLabel(locale, signal)),
    policySignals: qaReview.policySignals,
    qaReviewId: qaReview.qaReviewId,
    requestedByName: qaReview.requestedByName,
    reviewSummary: qaReview.reviewSummary,
    reviewedAt: qaReview.reviewedAt ? new Date(qaReview.reviewedAt).toLocaleString(locale) : null,
    reviewerName: qaReview.reviewerName,
    sampleSummary: qaReview.sampleSummary,
    status: qaReview.status,
    statusLabel: getCaseQaReviewStatusLabel(locale, qaReview.status),
    statusTone:
      qaReview.status === "approved"
        ? ("success" as const)
        : qaReview.status === "follow_up_required"
          ? ("warning" as const)
          : ("critical" as const),
    subjectType: qaReview.subjectType,
    subjectTypeLabel: getCaseQaReviewSubjectTypeLabel(locale, qaReview.subjectType),
    triggerEvidence: qaReview.triggerEvidence,
    triggerSource: qaReview.triggerSource,
    triggerSourceLabel: getCaseQaReviewTriggerSourceLabel(locale, qaReview.triggerSource),
    updatedAt: new Date(qaReview.updatedAt).toLocaleString(locale)
  }));
}

export function getPersistedQualificationSummary(locale: SupportedLocale, caseDetail: PersistedCaseDetail) {
  if (!caseDetail.qualificationSnapshot) {
    return null;
  }

  return {
    budgetBand: caseDetail.qualificationSnapshot.budgetBand,
    intentSummary: caseDetail.qualificationSnapshot.intentSummary,
    moveInTimeline: caseDetail.qualificationSnapshot.moveInTimeline,
    readiness: getQualificationReadinessLabel(locale, caseDetail.qualificationSnapshot.readiness),
    updatedAt: new Date(caseDetail.qualificationSnapshot.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedSourceLabel(locale: SupportedLocale) {
  return getSourceLabel(locale);
}

export function getPersistedFollowUpLabel(locale: SupportedLocale, caseSummary: PersistedCaseDetail | PersistedCaseSummary) {
  return getFollowUpStatusLabel(locale, caseSummary.followUpStatus);
}

export function getPersistedHandoverClosureDisplay(locale: SupportedLocale, caseSummary: PersistedCaseDetail | PersistedCaseSummary) {
  if (!caseSummary.handoverClosure) {
    return null;
  }

  const statusTone: "success" | "warning" =
    caseSummary.handoverClosure.status === "archived"
      ? "success"
      : caseSummary.handoverClosure.status === "ready_to_archive"
        ? "success"
        : "warning";

  return {
    handoverCaseId: caseSummary.handoverClosure.handoverCaseId,
    status: caseSummary.handoverClosure.status,
    statusLabel: getHandoverClosureStateLabel(locale, caseSummary.handoverClosure.status),
    statusTone,
    updatedAt: new Date(caseSummary.handoverClosure.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverWorkspaceDisplay(locale: SupportedLocale, caseSummary: PersistedCaseDetail | PersistedCaseSummary) {
  if (caseSummary.handoverClosure) {
    const closureDisplay = getPersistedHandoverClosureDisplay(locale, caseSummary);

    if (!closureDisplay) {
      return null;
    }

    return {
      handoverCaseId: closureDisplay.handoverCaseId,
      statusLabel: closureDisplay.statusLabel,
      statusTone: closureDisplay.statusTone,
      surface: "closure" as const,
      surfaceLabel: locale === "ar" ? "الإغلاق" : "Closure",
      updatedAt: closureDisplay.updatedAt
    };
  }

  if (!caseSummary.handoverCase) {
    return null;
  }

  const surface = getPersistedHandoverWorkspaceSurface(caseSummary);

  if (!surface) {
    return null;
  }

  return {
    handoverCaseId: caseSummary.handoverCase.handoverCaseId,
    statusLabel: getHandoverCaseStatusLabel(locale, caseSummary.handoverCase.status),
    statusTone: getPersistedHandoverCaseTone(caseSummary.handoverCase.status),
    surface,
    surfaceLabel: getPersistedHandoverWorkspaceSurfaceLabel(locale, surface),
    updatedAt: new Date(caseSummary.handoverCase.updatedAt).toLocaleString(locale)
  };
}

export function getPersistedHandoverWorkspaceSurface(caseSummary: PersistedCaseDetail | PersistedCaseSummary) {
  if (caseSummary.handoverClosure) {
    return "closure" as const;
  }

  if (!caseSummary.handoverCase) {
    return null;
  }

  if (caseSummary.handoverCase.status === "scheduled" || caseSummary.handoverCase.status === "in_progress") {
    return "execution" as const;
  }

  return "planning" as const;
}

function describeAuditEvent(caseDetail: PersistedCaseDetail, eventType: string, locale: SupportedLocale, variant: "detail" | "title") {
  const descriptions = {
    ar: {
      automation_paused: {
        detail: "تم إيقاف أتمتة المتابعة لهذه الحالة مع إبقاء السجل محفوظاً.",
        title: "إيقاف الأتمتة"
      },
      automation_resumed: {
        detail: "تمت إعادة تشغيل أتمتة المتابعة وجدولة التحقق التالي.",
        title: "استئناف الأتمتة"
      },
      case_qualified: {
        detail: "تم حفظ بيانات التأهيل وربطها بالحالة.",
        title: "تحديث التأهيل"
      },
      document_request_updated: {
        detail: "تم تحديث حالة أحد المستندات المطلوبة في هذه الحالة.",
        title: "تحديث المستندات"
      },
      follow_up_intervention_opened: {
        detail: "تجاوزت المتابعة موعدها وجرى فتح تدخل إداري واضح لهذه الحالة.",
        title: "تدخل إداري جديد"
      },
      handover_intake_created: {
        detail: "تم اعتماد انتقال الحالة إلى مسار التسليم وفتح قائمة الجاهزية الأولية.",
        title: "بدء مسار التسليم"
      },
      handover_appointment_confirmed: {
        detail: "تم تأكيد موعد التسليم داخلياً دون تشغيل أي إرسال خارجي.",
        title: "تأكيد الموعد داخلياً"
      },
      handover_appointment_planned: {
        detail: "تم حفظ موعد تسليم داخلي فعلي بعد اعتماد حد الجدولة.",
        title: "تخطيط موعد التسليم"
      },
      handover_completed: {
        detail: "تم إغلاق يوم التسليم بملخص إتمام مضبوط بعد اكتمال التنفيذ الميداني.",
        title: "إتمام التسليم"
      },
      handover_post_completion_follow_up_opened: {
        detail: "تم فتح متابعة ما بعد التسليم مع مالك وموعد واضحين على السجل المكتمل.",
        title: "فتح متابعة ما بعد التسليم"
      },
      handover_post_completion_follow_up_resolved: {
        detail: "تم إغلاق متابعة ما بعد التسليم بملخص حل واضح على السجل الحي.",
        title: "إغلاق متابعة ما بعد التسليم"
      },
      handover_archive_review_saved: {
        detail: "تم حفظ مراجعة الإغلاق الإداري وتحديد ما إذا كان السجل المكتمل جاهزاً للأرشفة أو يحتاج إلى تعليق.",
        title: "حفظ مراجعة الأرشفة"
      },
      handover_archive_status_updated: {
        detail: "تم تحديث حالة الأرشفة الإدارية على السجل المكتمل من دون تشغيل أي طبقة أرشفة خارجية.",
        title: "تحديث حالة الأرشفة"
      },
      handover_review_saved: {
        detail: "تم حفظ مراجعة المدير بعد التسليم وتحديد ما إذا كانت المتابعة اللاحقة مطلوبة.",
        title: "حفظ مراجعة ما بعد التسليم"
      },
      handover_customer_delivery_prepared: {
        detail: "تم تجهيز تحديث العميل المعتمد كرسالة جاهزة للإرسال لاحقاً من دون التواصل مع العميل بعد.",
        title: "تجهيز الإرسال"
      },
      handover_customer_dispatch_ready: {
        detail: "أصبح تحديث العميل المجهز جاهزاً للإرسال، وانتقل السجل إلى حالة مجدولة داخلياً.",
        title: "جاهزية الإرسال"
      },
      handover_customer_update_qa_review_requested: {
        detail: "تم تعليق التحديث المجهز بانتظار اعتماد جودة لأن الصياغة تضمنت إشارة سياسة تحتاج مراجعة بشرية.",
        title: "فتح اعتماد جودة للمسودة"
      },
      handover_customer_update_qa_review_resolved: {
        detail: "تم حفظ قرار الجودة على مسودة تحديث العميل المجهزة مع إبقاء النتيجة ظاهرة للفريق.",
        title: "إغلاق اعتماد جودة للمسودة"
      },
      handover_execution_started: {
        detail: "تم فتح حالة تنفيذ حي ليوم التسليم بعد تصفية العوائق المفتوحة.",
        title: "بدء التنفيذ"
      },
      handover_customer_update_approved: {
        detail: "تم اعتماد حد تواصل مخصص للعميل من دون إرسال أي رسالة حية.",
        title: "اعتماد حد التواصل"
      },
      handover_milestone_updated: {
        detail: "تم تحديث محطة التسليم وإعادة احتساب حالة حد التواصل المرتبط بها.",
        title: "تحديث محطة التسليم"
      },
      handover_task_updated: {
        detail: "تم تحديث أحد عناصر جاهزية التسليم وربط الأثر بالحالة الأساسية.",
        title: "تحديث عنصر جاهزية"
      },
      manager_follow_up_updated: {
        detail: "تم تحديث الخطة التالية للحالة وإزالة التدخل المفتوح.",
        title: "خطة متابعة جديدة"
      },
      qa_review_requested: {
        detail: "تم إرسال الحالة إلى طابور الجودة مع سبب عينة واضح لمراجعة السلامة أو التفسير أو جودة الرد.",
        title: "فتح مراجعة جودة"
      },
      qa_review_policy_opened: {
        detail: "تم فتح مراجعة جودة تلقائية لأن الرسالة الواردة طابقت إشارة سياسة تتطلب تدخلاً بشرياً.",
        title: "فتح مراجعة جودة تلقائية"
      },
      qa_review_resolved: {
        detail: "تم حفظ قرار مراجعة الجودة وإبقاء النتيجة ظاهرة في سجل الحالة.",
        title: "إغلاق مراجعة الجودة"
      },
      visit_scheduled: {
        detail: "تم ربط الحالة بموعد زيارة فعلي مع الموقع المحدد.",
        title: "موعد زيارة محفوظ"
      },
      website_lead_received: {
        detail: `وصلت الحالة من ${getSourceLabel(locale)} وتم إسنادها إلى ${caseDetail.ownerName}.`,
        title: "استلام عميل جديد"
      }
    },
    en: {
      automation_paused: {
        detail: "Follow-up automation was paused for this case while preserving the timeline.",
        title: "Automation paused"
      },
      automation_resumed: {
        detail: "Follow-up automation was resumed and the next check was queued again.",
        title: "Automation resumed"
      },
      case_qualified: {
        detail: "Qualification fields were captured and attached to the persisted case.",
        title: "Qualification updated"
      },
      document_request_updated: {
        detail: "One of the required document requests changed state for this case.",
        title: "Document status updated"
      },
      follow_up_intervention_opened: {
        detail: "The next action became overdue and a visible manager intervention was opened.",
        title: "Manager intervention opened"
      },
      handover_intake_created: {
        detail: "The case was approved into handover intake and the initial readiness checklist was opened.",
        title: "Handover intake started"
      },
      handover_appointment_confirmed: {
        detail: "The planned handover appointment was confirmed internally without triggering outbound delivery.",
        title: "Appointment confirmed internally"
      },
      handover_appointment_planned: {
        detail: "A real internal handover appointment was attached to the record behind the approved scheduling boundary.",
        title: "Appointment planned"
      },
      handover_completed: {
        detail: "The handover day was closed with a controlled completion summary after field execution was finished.",
        title: "Handover completed"
      },
      handover_post_completion_follow_up_opened: {
        detail: "A post-handover follow-up boundary was opened with an explicit owner and due time on the completed record.",
        title: "Post-handover follow-up opened"
      },
      handover_post_completion_follow_up_resolved: {
        detail: "The post-handover follow-up was closed with a clear resolution summary on the live record.",
        title: "Post-handover follow-up resolved"
      },
      handover_archive_review_saved: {
        detail: "The administrative closure review was saved and marked whether the completed record is ready to archive or should stay on hold.",
        title: "Archive review saved"
      },
      handover_archive_status_updated: {
        detail: "The administrative archive boundary changed on the completed record without triggering any external archiving system.",
        title: "Archive status updated"
      },
      handover_review_saved: {
        detail: "The manager review was saved after completion and recorded whether aftercare follow-up is required.",
        title: "Post-handover review saved"
      },
      handover_blocker_logged: {
        detail: "A live execution blocker was attached to the scheduled handover record to keep snag or field risk visible.",
        title: "Execution blocker logged"
      },
      handover_blocker_updated: {
        detail: "A handover execution blocker changed status, ownership, or due time on the live record.",
        title: "Execution blocker updated"
      },
      handover_execution_started: {
        detail: "The scheduled handover moved into a live execution state once open blockers were cleared.",
        title: "Execution started"
      },
      handover_customer_delivery_prepared: {
        detail: "The approved appointment-confirmation update was prepared for later dispatch without contacting the customer yet.",
        title: "Delivery prepared"
      },
      handover_customer_dispatch_ready: {
        detail: "The prepared customer update was promoted into a ready-to-dispatch boundary and the handover moved into a scheduled state.",
        title: "Dispatch readiness saved"
      },
      handover_customer_update_qa_review_requested: {
        detail: "The prepared customer update was paused behind a QA approval gate because the draft matched a human-review policy signal.",
        title: "Draft QA gate opened"
      },
      handover_customer_update_qa_review_resolved: {
        detail: "The QA decision on the prepared customer update was saved and kept visible on the live record.",
        title: "Draft QA gate resolved"
      },
      handover_customer_update_approved: {
        detail: "A customer-facing handover boundary was approved without sending any live outbound message.",
        title: "Customer boundary approved"
      },
      handover_milestone_updated: {
        detail: "A milestone target or state changed, and the linked customer-update boundary was recalculated.",
        title: "Milestone plan updated"
      },
      handover_task_updated: {
        detail: "One of the handover readiness items changed state and updated the linked case timeline.",
        title: "Handover task updated"
      },
      manager_follow_up_updated: {
        detail: "The follow-up plan was updated and the open intervention was cleared.",
        title: "Follow-up plan updated"
      },
      qa_review_requested: {
        detail: "The case was sent to the QA queue with an explicit sample reason for safety, interpretation, or response-quality review.",
        title: "QA review requested"
      },
      qa_review_policy_opened: {
        detail: "An automatic QA review was opened because the inbound message matched a human-review policy signal.",
        title: "Automatic QA review opened"
      },
      qa_review_resolved: {
        detail: "The QA decision was saved and kept visible on the live case record.",
        title: "QA review resolved"
      },
      visit_scheduled: {
        detail: "The case now has a scheduled visit with a saved location and time.",
        title: "Visit scheduled"
      },
      website_lead_received: {
        detail: `The lead arrived from ${getSourceLabel(locale)} and was assigned to ${caseDetail.ownerName}.`,
        title: "Website lead received"
      }
    }
  } as const;

  const copy = locale === "ar" ? descriptions.ar : descriptions.en;
  const eventCopy = copy[eventType as keyof typeof copy] ?? copy.website_lead_received;

  return eventCopy[variant];
}

function describeHandoverAuditEvent(
  handoverCase: PersistedHandoverCaseDetail,
  eventType: string,
  locale: SupportedLocale,
  variant: "detail" | "title"
) {
  const descriptions = {
    ar: {
      document_request_updated: {
        detail: "تم تحديث المستندات المرتبطة بهذه الحالة قبل أو أثناء اعتماد التسليم.",
        title: "تحديث حالة المستندات"
      },
      handover_intake_created: {
        detail: `تم إنشاء سجل تسليم حي للحالة وربطه بالمسؤول ${handoverCase.ownerName}.`,
        title: "إنشاء سجل التسليم"
      },
      handover_appointment_confirmed: {
        detail: "تم تأكيد موعد التسليم داخلياً دون تشغيل أي إرسال خارجي.",
        title: "تأكيد الموعد داخلياً"
      },
      handover_appointment_planned: {
        detail: "تم إرفاق موعد تسليم داخلي حي بالسجل بعد اعتماد حد الجدولة.",
        title: "تخطيط موعد التسليم"
      },
      handover_completed: {
        detail: "تم إغلاق يوم التسليم بملخص إتمام مضبوط وربطه بالسجل الحي.",
        title: "إتمام التسليم"
      },
      handover_post_completion_follow_up_opened: {
        detail: "تم فتح حد متابعة ما بعد التسليم على السجل المكتمل مع تعيين مالك وموعد واضحين.",
        title: "فتح متابعة ما بعد التسليم"
      },
      handover_post_completion_follow_up_resolved: {
        detail: "تم إغلاق متابعة ما بعد التسليم بملخص حل واضح.",
        title: "إغلاق متابعة ما بعد التسليم"
      },
      handover_archive_review_saved: {
        detail: "تم حفظ مراجعة الإغلاق الإداري وتحديد ما إذا كان السجل المكتمل جاهزاً للأرشفة أو يحتاج إلى تعليق يدوي.",
        title: "حفظ مراجعة الأرشفة"
      },
      handover_archive_status_updated: {
        detail: "تم تحديث حالة الأرشفة الإدارية على السجل المكتمل داخل حدود التشغيل الحالية فقط.",
        title: "تحديث حالة الأرشفة"
      },
      handover_review_saved: {
        detail: "تم حفظ مراجعة المدير بعد التسليم وتحديد حاجة الحالة إلى متابعة لاحقة.",
        title: "حفظ مراجعة ما بعد التسليم"
      },
      handover_blocker_logged: {
        detail: "تم تسجيل عائق تنفيذ حي لإبقاء المخاطر الميدانية أو الـ snag ظاهرة قبل يوم التسليم.",
        title: "تسجيل عائق تنفيذ"
      },
      handover_blocker_updated: {
        detail: "تم تحديث حالة عائق التنفيذ أو مالكه أو موعد معالجته في السجل الحي.",
        title: "تحديث عائق التنفيذ"
      },
      handover_execution_started: {
        detail: "تم نقل السجل المجدول إلى حالة تنفيذ حي بعد إغلاق العوائق المفتوحة.",
        title: "بدء التنفيذ"
      },
      handover_customer_delivery_prepared: {
        detail: "تم تجهيز رسالة تأكيد الموعد المعتمدة كحد جاهز للإرسال لاحقاً دون التواصل مع العميل بعد.",
        title: "تجهيز التحديث للإرسال"
      },
      handover_customer_dispatch_ready: {
        detail: "أصبح تحديث العميل المجهز جاهزاً للإرسال، وانتقل سجل التسليم إلى حالة مجدولة داخلياً.",
        title: "جاهزية الإرسال"
      },
      handover_customer_update_qa_review_requested: {
        detail: "تم تعليق التحديث المجهز بانتظار اعتماد جودة لأن الصياغة المجهزة طابقت إشارة سياسة تتطلب مراجعة بشرية.",
        title: "فتح اعتماد جودة للمسودة"
      },
      handover_customer_update_qa_review_resolved: {
        detail: "تم حفظ قرار الجودة على مسودة تحديث العميل مع إبقاء النتيجة ظاهرة في السجل الحي.",
        title: "إغلاق اعتماد جودة للمسودة"
      },
      handover_customer_update_approved: {
        detail: "تم اعتماد حد تواصل مخصص للعميل دون إرسال أي رسالة فعلية.",
        title: "اعتماد حد تواصل"
      },
      handover_milestone_updated: {
        detail: "تم تحديث محطة داخلية وإعادة احتساب حالة حد التواصل المرتبط بها.",
        title: "تحديث محطة التسليم"
      },
      handover_task_updated: {
        detail: "تم تغيير حالة أحد عناصر الجاهزية الداخلية.",
        title: "تحديث عنصر الجاهزية"
      }
    },
    en: {
      document_request_updated: {
        detail: "Documents tied to this case changed state before or during handover approval.",
        title: "Document state updated"
      },
      handover_intake_created: {
        detail: `A live handover record was created for this case and assigned to ${handoverCase.ownerName}.`,
        title: "Handover record created"
      },
      handover_appointment_confirmed: {
        detail: "The internal handover appointment was confirmed without triggering any live delivery.",
        title: "Appointment confirmed internally"
      },
      handover_appointment_planned: {
        detail: "A real internal handover appointment was planned on the live handover record.",
        title: "Appointment planned"
      },
      handover_completed: {
        detail: "The handover day was closed with a controlled completion summary on the live record.",
        title: "Handover completed"
      },
      handover_execution_started: {
        detail: "The scheduled record was promoted into a live handover-day execution state.",
        title: "Execution started"
      },
      handover_post_completion_follow_up_opened: {
        detail: "A post-handover follow-up boundary was opened on the completed record with explicit ownership and due time.",
        title: "Post-handover follow-up opened"
      },
      handover_post_completion_follow_up_resolved: {
        detail: "The post-handover follow-up was resolved with a clear resolution summary.",
        title: "Post-handover follow-up resolved"
      },
      handover_archive_review_saved: {
        detail: "The administrative closure review was saved and marked whether this completed handover is ready to archive or should remain on hold.",
        title: "Archive review saved"
      },
      handover_archive_status_updated: {
        detail: "The archive boundary status changed on the completed handover record inside the current admin closure workflow.",
        title: "Archive status updated"
      },
      handover_review_saved: {
        detail: "The manager review was recorded after completion and marked whether aftercare follow-up is required.",
        title: "Post-handover review saved"
      },
      handover_customer_delivery_prepared: {
        detail: "The approved appointment-confirmation update was prepared for later dispatch without contacting the customer yet.",
        title: "Delivery prepared"
      },
      handover_customer_dispatch_ready: {
        detail: "The prepared customer update is now ready to dispatch and the handover record is internally scheduled.",
        title: "Dispatch readiness saved"
      },
      handover_customer_update_qa_review_requested: {
        detail: "The prepared customer update was paused behind a QA approval gate because the draft matched a human-review policy signal.",
        title: "Draft QA gate opened"
      },
      handover_customer_update_qa_review_resolved: {
        detail: "The QA decision on the prepared customer update was saved and remains visible on the live record.",
        title: "Draft QA gate resolved"
      },
      handover_customer_update_approved: {
        detail: "A customer-facing handover boundary was approved without triggering any real outbound message.",
        title: "Customer boundary approved"
      },
      handover_milestone_updated: {
        detail: "A milestone changed and the linked customer-update boundary was recalculated.",
        title: "Milestone plan updated"
      },
      handover_task_updated: {
        detail: "One of the internal readiness items changed status.",
        title: "Readiness item updated"
      }
    }
  } as const;

  const copy = locale === "ar" ? descriptions.ar : descriptions.en;
  const eventCopy = copy[eventType as keyof typeof copy] ?? copy.handover_intake_created;

  return eventCopy[variant];
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short"
  });
}

function getDocumentTone(status: PersistedDocumentRequest["status"]): "success" | "critical" | "warning" {
  if (status === "accepted") {
    return "success";
  }

  if (status === "rejected") {
    return "critical";
  }

  return "warning";
}

function getHandoverTaskTone(status: PersistedHandoverCaseDetail["tasks"][number]["status"]): "success" | "critical" | "warning" {
  if (status === "complete") {
    return "success";
  }

  if (status === "blocked") {
    return "critical";
  }

  return "warning";
}

function getHandoverMilestoneTone(
  status: PersistedHandoverCaseDetail["milestones"][number]["status"]
): "success" | "critical" | "warning" {
  if (status === "ready") {
    return "success";
  }

  if (status === "blocked") {
    return "critical";
  }

  return "warning";
}

function getPersistedHandoverCaseTone(status: NonNullable<PersistedCaseDetail["handoverCase"]>["status"]) {
  if (status === "customer_scheduling_ready" || status === "completed") {
    return "success" as const;
  }

  if (status === "in_progress") {
    return "critical" as const;
  }

  return "warning" as const;
}

function getPersistedHandoverWorkspaceSurfaceLabel(locale: SupportedLocale, surface: "planning" | "execution" | "closure") {
  const labels = {
    ar: {
      closure: "الإغلاق",
      execution: "التنفيذ",
      planning: "التخطيط"
    },
    en: {
      closure: "Closure",
      execution: "Execution",
      planning: "Planning"
    }
  } as const;

  return labels[locale][surface];
}

function getHandoverCustomerUpdateTone(
  status: PersistedHandoverCaseDetail["customerUpdates"][number]["status"]
): "success" | "critical" | "warning" {
  if (status === "approved" || status === "prepared_for_delivery" || status === "ready_to_dispatch") {
    return "success";
  }

  if (status === "blocked") {
    return "critical";
  }

  return "warning";
}

function getHandoverCustomerUpdateQaReviewTone(
  status: PersistedHandoverCaseDetail["customerUpdates"][number]["qaReviewStatus"]
): "success" | "critical" | "warning" {
  if (status === "approved") {
    return "success";
  }

  if (status === "pending_review") {
    return "critical";
  }

  return "warning";
}

function getPreparedReplyDraftState(caseDetail: PersistedCaseDetail): LocalizedText {
  const qaReview = caseDetail.currentQaReview;

  if (!qaReview || qaReview.subjectType !== "prepared_reply_draft") {
    return {
      ar: "مسودة رد مجهزة",
      en: "Prepared reply draft"
    };
  }

  if (qaReview.status === "pending_review") {
    return qaReview.triggerSource === "policy_rule"
      ? {
          ar: "مسودة رد تنتظر اعتماد الجودة بعد إشارة سياسة",
          en: "Reply draft pending QA after a policy trigger"
        }
      : {
          ar: "مسودة رد تنتظر اعتماد الجودة",
          en: "Reply draft pending QA approval"
        };
  }

  if (qaReview.status === "follow_up_required") {
    return {
      ar: "الجودة طلبت تعديل مسودة الرد",
      en: "QA requested reply-draft changes"
    };
  }

  return {
    ar: "مسودة الرد معتمدة للجولة البشرية التالية",
    en: "Reply draft approved for the next human response"
  };
}

function getQaDisplayPriority(status: "approved" | "follow_up_required" | "pending_review" | "not_required") {
  if (status === "pending_review") {
    return 0;
  }

  if (status === "follow_up_required") {
    return 1;
  }

  if (status === "approved") {
    return 2;
  }

  return 3;
}

function getHandoverBlockerTone(status: PersistedHandoverCaseDetail["blockers"][number]["status"]): "success" | "critical" | "warning" {
  if (status === "resolved") {
    return "success";
  }

  if (status === "open") {
    return "critical";
  }

  return "warning";
}

function getHandoverBlockerSeverityTone(
  severity: PersistedHandoverCaseDetail["blockers"][number]["severity"]
): "critical" | "warning" {
  return severity === "critical" ? "critical" : "warning";
}

function getHandoverAppointmentTone(
  status: NonNullable<PersistedHandoverCaseDetail["appointment"]>["status"]
): "success" | "warning" {
  return status === "internally_confirmed" ? "success" : "warning";
}

function getInterventionTone(severity: PersistedCaseDetail["managerInterventions"][number]["severity"]): "critical" | "warning" {
  return severity === "critical" ? "critical" : "warning";
}
