"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  approveHandoverCustomerUpdateInputSchema,
  createHandoverIntakeInputSchema,
  createWebsiteLeadInputSchema,
  manageCaseFollowUpInputSchema,
  qualifyCaseInputSchema,
  scheduleVisitInputSchema,
  supportedLocaleSchema,
  updateAutomationStatusInputSchema,
  updateDocumentRequestInputSchema,
  updateHandoverMilestoneInputSchema,
  updateHandoverTaskStatusInputSchema
} from "@real-estate-ai/contracts";

import { initialFormActionState, type FormActionState } from "@/lib/form-action-state";
import {
  WebApiError,
  approveHandoverCustomerUpdate,
  createHandoverIntake,
  createWebsiteLead,
  manageCaseFollowUp,
  qualifyCase,
  scheduleVisit,
  updateAutomationStatus,
  updateDocumentRequest,
  updateHandoverMilestone,
  updateHandoverTask
} from "@/lib/live-api";

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
    const updatedCase = await manageCaseFollowUp(caseId, result.data);
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
    const updatedCase = await updateAutomationStatus(caseId, result.data);
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
    const updatedHandoverCase = await updateHandoverMilestone(handoverCaseId, milestoneId, result.data);
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
    const updatedHandoverCase = await approveHandoverCustomerUpdate(handoverCaseId, customerUpdateId, result.data);
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

function getActionError(locale: "en" | "ar", error: unknown): FormActionState {
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

function revalidatePaths(locale: "en" | "ar", returnPath: string, caseId: string, handoverCaseId?: string) {
  revalidatePath(returnPath);
  revalidatePath(`/${locale}/leads`);
  revalidatePath(`/${locale}/leads/${caseId}`);
  revalidatePath(`/${locale}/leads/${caseId}/documents`);
  revalidatePath(`/${locale}/manager`);

  if (handoverCaseId) {
    revalidatePath(`/${locale}/handover/${handoverCaseId}`);
  }
}

function revalidateHandoverPaths(locale: "en" | "ar", returnPath: string, caseId: string, handoverCaseId: string) {
  revalidatePath(returnPath);
  revalidatePath(`/${locale}/handover/${handoverCaseId}`);
  revalidatePath(`/${locale}/leads/${caseId}`);
  revalidatePath(`/${locale}/leads/${caseId}/documents`);
  revalidatePath(`/${locale}/manager`);
}

function toIsoDateTimeOrEmpty(value: string) {
  const normalizedDate = new Date(value);

  return Number.isNaN(normalizedDate.getTime()) ? "" : normalizedDate.toISOString();
}

export { initialFormActionState };
