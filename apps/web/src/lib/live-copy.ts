import type {
  AutomationStatus,
  CaseStage,
  DocumentRequestStatus,
  DocumentRequestType,
  FollowUpStatus,
  HandoverCaseStatus,
  HandoverCustomerUpdateStatus,
  HandoverCustomerUpdateType,
  HandoverMilestoneStatus,
  HandoverMilestoneType,
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

export function getHandoverCaseStatusLabel(locale: SupportedLocale, status: HandoverCaseStatus) {
  const labels = {
    ar: {
      customer_scheduling_ready: "جاهزة لجدولة التسليم",
      internal_tasks_open: "المهام الداخلية قيد التنفيذ",
      pending_readiness: "بانتظار بدء الجاهزية"
    },
    en: {
      customer_scheduling_ready: "Ready for customer scheduling",
      internal_tasks_open: "Internal tasks in progress",
      pending_readiness: "Pending readiness"
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
      ready_for_approval: "جاهز للاعتماد"
    },
    en: {
      approved: "Approved",
      blocked: "Blocked",
      ready_for_approval: "Ready for approval"
    }
  } as const;

  return labels[locale][status];
}

export function getHandoverCustomerUpdateTypeDetail(locale: SupportedLocale, type: HandoverCustomerUpdateType) {
  const details = {
    ar: {
      appointment_confirmation: "حد داخلي لتأكيد موعد التسليم عندما تصبح المحطة النهائية جاهزة.",
      readiness_update: "حد مبكر لمشاركة تقدم الجاهزية مع العميل عند اكتمال المراجعة الأولية.",
      scheduling_invite: "حد واضح لتوجيه دعوة جدولة التسليم عندما تجهز النافذة التشغيلية."
    },
    en: {
      appointment_confirmation: "Internal boundary for confirming the handover appointment once the final checkpoint is ready.",
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
