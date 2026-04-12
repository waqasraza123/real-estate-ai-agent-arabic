import type {
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedDocumentRequest,
  PersistedHandoverCaseDetail,
  SupportedLocale
} from "@real-estate-ai/contracts";
import type { ConversationMessage, JourneyEvent } from "@real-estate-ai/domain";

import {
  getAutomationStatusLabel,
  getCaseStageLabel,
  getDocumentRequestDetail,
  getDocumentRequestStatusLabel,
  getDocumentRequestTypeLabel,
  getFollowUpStatusLabel,
  getHandoverAppointmentStatusLabel,
  getHandoverBlockerSeverityLabel,
  getHandoverBlockerStatusLabel,
  getHandoverBlockerTypeDetail,
  getHandoverBlockerTypeLabel,
  getHandoverCaseStatusLabel,
  getHandoverCustomerUpdateStatusLabel,
  getHandoverCustomerUpdateTypeDetail,
  getHandoverCustomerUpdateTypeLabel,
  getHandoverMilestoneStatusLabel,
  getHandoverMilestoneTypeDetail,
  getHandoverMilestoneTypeLabel,
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
  return [
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
      state: {
        ar: "تم توليدها من حالة حية محفوظة",
        en: "Generated from the persisted alpha workflow"
      },
      timestamp: formatTimestamp(caseDetail.updatedAt)
    }
  ];
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
      handover_customer_delivery_prepared: {
        detail: "تم تجهيز تحديث العميل المعتمد كرسالة جاهزة للإرسال لاحقاً من دون التواصل مع العميل بعد.",
        title: "تجهيز الإرسال"
      },
      handover_customer_dispatch_ready: {
        detail: "أصبح تحديث العميل المجهز جاهزاً للإرسال، وانتقل السجل إلى حالة مجدولة داخلياً.",
        title: "جاهزية الإرسال"
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
      handover_blocker_logged: {
        detail: "A live execution blocker was attached to the scheduled handover record to keep snag or field risk visible.",
        title: "Execution blocker logged"
      },
      handover_blocker_updated: {
        detail: "A handover execution blocker changed status, ownership, or due time on the live record.",
        title: "Execution blocker updated"
      },
      handover_customer_delivery_prepared: {
        detail: "The approved appointment-confirmation update was prepared for later dispatch without contacting the customer yet.",
        title: "Delivery prepared"
      },
      handover_customer_dispatch_ready: {
        detail: "The prepared customer update was promoted into a ready-to-dispatch boundary and the handover moved into a scheduled state.",
        title: "Dispatch readiness saved"
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
      handover_blocker_logged: {
        detail: "تم تسجيل عائق تنفيذ حي لإبقاء المخاطر الميدانية أو الـ snag ظاهرة قبل يوم التسليم.",
        title: "تسجيل عائق تنفيذ"
      },
      handover_blocker_updated: {
        detail: "تم تحديث حالة عائق التنفيذ أو مالكه أو موعد معالجته في السجل الحي.",
        title: "تحديث عائق التنفيذ"
      },
      handover_customer_delivery_prepared: {
        detail: "تم تجهيز رسالة تأكيد الموعد المعتمدة كحد جاهز للإرسال لاحقاً دون التواصل مع العميل بعد.",
        title: "تجهيز التحديث للإرسال"
      },
      handover_customer_dispatch_ready: {
        detail: "أصبح تحديث العميل المجهز جاهزاً للإرسال، وانتقل سجل التسليم إلى حالة مجدولة داخلياً.",
        title: "جاهزية الإرسال"
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
      handover_customer_delivery_prepared: {
        detail: "The approved appointment-confirmation update was prepared for later dispatch without contacting the customer yet.",
        title: "Delivery prepared"
      },
      handover_customer_dispatch_ready: {
        detail: "The prepared customer update is now ready to dispatch and the handover record is internally scheduled.",
        title: "Dispatch readiness saved"
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
