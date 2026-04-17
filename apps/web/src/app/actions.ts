"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  operatorSessionCookieName,
  operatorRoleSchema,
  approveHandoverCustomerUpdateInputSchema,
  completeHandoverInputSchema,
  confirmHandoverAppointmentInputSchema,
  createHandoverBlockerInputSchema,
  createHandoverPostCompletionFollowUpInputSchema,
  createHandoverIntakeInputSchema,
  createWebsiteLeadInputSchema,
  manageBulkCaseFollowUpInputSchema,
  markHandoverCustomerUpdateDispatchReadyInputSchema,
  manageCaseFollowUpInputSchema,
  planHandoverAppointmentInputSchema,
  prepareCaseReplyDraftQaReviewInputSchema,
  prepareHandoverCustomerUpdateDeliveryInputSchema,
  qualifyCaseInputSchema,
  requestCaseQaReviewInputSchema,
  resolveCaseQaReviewInputSchema,
  resolveHandoverCustomerUpdateQaReviewInputSchema,
  resolveHandoverPostCompletionFollowUpInputSchema,
  saveHandoverArchiveReviewInputSchema,
  scheduleVisitInputSchema,
  sendCaseReplyInputSchema,
  saveHandoverReviewInputSchema,
  startHandoverExecutionInputSchema,
  supportedLocaleSchema,
  updateHandoverArchiveStatusInputSchema,
  updateAutomationStatusInputSchema,
  updateDocumentRequestInputSchema,
  updateHandoverBlockerInputSchema,
  updateHandoverMilestoneInputSchema,
  updateHandoverTaskStatusInputSchema
} from "@real-estate-ai/contracts";

import { initialFormActionState, type FormActionState } from "@/lib/form-action-state";
import { canUseOperatorRoleAccessKey } from "@/lib/operator-access";
import {
  defaultOperatorRole,
  getInsufficientRoleError,
  getOperatorPermissionGuardNote
} from "@/lib/operator-role";
import { createSignedOperatorSession, getCurrentOperatorRole } from "@/lib/operator-session";
import {
  WebApiError,
  approveHandoverCustomerUpdate,
  completeHandover,
  confirmHandoverAppointment,
  createHandoverBlocker,
  createHandoverPostCompletionFollowUp,
  createHandoverIntake,
  createWebsiteLead,
  markHandoverCustomerUpdateDispatchReady,
  manageBulkCaseFollowUp,
  manageCaseFollowUp,
  planHandoverAppointment,
  prepareCaseReplyDraftQaReview,
  prepareHandoverCustomerUpdateDelivery,
  qualifyCase,
  requestCaseQaReview,
  resolveCaseQaReview,
  resolveHandoverCustomerUpdateQaReview,
  resolveHandoverPostCompletionFollowUp,
  saveHandoverArchiveReview,
  scheduleVisit,
  sendCaseReply,
  saveHandoverReview,
  startHandoverExecution,
  updateHandoverArchiveStatus,
  updateAutomationStatus,
  updateDocumentRequest,
  updateHandoverBlocker,
  updateHandoverMilestone,
  updateHandoverTask
} from "@/lib/live-api";

export async function setOperatorRoleAction(formData: FormData) {
  const roleResult = operatorRoleSchema.safeParse(formData.get("operatorRole"));
  const accessKeyValue = formData.get("accessKey");
  const returnPathValue = formData.get("returnPath");
  const returnPath = typeof returnPathValue === "string" && returnPathValue.startsWith("/") ? returnPathValue : "/en";
  const cookieStore = await cookies();
  const operatorRole = roleResult.success ? roleResult.data : defaultOperatorRole;
  const accessKey = typeof accessKeyValue === "string" ? accessKeyValue : "";

  if (!canUseOperatorRoleAccessKey(operatorRole, accessKey)) {
    const separator = returnPath.includes("?") ? "&" : "?";

    redirect(`${returnPath}${separator}role_access=denied`);
  }

  cookieStore.set(operatorSessionCookieName, createSignedOperatorSession(operatorRole), {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  });

  redirect(returnPath);
}

export async function createHandoverIntakeAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = createHandoverIntakeInputSchema.safeParse({
    ownerName: normalizeOptionalString(formData.get("ownerName")),
    readinessSummary: formData.get("readinessSummary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await createHandoverIntake(caseId, result.data);
    const handoverCaseId = updatedCase.handoverCase?.handoverCaseId;
    revalidatePaths(locale, returnPath, caseId, handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم إنشاء مسار التسليم الأولي وربطه بالحالة."
          : "The first handover intake record was created and linked to the case.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن بدء التسليم قبل اكتمال المستندات المقبولة أو إذا كانت حالة التسليم موجودة مسبقاً."
            : "Handover cannot start until the documents are fully accepted and no handover case already exists.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function saveManagerFollowUpAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");
  const nextActionDueAt = formData.get("nextActionDueAt");

  if (typeof caseId !== "string" || typeof returnPath !== "string" || typeof nextActionDueAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = manageCaseFollowUpInputSchema.safeParse({
    nextAction: formData.get("nextAction"),
    nextActionDueAt: toIsoDateTimeOrEmpty(nextActionDueAt),
    ownerName: normalizeOptionalString(formData.get("ownerName"))
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await manageCaseFollowUp(caseId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم تحديث خطة المتابعة وإزالة التدخل المفتوح."
          : "The follow-up plan was updated and the open intervention was cleared.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function saveBulkManagerFollowUpAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const returnPath = formData.get("returnPath");
  const nextActionDueAt = formData.get("nextActionDueAt");

  if (typeof returnPath !== "string" || typeof nextActionDueAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = manageBulkCaseFollowUpInputSchema.safeParse({
    caseIds: formData.getAll("caseIds"),
    expectedCurrentOwnerName: formData.get("expectedCurrentOwnerName"),
    nextAction: formData.get("nextAction"),
    nextActionDueAt: toIsoDateTimeOrEmpty(nextActionDueAt),
    ownerName: normalizeOptionalString(formData.get("ownerName"))
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updateResult = await manageBulkCaseFollowUp(result.data, await getOperatorRole());

    for (const updatedCase of updateResult.updatedCases) {
      revalidatePaths(locale, returnPath, updatedCase.caseId, updatedCase.handoverCase?.handoverCaseId);
    }

    return {
      message:
        locale === "ar"
          ? `تم تحديث ${updateResult.updatedCases.length} حالات وحفظ خطة متابعة موحدة لها.`
          : `Updated ${updateResult.updatedCases.length} cases with one shared follow-up plan.`,
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 404) {
      return {
        message:
          locale === "ar"
            ? "تعذر إكمال الإجراء لأن واحدة أو أكثر من الحالات المحددة لم تعد متاحة داخل النطاق الحي."
            : "The bulk action could not finish because one or more selected cases are no longer available in the live scope.",
        status: "error"
      };
    }

    if (error instanceof WebApiError && error.status === 409) {
      const errorCode = typeof error.body === "object" && error.body && "error" in error.body ? error.body.error : null;

      if (errorCode === "case_follow_up_scope_mismatch") {
        return {
          message:
            locale === "ar"
              ? "تغيّر مالك واحدة أو أكثر من الحالات المحددة. أعد تحميل النطاق قبل تطبيق الإجراء الجماعي."
              : "One or more selected cases changed owner. Refresh the scoped queue before applying the bulk action.",
          status: "error"
        };
      }
    }

    return getActionError(locale, error);
  }
}

export async function requestCaseQaReviewAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = requestCaseQaReviewInputSchema.safeParse({
    requestedByName: normalizeOptionalString(formData.get("requestedByName")),
    sampleSummary: formData.get("sampleSummary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await requestCaseQaReview(caseId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم إرسال الحالة إلى طابور مراجعة الجودة مع ملخص واضح للعينة."
          : "The case was sent to the QA review queue with a clear sampling summary.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "توجد مراجعة جودة مفتوحة بالفعل لهذه الحالة."
            : "An open QA review already exists for this case.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function prepareCaseReplyDraftQaReviewAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = prepareCaseReplyDraftQaReviewInputSchema.safeParse({
    draftMessage: formData.get("draftMessage"),
    requestedByName: normalizeOptionalString(formData.get("requestedByName"))
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await prepareCaseReplyDraftQaReview(caseId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ مسودة الرد وإرسالها إلى اعتماد الجودة قبل متابعة المحادثة."
          : "The prepared reply draft was saved and sent into the QA approval boundary.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "توجد مراجعة جودة مفتوحة بالفعل لهذه الحالة."
            : "An open QA review already exists for this case.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function resolveCaseQaReviewAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const qaReviewId = formData.get("qaReviewId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof qaReviewId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = resolveCaseQaReviewInputSchema.safeParse({
    reviewSummary: formData.get("reviewSummary"),
    reviewerName: normalizeOptionalString(formData.get("reviewerName")),
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await resolveCaseQaReview(caseId, qaReviewId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ قرار مراجعة الجودة وتحديث سجل الحالة."
          : "The QA review decision was saved and the case record was updated.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن إغلاق مراجعة الجودة لأن العنصر لم يعد بانتظار المراجعة."
            : "This QA review can no longer be resolved because it is not pending anymore.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function sendCaseReplyAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const nextActionDueAt = formData.get("nextActionDueAt");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof nextActionDueAt !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = sendCaseReplyInputSchema.safeParse({
    message: formData.get("message"),
    nextAction: formData.get("nextAction"),
    nextActionDueAt: toIsoDateTimeOrEmpty(nextActionDueAt),
    sentByName: normalizeOptionalString(formData.get("sentByName"))
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await sendCaseReply(caseId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ الرد البشري على السجل الحي للحالة."
          : "The human reply was saved on the live case record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      const errorCode =
        typeof error.body === "object" && error.body !== null && "error" in error.body && typeof error.body.error === "string"
          ? error.body.error
          : null;

      if (errorCode === "qa_review_reply_send_blocked") {
        return {
          message:
            locale === "ar"
              ? "لا يمكن إرسال رد بشري بينما مراجعة الجودة الحالية ما زالت مفتوحة أو تطلب متابعة."
              : "A human reply cannot be sent while the current QA review is still open or requires follow-up.",
          status: "error"
        };
      }

      if (errorCode === "qa_approved_reply_draft_mismatch") {
        return {
          message:
            locale === "ar"
              ? "الرد المعتمد من الجودة لا يمكن تعديله مباشرة. أرسل النص المعتمد كما هو أو افتح مراجعة جودة جديدة."
              : "The QA-approved reply draft cannot be edited inline. Send the approved text exactly as-is or open a new QA review.",
          status: "error"
        };
      }
    }

    return getActionError(locale, error);
  }
}

export async function saveQualificationAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = qualifyCaseInputSchema.safeParse({
    budgetBand: formData.get("budgetBand"),
    intentSummary: formData.get("intentSummary"),
    moveInTimeline: formData.get("moveInTimeline"),
    readiness: formData.get("readiness")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await qualifyCase(caseId, result.data);
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message: locale === "ar" ? "تم حفظ التأهيل وتحديث الحالة." : "Qualification saved and the case has been updated.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function scheduleVisitAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");
  const scheduledAt = formData.get("scheduledAt");

  if (typeof caseId !== "string" || typeof returnPath !== "string" || typeof scheduledAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = scheduleVisitInputSchema.safeParse({
    location: formData.get("location"),
    scheduledAt: toIsoDateTimeOrEmpty(scheduledAt)
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await scheduleVisit(caseId, result.data);
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message: locale === "ar" ? "تم حفظ موعد الزيارة." : "The visit was scheduled successfully.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function submitWebsiteLeadAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));

  const result = createWebsiteLeadInputSchema.safeParse({
    budget: normalizeOptionalString(formData.get("budget")),
    customerName: formData.get("customerName"),
    email: formData.get("email"),
    message: formData.get("message"),
    phone: normalizeOptionalString(formData.get("phone")),
    preferredLocale: formData.get("preferredLocale"),
    projectInterest: formData.get("projectInterest")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const createdCase = await createWebsiteLead(result.data);
    revalidatePath(`/${locale}/leads`);
    revalidatePath(`/${locale}/manager`);
    redirect(`/${locale}/leads/${createdCase.caseId}`);
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function updateAutomationStatusAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateAutomationStatusInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await updateAutomationStatus(caseId, result.data, await getOperatorRole());
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? result.data.status === "paused"
            ? "تم إيقاف الأتمتة لهذه الحالة."
            : "تمت إعادة تشغيل الأتمتة لهذه الحالة."
          : result.data.status === "paused"
            ? "Automation was paused for this case."
            : "Automation was resumed for this case.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function updateDocumentStatusAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const caseId = formData.get("caseId");
  const documentRequestId = formData.get("documentRequestId");
  const returnPath = formData.get("returnPath");

  if (typeof caseId !== "string" || typeof documentRequestId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateDocumentRequestInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedCase = await updateDocumentRequest(caseId, documentRequestId, result.data);
    revalidatePaths(locale, returnPath, caseId, updatedCase.handoverCase?.handoverCaseId);

    return {
      message: locale === "ar" ? "تم تحديث حالة المستند." : "The document state was updated.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function updateHandoverTaskStatusAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const handoverTaskId = formData.get("handoverTaskId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof handoverTaskId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateHandoverTaskStatusInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await updateHandoverTask(handoverCaseId, handoverTaskId, result.data);
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم تحديث عنصر جاهزية التسليم." : "The handover readiness item was updated.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function createHandoverBlockerAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");
  const dueAt = formData.get("dueAt");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string" || typeof dueAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = createHandoverBlockerInputSchema.safeParse({
    dueAt: toIsoDateTimeOrEmpty(dueAt),
    ownerName: normalizeOptionalString(formData.get("ownerName")),
    severity: formData.get("severity"),
    status: formData.get("status"),
    summary: formData.get("summary"),
    type: formData.get("type")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await createHandoverBlocker(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم تسجيل عائق التنفيذ في السجل الحي." : "The execution blocker was logged on the live handover record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن تسجيل عوائق التنفيذ قبل وصول السجل إلى حالة التسليم المجدولة."
            : "Execution blockers can only be logged after the handover record reaches the scheduled boundary.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function updateHandoverBlockerAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const blockerId = formData.get("blockerId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");
  const dueAt = formData.get("dueAt");

  if (typeof blockerId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string" || typeof dueAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateHandoverBlockerInputSchema.safeParse({
    dueAt: toIsoDateTimeOrEmpty(dueAt),
    ownerName: normalizeOptionalString(formData.get("ownerName")),
    severity: formData.get("severity"),
    status: formData.get("status"),
    summary: formData.get("summary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await updateHandoverBlocker(handoverCaseId, blockerId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم تحديث عائق التنفيذ." : "The execution blocker was updated.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function startHandoverExecutionAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = startHandoverExecutionInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await startHandoverExecution(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم بدء حالة التنفيذ في يوم التسليم على السجل الحي."
          : "The handover-day execution state was started on the live record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن بدء التنفيذ قبل اكتمال الجدولة الداخلية وتصفية جميع العوائق المفتوحة."
            : "Execution cannot start until the handover is internally scheduled and all open blockers are cleared.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function completeHandoverAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = completeHandoverInputSchema.safeParse({
    completionSummary: formData.get("completionSummary"),
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await completeHandover(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم إغلاق يوم التسليم بملخص إتمام مضبوط."
          : "The handover day was closed with a controlled completion summary.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن إتمام التسليم قبل بدء التنفيذ ومعالجة جميع العوائق المفتوحة."
            : "Handover completion requires an active execution state with no open blockers.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function saveHandoverReviewAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = saveHandoverReviewInputSchema.safeParse({
    outcome: formData.get("outcome"),
    summary: formData.get("summary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await saveHandoverReview(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ مراجعة ما بعد التسليم على السجل الحي."
          : "The post-handover review was saved on the live record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن حفظ مراجعة ما بعد التسليم قبل اكتمال السجل أولاً."
            : "The post-handover review cannot be saved until the handover is completed first.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function saveHandoverArchiveReviewAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = saveHandoverArchiveReviewInputSchema.safeParse({
    outcome: formData.get("outcome"),
    summary: formData.get("summary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await saveHandoverArchiveReview(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ مراجعة الإغلاق الإداري على سجل التسليم المكتمل."
          : "The administrative closure review was saved on the completed handover record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن حفظ مراجعة الأرشفة قبل اكتمال التسليم وحفظ المراجعة الأساسية وإغلاق أي متابعة مطلوبة."
            : "The archive review requires a completed handover, a saved manager review, and any required post-handover follow-up to be resolved first.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function createHandoverPostCompletionFollowUpAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");
  const dueAt = formData.get("dueAt");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string" || typeof dueAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = createHandoverPostCompletionFollowUpInputSchema.safeParse({
    dueAt: toIsoDateTimeOrEmpty(dueAt),
    ownerName: normalizeOptionalString(formData.get("ownerName")),
    status: formData.get("status"),
    summary: formData.get("summary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await createHandoverPostCompletionFollowUp(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ متابعة ما بعد التسليم على السجل الحي."
          : "The post-handover follow-up boundary was saved on the live record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لن يتم فتح متابعة ما بعد التسليم حتى تكتمل الحالة وتُحفظ مراجعة تطلب المتابعة."
            : "Post-handover follow-up only opens after completion and a saved review that requires follow-up.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function resolveHandoverPostCompletionFollowUpAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const followUpId = formData.get("followUpId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof followUpId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = resolveHandoverPostCompletionFollowUpInputSchema.safeParse({
    resolutionSummary: formData.get("resolutionSummary"),
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await resolveHandoverPostCompletionFollowUp(
      handoverCaseId,
      followUpId,
      result.data,
      await getOperatorRole()
    );
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم إغلاق متابعة ما بعد التسليم بملخص حل واضح."
          : "The post-handover follow-up was closed with a clear resolution summary.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن إغلاق المتابعة قبل وجود متابعة مفتوحة على السجل المكتمل."
            : "The follow-up cannot be resolved until an open post-handover follow-up exists on the completed record.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function updateHandoverArchiveStatusAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateHandoverArchiveStatusInputSchema.safeParse({
    status: formData.get("status"),
    summary: formData.get("summary")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await updateHandoverArchiveStatus(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم تحديث حالة الأرشفة الإدارية على السجل المكتمل."
          : "The archive boundary status was updated on the completed record.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "تحديث حالة الأرشفة يعتمد على نتيجة مراجعة الإغلاق وتسلسل جاهز ثم مؤرشف."
            : "Archive status changes depend on the closure-review outcome and the required ready-then-archived sequence.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function updateHandoverMilestoneAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const milestoneId = formData.get("milestoneId");
  const returnPath = formData.get("returnPath");
  const targetAt = formData.get("targetAt");

  if (typeof handoverCaseId !== "string" || typeof milestoneId !== "string" || typeof returnPath !== "string" || typeof targetAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = updateHandoverMilestoneInputSchema.safeParse({
    ownerName: normalizeOptionalString(formData.get("ownerName")),
    status: formData.get("status"),
    targetAt: toIsoDateTimeOrEmpty(targetAt)
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await updateHandoverMilestone(handoverCaseId, milestoneId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم تحديث محطة التسليم وحدود الجاهزية المرتبطة بها." : "The handover milestone and its readiness boundary were updated.",
      status: "success"
    };
  } catch (error) {
    return getActionError(locale, error);
  }
}

export async function approveHandoverCustomerUpdateAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const customerUpdateId = formData.get("customerUpdateId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof customerUpdateId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = approveHandoverCustomerUpdateInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await approveHandoverCustomerUpdate(handoverCaseId, customerUpdateId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم اعتماد حد التواصل المخصص للعميل." : "The customer-facing handover update boundary was approved.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن اعتماد هذا التحديث قبل أن تصبح المحطة المرتبطة به جاهزة."
            : "This customer update cannot be approved until its linked milestone is ready.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function planHandoverAppointmentAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");
  const scheduledAt = formData.get("scheduledAt");

  if (typeof handoverCaseId !== "string" || typeof returnPath !== "string" || typeof scheduledAt !== "string") {
    return getLocalizedError(locale);
  }

  const result = planHandoverAppointmentInputSchema.safeParse({
    coordinatorName: normalizeOptionalString(formData.get("coordinatorName")),
    location: formData.get("location"),
    scheduledAt: toIsoDateTimeOrEmpty(scheduledAt)
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await planHandoverAppointment(handoverCaseId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message: locale === "ar" ? "تم حفظ موعد التسليم الداخلي." : "The internal handover appointment was saved.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن تخطيط الموعد قبل اعتماد حد الجدولة ووصول الحالة إلى جاهزية الجدولة."
            : "The appointment cannot be planned until the scheduling boundary is approved and the case is ready for scheduling.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function confirmHandoverAppointmentAction(_: FormActionState, formData: FormData): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const appointmentId = formData.get("appointmentId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof appointmentId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = confirmHandoverAppointmentInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await confirmHandoverAppointment(handoverCaseId, appointmentId, result.data, await getOperatorRole());
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar" ? "تم تأكيد موعد التسليم داخلياً دون تشغيل أي إرسال خارجي." : "The handover appointment was confirmed internally without any outbound delivery.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن تأكيد الموعد داخلياً قبل اعتماد حد تأكيد الموعد."
            : "The appointment cannot be confirmed internally until the appointment-confirmation boundary is approved.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function prepareHandoverCustomerUpdateDeliveryAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const customerUpdateId = formData.get("customerUpdateId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof customerUpdateId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = prepareHandoverCustomerUpdateDeliveryInputSchema.safeParse({
    deliverySummary: formData.get("deliverySummary"),
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await prepareHandoverCustomerUpdateDelivery(
      handoverCaseId,
      customerUpdateId,
      result.data,
      await getOperatorRole()
    );
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);
    const updatedCustomerUpdate = updatedHandoverCase.customerUpdates.find((item) => item.customerUpdateId === customerUpdateId);

    return {
      message:
        updatedCustomerUpdate?.qaReviewStatus === "pending_review"
          ? locale === "ar"
            ? "تم تجهيز التحديث وتم فتح حد اعتماد جودة قبل تحويله إلى جاهز للإرسال."
            : "The customer update was prepared and a QA approval gate was opened before dispatch readiness."
          : locale === "ar"
            ? "تم تجهيز تحديث العميل كرسالة جاهزة للإرسال لاحقاً من دون تشغيل أي مزود خارجي."
            : "The customer update was prepared for later dispatch without triggering any external provider.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن تجهيز الإرسال قبل اعتماد حد التأكيد الداخلي وتثبيت الموعد داخلياً."
            : "Delivery preparation stays locked until the appointment is internally confirmed and the boundary is approved.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function resolveHandoverCustomerUpdateQaReviewAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const customerUpdateId = formData.get("customerUpdateId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof customerUpdateId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = resolveHandoverCustomerUpdateQaReviewInputSchema.safeParse({
    reviewSummary: formData.get("reviewSummary"),
    reviewerName: normalizeOptionalString(formData.get("reviewerName")),
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await resolveHandoverCustomerUpdateQaReview(
      handoverCaseId,
      customerUpdateId,
      result.data,
      await getOperatorRole()
    );
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "تم حفظ قرار الجودة على تحديث العميل المجهز."
          : "The QA decision for the prepared customer update was saved.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      return {
        message:
          locale === "ar"
            ? "لا يمكن إغلاق هذا الحد لأن مراجعة الجودة لم تعد بانتظار القرار أو لأن التحديث لم يعد مجهزاً."
            : "This QA gate can no longer be resolved because it is no longer pending or the draft is no longer prepared.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

export async function markHandoverCustomerUpdateDispatchReadyAction(
  _: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const locale = getLocale(formData.get("locale"));
  const customerUpdateId = formData.get("customerUpdateId");
  const handoverCaseId = formData.get("handoverCaseId");
  const returnPath = formData.get("returnPath");

  if (typeof customerUpdateId !== "string" || typeof handoverCaseId !== "string" || typeof returnPath !== "string") {
    return getLocalizedError(locale);
  }

  const result = markHandoverCustomerUpdateDispatchReadyInputSchema.safeParse({
    status: formData.get("status")
  });

  if (!result.success) {
    return {
      message: getValidationMessage(locale),
      status: "error"
    };
  }

  try {
    const updatedHandoverCase = await markHandoverCustomerUpdateDispatchReady(
      handoverCaseId,
      customerUpdateId,
      result.data,
      await getOperatorRole()
    );
    revalidateHandoverPaths(locale, returnPath, updatedHandoverCase.caseId, updatedHandoverCase.handoverCaseId);

    return {
      message:
        locale === "ar"
          ? "أصبح تحديث العميل جاهزاً للإرسال، وتمت ترقية سجل التسليم إلى حالة مجدولة داخلياً."
          : "The customer update is now ready to dispatch and the handover record has been promoted into a scheduled state.",
      status: "success"
    };
  } catch (error) {
    if (error instanceof WebApiError && error.status === 409) {
      const errorCode = typeof error.body === "object" && error.body && "error" in error.body ? error.body.error : null;

      return {
        message:
          errorCode === "handover_customer_update_qa_review_pending"
            ? locale === "ar"
              ? "تم تعليق هذا الحد بانتظار اعتماد الجودة على الصياغة المجهزة."
              : "Dispatch readiness is blocked until QA approves the prepared draft."
            : errorCode === "handover_customer_update_qa_follow_up_required"
              ? locale === "ar"
                ? "تتطلب الجودة تعديل الصياغة المجهزة قبل تحويلها إلى جاهز للإرسال."
                : "QA requested draft changes before this update can be marked dispatch-ready."
              : locale === "ar"
                ? "لا يمكن تحويل التحديث إلى جاهز للإرسال قبل تجهيز المحتوى أولاً."
                : "Dispatch readiness requires a prepared delivery package first.",
        status: "error"
      };
    }

    return getActionError(locale, error);
  }
}

function getActionError(locale: "en" | "ar", error: unknown): FormActionState {
  if (error instanceof WebApiError && error.status === 403) {
    const insufficientRoleError = getInsufficientRoleError(error.body);

    return {
      message:
        insufficientRoleError
          ? getOperatorPermissionGuardNote(locale, insufficientRoleError.permission)
          : locale === "ar"
            ? "هذا الإجراء يتطلب دوراً مناسباً في وضع التحكم المحلي."
            : "This action requires an eligible role in local control mode.",
      status: "error"
    };
  }

  if (error instanceof WebApiError && error.status >= 500) {
    return {
      message:
        locale === "ar"
          ? "خدمة الواجهة الحية غير متاحة حالياً. شغّل apps/api وapps/worker ثم أعد المحاولة."
          : "The live alpha services are not available right now. Start apps/api and apps/worker, then try again.",
      status: "error"
    };
  }

  return getLocalizedError(locale);
}

function getLocalizedError(locale: "en" | "ar"): FormActionState {
  return {
    message:
      locale === "ar"
        ? "تعذر إكمال العملية الحالية. تحقق من تشغيل الخدمات المحلية ثم أعد المحاولة."
        : "The current action could not be completed. Check the local services and try again.",
    status: "error"
  };
}

function getLocale(value: FormDataEntryValue | null) {
  const result = supportedLocaleSchema.safeParse(value);

  return result.success ? result.data : "en";
}

function getValidationMessage(locale: "en" | "ar") {
  return locale === "ar"
    ? "راجع الحقول المطلوبة ثم أعد الإرسال."
    : "Review the required fields and submit the form again.";
}

function normalizeOptionalString(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

async function getOperatorRole() {
  return getCurrentOperatorRole();
}

function revalidatePaths(locale: "en" | "ar", returnPath: string, caseId: string, handoverCaseId?: string) {
  revalidatePath(returnPath);
  revalidatePath(`/${locale}/leads`);
  revalidatePath(`/${locale}/leads/${caseId}`);
  revalidatePath(`/${locale}/leads/${caseId}/conversation`);
  revalidatePath(`/${locale}/leads/${caseId}/documents`);
  revalidatePath(`/${locale}/qa`);
  revalidatePath(`/${locale}/qa/cases/${caseId}`);
  revalidateManagerPaths(locale);

  if (handoverCaseId) {
    revalidatePath(`/${locale}/handover/${handoverCaseId}`);
  }
}

function revalidateHandoverPaths(locale: "en" | "ar", returnPath: string, caseId: string, handoverCaseId: string) {
  revalidatePath(returnPath);
  revalidatePath(`/${locale}/handover/${handoverCaseId}`);
  revalidatePath(`/${locale}/leads/${caseId}`);
  revalidatePath(`/${locale}/leads/${caseId}/conversation`);
  revalidatePath(`/${locale}/leads/${caseId}/documents`);
  revalidatePath(`/${locale}/qa`);
  revalidatePath(`/${locale}/qa/cases/${caseId}`);
  revalidateManagerPaths(locale);
}

function revalidateManagerPaths(locale: "en" | "ar") {
  revalidatePath(`/${locale}/manager`);
  revalidatePath(`/${locale}/manager/revenue`);
  revalidatePath(`/${locale}/manager/handover`);
}

function toIsoDateTimeOrEmpty(value: string) {
  const normalizedDate = new Date(value);

  return Number.isNaN(normalizedDate.getTime()) ? "" : normalizedDate.toISOString();
}

export { initialFormActionState };
