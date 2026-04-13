import type {
  AutomationStatus,
  CaseAutomationHoldReason,
  CaseStage,
  CaseQaPolicySignal,
  CaseQaReviewStatus,
  CaseQaReviewTriggerSource,
  DocumentRequestStatus,
  DocumentRequestType,
  FollowUpStatus,
  HandoverAppointmentStatus,
  HandoverClosureState,
  HandoverArchiveOutcome,
  HandoverArchiveStatus,
  HandoverBlockerSeverity,
  HandoverBlockerStatus,
  HandoverBlockerType,
  HandoverCaseStatus,
  HandoverCustomerUpdateQaPolicySignal,
  HandoverCustomerUpdateQaReviewStatus,
  HandoverCustomerUpdateStatus,
  HandoverCustomerUpdateType,
  HandoverMilestoneStatus,
  HandoverMilestoneType,
  HandoverPostCompletionFollowUpStatus,
  HandoverReviewOutcome,
  HandoverTaskStatus,
  HandoverTaskType,
  ManagerInterventionSeverity,
  ManagerInterventionType,
  QualificationReadiness,
  SupportedLocale
} from "@real-estate-ai/contracts";

export function getAutomationStatusCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "تحديث حالة الأتمتة",
      active: "تشغيل الأتمتة",
      paused: "إيقاف الأتمتة",
      summary: "أوقف أو استأنف إنشاء تنبيهات المتابعة للحالة الحالية.",
      title: "التحكم في الأتمتة"
    };
  }

  return {
    action: "Update automation",
    active: "Resume automation",
    paused: "Pause automation",
    summary: "Pause or resume follow-up intervention generation for the current case.",
    title: "Automation control"
  };
}

export function getAutomationStatusLabel(locale: SupportedLocale, status: AutomationStatus) {
  const labels = {
    ar: {
      active: "نشطة",
      paused: "متوقفة"
    },
    en: {
      active: "Active",
      paused: "Paused"
    }
  } as const;

  return labels[locale][status];
}

export function getAutomationHoldReasonLabel(locale: SupportedLocale, reason: CaseAutomationHoldReason) {
  const labels = {
    ar: {
      qa_follow_up_required: "موقوفة بسبب متابعة الجودة",
      qa_pending_review: "موقوفة بانتظار الجودة"
    },
    en: {
      qa_follow_up_required: "Held by QA follow-up",
      qa_pending_review: "Held pending QA"
    }
  } as const;

  return labels[locale][reason];
}

export function getAutomationHoldReasonNote(
  locale: SupportedLocale,
  reason: CaseAutomationHoldReason,
  automationStatus: AutomationStatus
) {
  if (locale === "ar") {
    if (reason === "qa_follow_up_required") {
      return automationStatus === "paused"
        ? "الأتمتة موقوفة يدوياً، كما أن الجودة طلبت متابعة تصحيحية. لن تعود المتابعة التلقائية حتى تُرفع ملاحظة الجودة ويُعاد تشغيل الأتمتة."
        : "أوقفت الجودة المتابعة التلقائية لأن الحالة تحتاج تصحيحاً أو متابعة بشرية. ستظل الأتمتة محجوزة حتى تُغلق ملاحظة الجودة."
    }

    return automationStatus === "paused"
      ? "الأتمتة موقوفة يدوياً، كما أن الحالة داخل مراجعة جودة مفتوحة. حتى بعد رفع المراجعة ستظل الأتمتة متوقفة إلى أن يعاد تشغيلها."
      : "أوقفت مراجعة الجودة المتابعة التلقائية مؤقتاً. ستعود الأتمتة تلقائياً فقط بعد اعتماد الجودة النهائي."
  }

  if (reason === "qa_follow_up_required") {
    return automationStatus === "paused"
      ? "Automation is manually paused and QA also requires corrective follow-up. Follow-up will stay blocked until QA clears and automation is resumed."
      : "QA blocked follow-up automation because the case needs corrective work or human follow-up. Automation will remain held until that QA item is cleared."
  }

  return automationStatus === "paused"
    ? "Automation is manually paused and the case is also inside an open QA review. Even after QA clears, automation will stay paused until it is resumed."
    : "An open QA review is temporarily blocking follow-up automation. It will resume automatically only after QA clears the case.";
}

export function getCaseQaReviewStatusLabel(locale: SupportedLocale, status: CaseQaReviewStatus) {
  const labels = {
    ar: {
      approved: "مقبولة",
      follow_up_required: "تحتاج متابعة",
      pending_review: "بانتظار المراجعة"
    },
    en: {
      approved: "Approved",
      follow_up_required: "Follow-up required",
      pending_review: "Pending review"
    }
  } as const;

  return labels[locale][status];
}

export function getCaseQaReviewTriggerSourceLabel(locale: SupportedLocale, triggerSource: CaseQaReviewTriggerSource) {
  const labels = {
    ar: {
      manual_request: "طلب يدوي",
      policy_rule: "إشارة سياسة تلقائية"
    },
    en: {
      manual_request: "Manual request",
      policy_rule: "Automatic policy trigger"
    }
  } as const;

  return labels[locale][triggerSource];
}

export function getCaseQaPolicySignalLabel(locale: SupportedLocale, signal: CaseQaPolicySignal) {
  const labels = {
    ar: {
      discrimination_risk: "مخاطر تمييز أو عدالة",
      exception_request: "طلب استثناء",
      guaranteed_outcome_promise: "وعد مؤكد بنتيجة",
      frustrated_customer_language: "تصعيد أو انزعاج عميل",
      legal_escalation_risk: "مخاطر قانونية أو تنظيمية",
      pricing_or_exception_promise: "وعد سعري أو استثناء"
    },
    en: {
      discrimination_risk: "Discrimination risk",
      exception_request: "Exception request",
      guaranteed_outcome_promise: "Guaranteed outcome",
      frustrated_customer_language: "Frustrated customer",
      legal_escalation_risk: "Legal or regulatory risk",
      pricing_or_exception_promise: "Pricing or exception promise"
    }
  } as const;

  return labels[locale][signal];
}

export function getCaseQaReviewSubjectTypeLabel(locale: SupportedLocale, subjectType: "case_message" | "prepared_reply_draft") {
  const labels = {
    ar: {
      case_message: "رسالة الحالة",
      prepared_reply_draft: "مسودة رد مجهزة"
    },
    en: {
      case_message: "Case message",
      prepared_reply_draft: "Prepared reply draft"
    }
  } as const;

  return labels[locale][subjectType];
}

export function getCaseStageLabel(locale: SupportedLocale, stage: CaseStage) {
  const labels = {
    ar: {
      documents_in_progress: "المستندات قيد المتابعة",
      handover_initiated: "التسليم قيد التجهيز",
      new: "حالة جديدة",
      qualified: "مؤهلة",
      visit_scheduled: "زيارة مجدولة"
    },
    en: {
      documents_in_progress: "Documents in progress",
      handover_initiated: "Handover initiated",
      new: "New case",
      qualified: "Qualified",
      visit_scheduled: "Visit scheduled"
    }
  } as const;

  return labels[locale][stage];
}

export function getDocumentRequestDetail(locale: SupportedLocale, type: DocumentRequestType) {
  const details = {
    ar: {
      employment_letter: "لتأكيد جهة العمل أو الشركة ودعم مراجعة الجدارة.",
      government_id: "مطلوب للتحقق الأساسي من الهوية قبل تقدم الحالة.",
      proof_of_funds: "يساعد على تأكيد الجاهزية المالية قبل الحجز أو الانتقال للخطوة التالية."
    },
    en: {
      employment_letter: "Required to confirm employer or company context before manager review.",
      government_id: "Required for baseline identity verification before the case progresses.",
      proof_of_funds: "Used to confirm financial readiness before reservation or the next approval step."
    }
  } as const;

  return details[locale][type];
}

export function getDocumentRequestStatusLabel(locale: SupportedLocale, status: DocumentRequestStatus) {
  const labels = {
    ar: {
      accepted: "مقبول",
      rejected: "مرفوض",
      requested: "مطلوب",
      under_review: "قيد المراجعة"
    },
    en: {
      accepted: "Accepted",
      rejected: "Rejected",
      requested: "Requested",
      under_review: "Under review"
    }
  } as const;

  return labels[locale][status];
}

export function getDocumentRequestTypeLabel(locale: SupportedLocale, type: DocumentRequestType) {
  const labels = {
    ar: {
      employment_letter: "خطاب جهة العمل أو الشركة",
      government_id: "هوية حكومية",
      proof_of_funds: "إثبات ملاءة أو قدرة مالية"
    },
    en: {
      employment_letter: "Employment or company letter",
      government_id: "Government ID",
      proof_of_funds: "Proof of funds"
    }
  } as const;

  return labels[locale][type];
}

export function getFollowUpManagerCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ خطة المتابعة",
      nextAction: "الخطوة التالية",
      nextActionDueAt: "موعد الخطوة التالية",
      ownerName: "المالك الحالي",
      summary: "تحديث الخطوة التالية وموعدها وإسنادها لإزالة التدخل المفتوح وإعادة جدولة المتابعة.",
      title: "تدخل المدير"
    };
  }

  return {
    action: "Save follow-up plan",
    nextAction: "Next action",
    nextActionDueAt: "Next action due",
    ownerName: "Current owner",
    summary: "Update the next step, due time, and ownership to clear the open intervention and re-arm follow-up.",
    title: "Manager intervention"
  };
}

export function getQaReviewRequestCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "إرسال إلى الجودة",
      requestedByName: "الجهة الطالبة",
      sampleSummary: "سبب العينة أو المخاطر المراد مراجعتها",
      summary: "افتح مراجعة جودة واضحة عندما تحتاج الحالة إلى تدقيق بشري على السلامة أو التفسير أو جودة الرد.",
      title: "إرسال الحالة إلى الجودة"
    };
  }

  return {
    action: "Send to QA",
    requestedByName: "Requested by",
    sampleSummary: "Sampling reason or risk to review",
    summary: "Open an explicit QA review when the case needs human inspection for safety, interpretation, or response quality.",
    title: "Send case to QA"
  };
}

export function getCaseReplyDraftQaRequestCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "إرسال المسودة للجودة",
      draftMessage: "مسودة الرد المجهزة",
      requestedByName: "اسم الجهة الطالبة",
      summary: "جهز الرد التالي للعميل وارفعه إلى اعتماد الجودة مع إبقاء النص والأدلة المرصودة على سجل الحالة الحي.",
      title: "اعتماد جودة لمسودة الرد"
    };
  }

  return {
    action: "Send draft to QA",
    draftMessage: "Prepared reply draft",
    requestedByName: "Requested by",
    summary: "Prepare the next customer reply and send it into QA approval while keeping the draft text and any policy evidence on the live case record.",
    title: "Reply draft QA approval"
  };
}

export function getCaseManualReplyCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ الرد البشري",
      approvedDraftNote: "إذا كانت مسودة الرد الحالية معتمدة من الجودة، يجب إرسال النص المعتمد كما هو أو فتح مراجعة جديدة قبل تعديله.",
      message: "نص الرد المرسل",
      nextAction: "الخطوة التالية",
      nextActionDueAt: "موعد الخطوة التالية",
      sentByName: "أرسل بواسطة",
      summary: "سجل الرد البشري الفعلي على الحالة بعد اكتمال حدود الجودة، مع إبقاء الأثر ظاهراً في المحادثة والخط الزمني.",
      title: "إرسال رد بشري"
    };
  }

  return {
    action: "Save human reply",
    approvedDraftNote:
      "If the current reply draft is QA-approved, send the approved text exactly as-is or open a new review before editing it.",
    message: "Sent reply text",
    nextAction: "Next action",
    nextActionDueAt: "Next action due",
    sentByName: "Sent by",
    summary: "Record the real human reply on the case after governance clears, while keeping the outcome visible in the conversation and timeline.",
    title: "Send human reply"
  };
}

export function getQaReviewResolutionCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ قرار الجودة",
      approved: "اعتماد الحالة",
      followUpRequired: "تتطلب متابعة",
      reviewSummary: "ملخص قرار الجودة",
      reviewerName: "اسم المراجع",
      summary: "أغلق مراجعة الجودة بقرار واضح يوضح ما إذا كانت الحالة آمنة أو تحتاج تصحيحاً أو متابعة إضافية.",
      title: "قرار مراجعة الجودة"
    };
  }

  return {
    action: "Save QA decision",
    approved: "Approve case",
    followUpRequired: "Needs follow-up",
    reviewSummary: "QA decision summary",
    reviewerName: "Reviewer name",
    summary: "Close the QA review with an explicit decision about whether the case is safe to continue or needs corrective follow-up.",
    title: "QA review decision"
  };
}

export function getHandoverCustomerUpdateQaReviewCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ قرار الجودة",
      approved: "اعتماد المسودة",
      followUpRequired: "تحتاج تعديل",
      reviewSummary: "ملخص قرار الجودة",
      reviewerName: "اسم المراجع",
      summary: "اعتمد مسودة تحديث العميل المجهزة أو أعدها للفريق مع ملاحظات واضحة قبل اعتبارها جاهزة للإرسال.",
      title: "اعتماد جودة لمسودة التحديث"
    };
  }

  return {
    action: "Save QA decision",
    approved: "Approve draft",
    followUpRequired: "Needs draft changes",
    reviewSummary: "QA decision summary",
    reviewerName: "Reviewer name",
    summary: "Approve the prepared customer-update draft or send it back with explicit correction notes before it can become dispatch-ready.",
    title: "Draft QA approval"
  };
}

export function getFollowUpStatusLabel(locale: SupportedLocale, status: FollowUpStatus) {
  const labels = {
    ar: {
      attention: "تحتاج اهتماماً",
      on_track: "ضمن المتابعة"
    },
    en: {
      attention: "Needs attention",
      on_track: "On track"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverClosureStateLabel(locale: SupportedLocale, status: HandoverClosureState) {
  const labels = {
    ar: {
      aftercare_open: "متابعة ما بعد التسليم مفتوحة",
      archived: "مؤرشف",
      closure_review_required: "مراجعة الإغلاق مطلوبة",
      held: "معلق إدارياً",
      ready_to_archive: "جاهز للأرشفة"
    },
    en: {
      aftercare_open: "Aftercare open",
      archived: "Archived",
      closure_review_required: "Closure review required",
      held: "Admin hold",
      ready_to_archive: "Ready to archive"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverCaseStatusLabel(locale: SupportedLocale, status: HandoverCaseStatus) {
  const labels = {
    ar: {
      completed: "مكتملة",
      customer_scheduling_ready: "جاهزة لجدولة التسليم",
      in_progress: "قيد التنفيذ",
      internal_tasks_open: "المهام الداخلية قيد التنفيذ",
      pending_readiness: "بانتظار بدء الجاهزية",
      scheduled: "مجدولة داخلياً"
    },
    en: {
      completed: "Completed",
      customer_scheduling_ready: "Ready for customer scheduling",
      in_progress: "In progress",
      internal_tasks_open: "Internal tasks in progress",
      pending_readiness: "Pending readiness",
      scheduled: "Internally scheduled"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverIntakeCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "بدء مسار التسليم",
      helperLocked: "لن يظهر اعتماد التسليم حتى تصبح جميع المستندات المطلوبة في حالة مقبولة.",
      helperReady: "يبدأ هذا الاعتماد أول سجل تسليم حي ويربطه بالحالة الحالية دون ادعاء اكتمال الرحلة النهائية.",
      ownerName: "مالك حالة التسليم",
      readinessSummary: "ملخص جاهزية البداية",
      title: "اعتماد انتقال الحالة إلى التسليم"
    };
  }

  return {
    action: "Start handover intake",
    helperLocked: "Handover approval stays locked until every required document is in an accepted state.",
    helperReady: "This approval starts the first live handover record and links it to the current case without pretending the downstream journey is complete.",
    ownerName: "Handover owner",
    readinessSummary: "Initial readiness summary",
    title: "Approve the move into handover"
  };
}

export function getHandoverMilestoneCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ المحطة",
      ownerName: "مالك المحطة",
      status: "الحالة",
      summary: "خطط محطات التسليم التالية وحدد جاهزية كل محطة قبل اعتماد أي تواصل مع العميل.",
      targetAt: "التاريخ المستهدف",
      title: "خطة محطات التسليم"
    };
  }

  return {
    action: "Save milestone",
    ownerName: "Milestone owner",
    status: "Status",
    summary: "Plan the next handover milestones and make each checkpoint explicit before any customer-facing update is approved.",
    targetAt: "Target date",
    title: "Handover milestone plan"
  };
}

export function getHandoverExecutionCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "بدء التنفيذ",
      helper: "ينقل هذا السجل من حالة مجدولة إلى حالة تنفيذ حي بعد تصفية جميع العوائق المفتوحة، من دون ادعاء أي تكامل خارجي.",
      title: "بدء يوم التسليم"
    };
  }

  return {
    action: "Start execution",
    helper: "This promotes the record from scheduled into live handover-day execution once all open blockers are cleared, without pretending any external integration exists.",
    title: "Start handover day"
  };
}

export function getHandoverCompletionCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "إتمام التسليم",
      completionSummary: "ملخص الإتمام",
      helper: "أغلق يوم التسليم بملخص مضبوط بعد انتهاء التنفيذ ومعالجة العوائق المفتوحة.",
      title: "إتمام مضبوط"
    };
  }

  return {
    action: "Complete handover",
    completionSummary: "Completion summary",
    helper: "Close the handover day with a controlled summary after execution is complete and open blockers are resolved.",
    title: "Controlled completion"
  };
}

export function getHandoverReviewCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      accepted: "مكتمل بلا متابعة",
      action: "حفظ المراجعة",
      followUpRequired: "تتطلب متابعة",
      outcome: "النتيجة",
      summary: "ملخص المراجعة",
      title: "مراجعة ما بعد التسليم"
    };
  }

  return {
    accepted: "Completed without follow-up",
    action: "Save review",
    followUpRequired: "Follow-up required",
    outcome: "Outcome",
    summary: "Review summary",
    title: "Post-handover review"
  };
}

export function getHandoverReviewOutcomeLabel(locale: SupportedLocale, outcome: HandoverReviewOutcome) {
  const labels = {
    ar: {
      accepted: "مكتمل بلا متابعة",
      follow_up_required: "تتطلب متابعة"
    },
    en: {
      accepted: "Completed without follow-up",
      follow_up_required: "Follow-up required"
    }
  } as const;

  return labels[locale][outcome];
}

export function getHandoverPostCompletionFollowUpCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ المتابعة",
      dueAt: "موعد المتابعة",
      ownerName: "مالك المتابعة",
      summary: "ملخص المتابعة",
      title: "متابعة ما بعد التسليم"
    };
  }

  return {
    action: "Save follow-up",
    dueAt: "Follow-up due",
    ownerName: "Follow-up owner",
    summary: "Follow-up summary",
    title: "Post-handover follow-up"
  };
}

export function getHandoverPostCompletionFollowUpResolutionCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "إغلاق المتابعة",
      resolutionSummary: "ملخص الحل",
      title: "إغلاق المتابعة"
    };
  }

  return {
    action: "Resolve follow-up",
    resolutionSummary: "Resolution summary",
    title: "Resolve follow-up"
  };
}

export function getHandoverPostCompletionFollowUpStatusLabel(locale: SupportedLocale, status: HandoverPostCompletionFollowUpStatus) {
  const labels = {
    ar: {
      open: "مفتوحة",
      resolved: "مغلقة"
    },
    en: {
      open: "Open",
      resolved: "Resolved"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverArchiveReviewCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ مراجعة الأرشفة",
      holdForReview: "تعليق للمراجعة",
      outcome: "نتيجة الإغلاق",
      readyToArchive: "جاهز للأرشفة",
      summary: "ملخص الإغلاق الإداري",
      title: "مراجعة الإغلاق الإداري"
    };
  }

  return {
    action: "Save archive review",
    holdForReview: "Hold for review",
    outcome: "Closure outcome",
    readyToArchive: "Ready to archive",
    summary: "Administrative closure summary",
    title: "Administrative closure review"
  };
}

export function getHandoverArchiveOutcomeLabel(locale: SupportedLocale, outcome: HandoverArchiveOutcome) {
  const labels = {
    ar: {
      hold_for_review: "تعليق للمراجعة",
      ready_to_archive: "جاهز للأرشفة"
    },
    en: {
      hold_for_review: "Hold for review",
      ready_to_archive: "Ready to archive"
    }
  } as const;

  return labels[locale][outcome];
}

export function getHandoverArchiveStatusCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ حالة الأرشفة",
      archived: "مؤرشف",
      held: "معلق",
      ready: "جاهز",
      status: "حالة الأرشفة",
      summary: "ملخص حالة الأرشفة",
      title: "حالة الأرشفة الإدارية"
    };
  }

  return {
    action: "Save archive status",
    archived: "Archived",
    held: "Held",
    ready: "Ready",
    status: "Archive status",
    summary: "Archive status summary",
    title: "Administrative archive status"
  };
}

export function getHandoverArchiveStatusLabel(locale: SupportedLocale, status: HandoverArchiveStatus) {
  const labels = {
    ar: {
      archived: "مؤرشف",
      held: "معلق",
      ready: "جاهز للأرشفة"
    },
    en: {
      archived: "Archived",
      held: "Held for review",
      ready: "Ready to archive"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverMilestoneStatusLabel(locale: SupportedLocale, status: HandoverMilestoneStatus) {
  const labels = {
    ar: {
      blocked: "معطلة",
      planned: "مخططة",
      ready: "جاهزة"
    },
    en: {
      blocked: "Blocked",
      planned: "Planned",
      ready: "Ready"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverMilestoneTypeDetail(locale: SupportedLocale, type: HandoverMilestoneType) {
  const details = {
    ar: {
      customer_scheduling_window: "حدد النافذة الداخلية التي يصبح فيها التنسيق مع العميل آمناً وواضحاً.",
      handover_appointment_hold: "احتفظ بمحطة داخلية لموعد التسليم المتوقع قبل أي تأكيد نهائي.",
      readiness_gate: "أغلق مراجعة الجاهزية الأولية قبل التفكير في أي تواصل خارجي."
    },
    en: {
      customer_scheduling_window: "Plan the internal window when customer scheduling becomes safe and operationally clear.",
      handover_appointment_hold: "Hold the expected handover appointment checkpoint internally before any final confirmation.",
      readiness_gate: "Close the initial readiness review before any customer-facing communication is approved."
    }
  } as const;

  return details[locale][type];
}

export function getHandoverMilestoneTypeLabel(locale: SupportedLocale, type: HandoverMilestoneType) {
  const labels = {
    ar: {
      customer_scheduling_window: "نافذة جدولة العميل",
      handover_appointment_hold: "حجز موعد التسليم داخلياً",
      readiness_gate: "بوابة الجاهزية الأولى"
    },
    en: {
      customer_scheduling_window: "Customer scheduling window",
      handover_appointment_hold: "Internal appointment hold",
      readiness_gate: "Initial readiness gate"
    }
  } as const;

  return labels[locale][type];
}

export function getHandoverAppointmentPlanCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ موعد التسليم",
      coordinatorName: "منسق التسليم",
      helper: "يحفظ هذا الإجراء موعداً داخلياً فقط بعد اعتماد حد الجدولة، من دون أي إرسال خارجي للعميل.",
      location: "الموقع",
      scheduledAt: "موعد التسليم الداخلي",
      title: "تخطيط الموعد الداخلي"
    };
  }

  return {
    action: "Save handover appointment",
    coordinatorName: "Handover coordinator",
    helper: "This only saves the internal appointment after the scheduling boundary is approved. It does not send anything to the customer.",
    location: "Location",
    scheduledAt: "Internal handover time",
    title: "Internal appointment planning"
  };
}

export function getHandoverAppointmentStatusLabel(locale: SupportedLocale, status: HandoverAppointmentStatus) {
  const labels = {
    ar: {
      internally_confirmed: "مؤكد داخلياً",
      planned: "مخطط"
    },
    en: {
      internally_confirmed: "Internally confirmed",
      planned: "Planned"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverAppointmentConfirmationCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "تأكيد الموعد داخلياً",
      helper: "هذا التأكيد يثبت الموعد داخل حدود التشغيل الحالية ولا يرسل أي رسالة حقيقية للعميل.",
      title: "التأكيد الداخلي"
    };
  }

  return {
    action: "Confirm internally",
    helper: "This confirms the appointment inside the current operational boundary and does not send any real outbound message.",
    title: "Internal confirmation"
  };
}

export function getHandoverBlockerCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "تسجيل العائق",
      dueAt: "الموعد المستهدف للمعالجة",
      ownerName: "مالك المعالجة",
      severity: "الشدة",
      status: "الحالة",
      summary: "ملخص العائق",
      title: "عوائق التنفيذ"
    };
  }

  return {
    action: "Log blocker",
    dueAt: "Resolution due",
    ownerName: "Blocker owner",
    severity: "Severity",
    status: "Status",
    summary: "Blocker summary",
    title: "Execution blockers"
  };
}

export function getHandoverBlockerStatusLabel(locale: SupportedLocale, status: HandoverBlockerStatus) {
  const labels = {
    ar: {
      in_progress: "قيد المعالجة",
      open: "مفتوح",
      resolved: "تمت المعالجة"
    },
    en: {
      in_progress: "In progress",
      open: "Open",
      resolved: "Resolved"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverBlockerSeverityLabel(locale: SupportedLocale, severity: HandoverBlockerSeverity) {
  const labels = {
    ar: {
      critical: "حرج",
      warning: "يتطلب متابعة"
    },
    en: {
      critical: "Critical",
      warning: "Needs review"
    }
  } as const;

  return labels[locale][severity];
}

export function getHandoverBlockerTypeDetail(locale: SupportedLocale, type: HandoverBlockerType) {
  const details = {
    ar: {
      access_blocker: "يعكس عائقاً في بطاقات الوصول أو المفاتيح أو التنسيق الميداني قبل التنفيذ.",
      document_gap: "يعكس نقصاً في حزمة العميل أو المستندات التشغيلية المطلوبة في يوم التسليم.",
      unit_snag: "يعكس ملاحظة فنية أو snag في الوحدة يجب إغلاقها قبل التنفيذ الميداني."
    },
    en: {
      access_blocker: "Represents an access, key, or field-coordination issue before handover-day execution.",
      document_gap: "Represents a missing customer pack or operating document needed on handover day.",
      unit_snag: "Represents a physical unit snag that must be cleared before field execution."
    }
  } as const;

  return details[locale][type];
}

export function getHandoverBlockerTypeLabel(locale: SupportedLocale, type: HandoverBlockerType) {
  const labels = {
    ar: {
      access_blocker: "عائق الوصول",
      document_gap: "نقص في الحزمة أو المستندات",
      unit_snag: "snag أو ملاحظة في الوحدة"
    },
    en: {
      access_blocker: "Access blocker",
      document_gap: "Document gap",
      unit_snag: "Unit snag"
    }
  } as const;

  return labels[locale][type];
}

export function getHandoverDeliveryPreparationCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "تجهيز التحديث للإرسال",
      deliverySummary: "ملخص التجهيز",
      helper: "يحفظ هذا الإجراء رسالة مؤكدة جاهزة للإرسال لاحقاً من دون تشغيل أي قناة أو مزود خارجي.",
      title: "تجهيز الإرسال"
    };
  }

  return {
    action: "Prepare for dispatch",
    deliverySummary: "Delivery summary",
    helper: "This stores the approved update as outbound-ready content for later dispatch without triggering any live channel or provider.",
    title: "Delivery preparation"
  };
}

export function getHandoverDispatchReadyCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "تحويله إلى جاهز للإرسال",
      helper: "هذه الخطوة لا ترسل شيئاً للعميل، لكنها ترفع سجل التسليم إلى حالة مجدولة داخلياً.",
      title: "جاهزية الإرسال"
    };
  }

  return {
    action: "Mark ready to dispatch",
    helper: "This still does not send anything to the customer, but it promotes the handover record into an internally scheduled state.",
    title: "Dispatch readiness"
  };
}

export function getHandoverTaskStatusLabel(locale: SupportedLocale, status: HandoverTaskStatus) {
  const labels = {
    ar: {
      blocked: "معطل",
      complete: "مكتمل",
      open: "مفتوح"
    },
    en: {
      blocked: "Blocked",
      complete: "Complete",
      open: "Open"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverCustomerUpdateApprovalCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "اعتماد الحد",
      helper: "الاعتماد هنا يفتح التحديث كرسالة مسموح بها لاحقاً، لكنه لا يرسل أي شيء إلى العميل.",
      title: "حدود تواصل العميل"
    };
  }

  return {
    action: "Approve boundary",
    helper: "Approval here only marks the update as allowed for later communication. It does not send anything to the customer.",
    title: "Customer-update boundaries"
  };
}

export function getHandoverCustomerUpdateStatusLabel(locale: SupportedLocale, status: HandoverCustomerUpdateStatus) {
  const labels = {
    ar: {
      approved: "معتمد",
      blocked: "محجوب",
      prepared_for_delivery: "مجهز للإرسال",
      ready_for_approval: "جاهز للاعتماد",
      ready_to_dispatch: "جاهز للإرسال"
    },
    en: {
      approved: "Approved",
      blocked: "Blocked",
      prepared_for_delivery: "Prepared for delivery",
      ready_for_approval: "Ready for approval",
      ready_to_dispatch: "Ready to dispatch"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverCustomerUpdateQaReviewStatusLabel(
  locale: SupportedLocale,
  status: HandoverCustomerUpdateQaReviewStatus
) {
  const labels = {
    ar: {
      approved: "مجاز من الجودة",
      follow_up_required: "تعديل مطلوب",
      not_required: "لا يحتاج مراجعة",
      pending_review: "بانتظار الجودة"
    },
    en: {
      approved: "QA approved",
      follow_up_required: "Draft changes required",
      not_required: "No QA gate",
      pending_review: "Pending QA review"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverCustomerUpdateQaPolicySignalLabel(
  locale: SupportedLocale,
  signal: HandoverCustomerUpdateQaPolicySignal
) {
  const labels = {
    ar: {
      discrimination_risk: "صياغة تمييز أو عدالة حساسة",
      legal_claim_risk: "ادعاءات قانونية أو تنظيمية",
      possession_date_promise: "وعد بموعد تسليم أو مفاتيح",
      pricing_or_exception_promise: "وعد سعري أو استثناء"
    },
    en: {
      discrimination_risk: "Discrimination risk",
      legal_claim_risk: "Legal claim risk",
      possession_date_promise: "Possession-date promise",
      pricing_or_exception_promise: "Pricing or exception promise"
    }
  } as const;

  return labels[locale][signal];
}

export function getHandoverCustomerUpdateTypeDetail(locale: SupportedLocale, type: HandoverCustomerUpdateType) {
  const details = {
    ar: {
      appointment_confirmation: "حد داخلي لتأكيد موعد التسليم ثم تجهيزه كرسالة جاهزة للإرسال عندما تصبح المحطة النهائية مكتملة.",
      readiness_update: "حد مبكر لمشاركة تقدم الجاهزية مع العميل عند اكتمال المراجعة الأولية.",
      scheduling_invite: "حد واضح لتوجيه دعوة جدولة التسليم عندما تجهز النافذة التشغيلية."
    },
    en: {
      appointment_confirmation: "Internal boundary for confirming the handover appointment and then preparing the eventual customer update once the final checkpoint is ready.",
      readiness_update: "Early boundary for sharing readiness progress with the customer after the initial gate is ready.",
      scheduling_invite: "Clear boundary for offering customer scheduling once the operational window is ready."
    }
  } as const;

  return details[locale][type];
}

export function getHandoverCustomerUpdateTypeLabel(locale: SupportedLocale, type: HandoverCustomerUpdateType) {
  const labels = {
    ar: {
      appointment_confirmation: "تأكيد موعد التسليم",
      readiness_update: "تحديث الجاهزية الأولي",
      scheduling_invite: "دعوة جدولة التسليم"
    },
    en: {
      appointment_confirmation: "Appointment confirmation",
      readiness_update: "Initial readiness update",
      scheduling_invite: "Scheduling invite"
    }
  } as const;

  return labels[locale][type];
}

export function getHandoverTaskTypeDetail(locale: SupportedLocale, type: HandoverTaskType) {
  const details = {
    ar: {
      access_preparation: "مراجعة بطاقات الوصول والمفاتيح والنقاط اللوجستية قبل التواصل النهائي مع العميل.",
      customer_document_pack: "تأكيد أن حزمة العميل النهائية جاهزة ومرتبطة بالسجل الصحيح.",
      unit_readiness_review: "فحص الجاهزية الداخلية للوحدة والتأكد من عدم وجود عوائق فورية."
    },
    en: {
      access_preparation: "Confirm access cards, keys, and the final logistics package before customer scheduling.",
      customer_document_pack: "Ensure the final customer document pack is complete and tied to the correct record.",
      unit_readiness_review: "Review the internal unit-readiness state and confirm there are no immediate blockers."
    }
  } as const;

  return details[locale][type];
}

export function getHandoverTaskTypeLabel(locale: SupportedLocale, type: HandoverTaskType) {
  const labels = {
    ar: {
      access_preparation: "تجهيز الوصول والتسليم",
      customer_document_pack: "حزمة العميل النهائية",
      unit_readiness_review: "مراجعة جاهزية الوحدة"
    },
    en: {
      access_preparation: "Access and handover pack",
      customer_document_pack: "Customer document pack",
      unit_readiness_review: "Unit readiness review"
    }
  } as const;

  return labels[locale][type];
}

export function getInterventionCountLabel(locale: SupportedLocale, count: number) {
  if (locale === "ar") {
    return count === 1 ? "تدخل مفتوح واحد" : `${count} تدخلات مفتوحة`;
  }

  return count === 1 ? "1 open intervention" : `${count} open interventions`;
}

export function getInterventionSeverityLabel(locale: SupportedLocale, severity: ManagerInterventionSeverity) {
  const labels = {
    ar: {
      critical: "حرج",
      warning: "يتطلب متابعة"
    },
    en: {
      critical: "Critical",
      warning: "Needs review"
    }
  } as const;

  return labels[locale][severity];
}

export function getInterventionSummary(locale: SupportedLocale, type: ManagerInterventionType) {
  const summaries = {
    ar: {
      follow_up_overdue: "تجاوزت الخطوة التالية موعدها المحدد وتحتاج إلى تدخل المدير."
    },
    en: {
      follow_up_overdue: "The next action is overdue and now requires manager intervention."
    }
  } as const;

  return summaries[locale][type];
}

export function getIntakeCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "إنشاء الحالة الحية",
      budget: "الميزانية",
      customerName: "اسم العميل",
      email: "البريد الإلكتروني",
      helper: "هذا النموذج يرسل إلى واجهة `apps/api` الحية عند توفرها، مع بقاء واجهة العرض التجريبية سليمة إذا لم تكن الخدمة تعمل.",
      message: "تفاصيل الطلب",
      phone: "رقم الهاتف",
      preferredLanguage: "لغة العميل المفضلة",
      projectInterest: "المشروع أو الوحدة المطلوبة",
      summary: "إثبات أول مسار حي من الموقع إلى الحالة المحفوظة ثم إلى شاشة الإدارة.",
      title: "التقاط عميل جديد"
    };
  }

  return {
    action: "Create live case",
    budget: "Budget",
    customerName: "Customer name",
    email: "Email",
    helper: "This form posts into the live `apps/api` alpha when it is available, while the demo shell still degrades safely when it is not.",
    message: "Inquiry details",
    phone: "Phone",
    preferredLanguage: "Customer preferred language",
    projectInterest: "Project or unit of interest",
    summary: "Prove the first live path from website intake to a persisted case and into manager-facing views.",
    title: "Capture a live website lead"
  };
}

export function getQualificationCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ التأهيل",
      budgetBand: "نطاق الميزانية",
      intentSummary: "ملخص النية والملاءمة",
      moveInTimeline: "الإطار الزمني للانتقال",
      readiness: "درجة الجاهزية",
      summary: "تسجيل التأهيل بشكل منظم بدل إبقائه داخل المحادثة فقط.",
      title: "تأهيل الحالة"
    };
  }

  return {
    action: "Save qualification",
    budgetBand: "Budget band",
    intentSummary: "Intent and fit summary",
    moveInTimeline: "Move-in timeline",
    readiness: "Readiness score",
    summary: "Capture qualification in a structured way instead of leaving it buried in the thread.",
    title: "Qualification snapshot"
  };
}

export function getQualificationReadinessLabel(locale: SupportedLocale, readiness: QualificationReadiness) {
  const labels = {
    ar: {
      high: "عالية",
      medium: "متوسطة",
      watch: "تحتاج متابعة"
    },
    en: {
      high: "High",
      medium: "Medium",
      watch: "Watch"
    }
  } as const;

  return labels[locale][readiness];
}

export function getSourceLabel(locale: SupportedLocale) {
  return locale === "ar" ? "نموذج الموقع" : "Website form";
}

export function getVisitCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      action: "حفظ موعد الزيارة",
      location: "الموقع",
      scheduledAt: "تاريخ ووقت الزيارة",
      summary: "ربط الحالة بموعد حقيقي وتحديث الخطوة التالية للإدارة.",
      title: "جدولة الزيارة"
    };
  }

  return {
    action: "Save visit",
    location: "Location",
    scheduledAt: "Visit date and time",
    summary: "Attach a real appointment to the case and move the next action forward for managers.",
    title: "Visit scheduling"
  };
}
