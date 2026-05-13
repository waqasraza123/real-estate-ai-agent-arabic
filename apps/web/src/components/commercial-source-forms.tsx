"use client";

import { useActionState } from "react";

import type {
  CommercialFact,
  CommercialFactExpiryReviewOutcome,
  CommercialFactKind,
  CommercialFactProposal,
  CommercialSourceRefreshTask,
  CommercialSourceType,
  SupportedLocale
} from "@real-estate-ai/contracts";
import {
  Select,
  TextArea,
  TextInput,
  cx,
  fieldGridClassName,
  fieldLabelClassName,
  fieldSpanFullClassName,
  fieldStackClassName,
  formActionsRowClassName,
  formFeedbackClassName,
  formStackClassName
} from "@real-estate-ai/ui";

import {
  approveCommercialFactProposalAction,
  bulkApproveCommercialFactProposalsAction,
  bulkRejectCommercialFactProposalsAction,
  createCommercialSourceAction,
  createManualCommercialFactAction,
  importCommercialInventoryAction,
  initialFormActionState,
  rejectCommercialFactProposalAction,
  reviewCommercialFactExpiryAction,
  resolveCommercialSourceRefreshTaskAction
} from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";

export function CommercialSourceCreateForm(props: {
  canManage: boolean;
  locale: SupportedLocale;
  returnPath: string;
}) {
  const [state, action] = useActionState(createCommercialSourceAction, initialFormActionState);
  const sourceTypes: CommercialSourceType[] = ["inventory_csv", "sales_sheet", "policy_pack", "manual_entry", "compliance_reference"];

  return (
    <form action={action} className={formStackClassName}>
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <div className={fieldGridClassName}>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "رمز المشروع" : "Project code"}</span>
          <TextInput disabled={!props.canManage} name="projectCode" required />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "اسم المصدر" : "Source name"}</span>
          <TextInput disabled={!props.canManage} name="sourceName" required />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "نوع المصدر" : "Source type"}</span>
          <Select disabled={!props.canManage} name="sourceType" required>
            {sourceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </label>
        <label className={cx(fieldStackClassName, fieldSpanFullClassName)}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "وصف مختصر" : "Short description"}</span>
          <TextArea disabled={!props.canManage} name="description" rows={3} />
        </label>
      </div>
      <div className={formActionsRowClassName}>
        <FormSubmitButton
          disabled={!props.canManage}
          disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
          idleLabel={props.locale === "ar" ? "إنشاء المصدر" : "Create source"}
          pendingLabel={props.locale === "ar" ? "جارٍ الإنشاء..." : "Creating..."}
        />
        <p className={formFeedbackClassName(state.status)}>{state.message}</p>
      </div>
    </form>
  );
}

export function InventoryImportForm(props: {
  canManage: boolean;
  locale: SupportedLocale;
  returnPath: string;
  sourceId: string;
}) {
  const [state, action] = useActionState(importCommercialInventoryAction, initialFormActionState);

  return (
    <form action={action} className={formStackClassName}>
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="sourceId" type="hidden" value={props.sourceId} />
      <div className={fieldGridClassName}>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "اسم المستورد" : "Imported by"}</span>
          <TextInput disabled={!props.canManage} name="importedByName" />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "وسم النسخة" : "Version label"}</span>
          <TextInput disabled={!props.canManage} name="sourceLabel" />
        </label>
        <label className={cx(fieldStackClassName, fieldSpanFullClassName)}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "CSV المخزون" : "Inventory CSV"}</span>
          <TextArea
            disabled={!props.canManage}
            name="csvText"
            placeholder="projectCode,unitCode,unitType,bedrooms,areaSqm,floor,view,priceSar,availabilityStatus,paymentPlanCode,handoverDate,sourceUpdatedAt"
            required
            rows={8}
          />
        </label>
      </div>
      <div className={formActionsRowClassName}>
        <FormSubmitButton
          disabled={!props.canManage}
          disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
          idleLabel={props.locale === "ar" ? "استيراد المخزون" : "Import inventory"}
          pendingLabel={props.locale === "ar" ? "جارٍ الاستيراد..." : "Importing..."}
        />
        <p className={formFeedbackClassName(state.status)}>{state.message}</p>
      </div>
    </form>
  );
}

export function ProposalDecisionForms(props: {
  canManage: boolean;
  locale: SupportedLocale;
  proposal: CommercialFactProposal;
  returnPath: string;
}) {
  const [approveState, approveAction] = useActionState(approveCommercialFactProposalAction, initialFormActionState);
  const [rejectState, rejectAction] = useActionState(rejectCommercialFactProposalAction, initialFormActionState);

  if (props.proposal.state !== "pending_review") {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={approveAction} className={formStackClassName}>
        <input name="locale" type="hidden" value={props.locale} />
        <input name="proposalId" type="hidden" value={props.proposal.proposalId} />
        <input name="returnPath" type="hidden" value={props.returnPath} />
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "اعتمد بواسطة" : "Approved by"}</span>
          <TextInput disabled={!props.canManage} name="approvedByName" />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "تاريخ انتهاء اختياري" : "Optional expiry"}</span>
          <TextInput disabled={!props.canManage} name="expiresAt" type="datetime-local" />
        </label>
        <div className={formActionsRowClassName}>
          <FormSubmitButton
            disabled={!props.canManage}
            idleLabel={props.locale === "ar" ? "اعتماد" : "Approve"}
            pendingLabel={props.locale === "ar" ? "جارٍ الاعتماد..." : "Approving..."}
          />
          <p className={formFeedbackClassName(approveState.status)}>{approveState.message}</p>
        </div>
      </form>
      <form action={rejectAction} className={formStackClassName}>
        <input name="locale" type="hidden" value={props.locale} />
        <input name="proposalId" type="hidden" value={props.proposal.proposalId} />
        <input name="returnPath" type="hidden" value={props.returnPath} />
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "سبب الرفض" : "Rejection reason"}</span>
          <TextInput disabled={!props.canManage} name="rejectionReason" required />
        </label>
        <div className={formActionsRowClassName}>
          <FormSubmitButton
            disabled={!props.canManage}
            idleLabel={props.locale === "ar" ? "رفض" : "Reject"}
            pendingLabel={props.locale === "ar" ? "جارٍ الرفض..." : "Rejecting..."}
          />
          <p className={formFeedbackClassName(rejectState.status)}>{rejectState.message}</p>
        </div>
      </form>
    </div>
  );
}

export function BulkProposalDecisionForms(props: {
  canManage: boolean;
  locale: SupportedLocale;
  proposals: CommercialFactProposal[];
  returnPath: string;
}) {
  const [approveState, approveAction] = useActionState(bulkApproveCommercialFactProposalsAction, initialFormActionState);
  const [rejectState, rejectAction] = useActionState(bulkRejectCommercialFactProposalsAction, initialFormActionState);
  const pendingProposals = props.proposals.filter((proposal) => proposal.state === "pending_review");

  if (pendingProposals.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <form action={approveAction} className={formStackClassName}>
        <input name="locale" type="hidden" value={props.locale} />
        <input name="returnPath" type="hidden" value={props.returnPath} />
        <ProposalCheckboxList canManage={props.canManage} locale={props.locale} proposals={pendingProposals} />
        <div className={fieldGridClassName}>
          <label className={fieldStackClassName}>
            <span className={fieldLabelClassName}>{props.locale === "ar" ? "اعتمد بواسطة" : "Approved by"}</span>
            <TextInput disabled={!props.canManage} name="approvedByName" />
          </label>
          <label className={fieldStackClassName}>
            <span className={fieldLabelClassName}>{props.locale === "ar" ? "تاريخ انتهاء موحد" : "Shared expiry"}</span>
            <TextInput disabled={!props.canManage} name="expiresAt" type="datetime-local" />
          </label>
        </div>
        <div className={formActionsRowClassName}>
          <FormSubmitButton
            disabled={!props.canManage}
            disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
            idleLabel={props.locale === "ar" ? "اعتماد المحدد" : "Approve selected"}
            pendingLabel={props.locale === "ar" ? "جارٍ اعتماد المحدد..." : "Approving selected..."}
          />
          <p className={formFeedbackClassName(approveState.status)}>{approveState.message}</p>
        </div>
      </form>

      <form action={rejectAction} className={formStackClassName}>
        <input name="locale" type="hidden" value={props.locale} />
        <input name="returnPath" type="hidden" value={props.returnPath} />
        <ProposalCheckboxList canManage={props.canManage} locale={props.locale} proposals={pendingProposals} />
        <div className={fieldGridClassName}>
          <label className={fieldStackClassName}>
            <span className={fieldLabelClassName}>{props.locale === "ar" ? "رفض بواسطة" : "Rejected by"}</span>
            <TextInput disabled={!props.canManage} name="rejectedByName" />
          </label>
          <label className={fieldStackClassName}>
            <span className={fieldLabelClassName}>{props.locale === "ar" ? "سبب موحد" : "Shared reason"}</span>
            <TextInput disabled={!props.canManage} name="rejectionReason" required />
          </label>
        </div>
        <div className={formActionsRowClassName}>
          <FormSubmitButton
            disabled={!props.canManage}
            disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
            idleLabel={props.locale === "ar" ? "رفض المحدد" : "Reject selected"}
            pendingLabel={props.locale === "ar" ? "جارٍ رفض المحدد..." : "Rejecting selected..."}
          />
          <p className={formFeedbackClassName(rejectState.status)}>{rejectState.message}</p>
        </div>
      </form>
    </div>
  );
}

function ProposalCheckboxList(props: {
  canManage: boolean;
  locale: SupportedLocale;
  proposals: CommercialFactProposal[];
}) {
  return (
    <div className="grid max-h-72 gap-2 overflow-auto rounded-[1.5rem] border border-canvas-line/70 bg-white/68 p-3">
      {props.proposals.map((proposal) => (
        <label key={proposal.proposalId} className="flex items-start gap-3 rounded-3xl px-3 py-2 text-sm text-ink hover:bg-brand-50/80">
          <input
            className="mt-1 h-4 w-4 rounded border-canvas-line text-brand-600 focus:ring-brand-300"
            disabled={!props.canManage}
            name="proposalIds"
            type="checkbox"
            value={proposal.proposalId}
          />
          <span className="grid gap-1">
            <span className="font-semibold">{proposal.title}</span>
            <span className="text-ink-soft">
              {proposal.projectCode} · {proposal.kind} · {proposal.locale}
            </span>
          </span>
        </label>
      ))}
      <p className="px-3 text-sm leading-7 text-ink-soft">
        {props.locale === "ar"
          ? "اختر المقترحات التي تشترك في نفس قرار الاعتماد أو الرفض."
          : "Select proposals that share the same approval or rejection decision."}
      </p>
    </div>
  );
}

export function CommercialFactExpiryReviewForm(props: {
  canManage: boolean;
  fact: CommercialFact;
  locale: SupportedLocale;
  returnPath: string;
}) {
  const [state, action] = useActionState(reviewCommercialFactExpiryAction, initialFormActionState);
  const outcomes: CommercialFactExpiryReviewOutcome[] = ["renewed", "source_refresh_required", "archived", "left_expired"];

  return (
    <form action={action} className={formStackClassName}>
      <input name="factId" type="hidden" value={props.fact.factId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <div className={fieldGridClassName}>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "قرار المراجعة" : "Review outcome"}</span>
          <Select disabled={!props.canManage} name="outcome" required>
            {outcomes.map((outcome) => (
              <option key={outcome} value={outcome}>
                {formatExpiryOutcome(outcome, props.locale)}
              </option>
            ))}
          </Select>
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "صلاحية جديدة أو موعد تحديث" : "New expiry or refresh due"}</span>
          <TextInput disabled={!props.canManage} name="nextExpiresAt" type="datetime-local" />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "راجع بواسطة" : "Reviewed by"}</span>
          <TextInput disabled={!props.canManage} name="reviewedByName" />
        </label>
        <label className={cx(fieldStackClassName, fieldSpanFullClassName)}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "ملخص القرار" : "Decision summary"}</span>
          <TextArea
            disabled={!props.canManage}
            name="summary"
            placeholder={
              props.locale === "ar"
                ? "اذكر سبب التجديد أو الأرشفة أو الحاجة لتحديث المصدر."
                : "Record why this fact is renewed, archived, or waiting for a source refresh."
            }
            required
            rows={3}
          />
        </label>
      </div>
      <div className={formActionsRowClassName}>
        <FormSubmitButton
          disabled={!props.canManage}
          disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
          idleLabel={props.locale === "ar" ? "حفظ المراجعة" : "Save review"}
          pendingLabel={props.locale === "ar" ? "جارٍ الحفظ..." : "Saving..."}
        />
        <p className={formFeedbackClassName(state.status)}>{state.message}</p>
      </div>
    </form>
  );
}

export function SourceRefreshTaskResolutionForm(props: {
  canManage: boolean;
  locale: SupportedLocale;
  returnPath: string;
  task: CommercialSourceRefreshTask;
}) {
  const [state, action] = useActionState(resolveCommercialSourceRefreshTaskAction, initialFormActionState);

  if (props.task.status !== "open") {
    return null;
  }

  return (
    <form action={action} className={formStackClassName}>
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="taskId" type="hidden" value={props.task.taskId} />
      <div className={fieldGridClassName}>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "القرار" : "Decision"}</span>
          <Select disabled={!props.canManage} name="status" required>
            <option value="completed">{props.locale === "ar" ? "اكتمل تحديث المصدر" : "Source refreshed"}</option>
            <option value="dismissed">{props.locale === "ar" ? "إغلاق بدون تحديث" : "Close without refresh"}</option>
          </Select>
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "أغلق بواسطة" : "Closed by"}</span>
          <TextInput disabled={!props.canManage} name="resolvedByName" />
        </label>
        <label className={cx(fieldStackClassName, fieldSpanFullClassName)}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "ملخص الإغلاق" : "Resolution summary"}</span>
          <TextArea
            disabled={!props.canManage}
            name="resolutionSummary"
            placeholder={
              props.locale === "ar"
                ? "اذكر نسخة المصدر الجديدة أو سبب الإغلاق بدون تحديث."
                : "Record the new source version, or explain why this is closed without a refresh."
            }
            required
            rows={3}
          />
        </label>
      </div>
      <div className={formActionsRowClassName}>
        <FormSubmitButton
          disabled={!props.canManage}
          disabledLabel={props.locale === "ar" ? "يتطلب صلاحية المدير" : "Manager permission required"}
          idleLabel={props.locale === "ar" ? "تحديث المهمة" : "Update task"}
          pendingLabel={props.locale === "ar" ? "جارٍ التحديث..." : "Updating..."}
        />
        <p className={formFeedbackClassName(state.status)}>{state.message}</p>
      </div>
    </form>
  );
}

function formatExpiryOutcome(outcome: CommercialFactExpiryReviewOutcome, locale: SupportedLocale) {
  const labels: Record<SupportedLocale, Record<CommercialFactExpiryReviewOutcome, string>> = {
    ar: {
      archived: "أرشفة",
      left_expired: "تركها منتهية",
      renewed: "تجديد",
      source_refresh_required: "يتطلب تحديث المصدر"
    },
    en: {
      archived: "Archive",
      left_expired: "Leave expired",
      renewed: "Renew",
      source_refresh_required: "Source refresh required"
    }
  };

  return labels[locale][outcome];
}

export function ManualCommercialFactForm(props: {
  canManage: boolean;
  locale: SupportedLocale;
  returnPath: string;
}) {
  const [state, action] = useActionState(createManualCommercialFactAction, initialFormActionState);
  const factKinds: CommercialFactKind[] = ["policy", "document_requirement", "fees", "visit_terms"];

  return (
    <form action={action} className={formStackClassName}>
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <div className={fieldGridClassName}>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "رمز المشروع" : "Project code"}</span>
          <TextInput disabled={!props.canManage} name="projectCode" required />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "اللغة" : "Locale"}</span>
          <Select defaultValue={props.locale} disabled={!props.canManage} name="factLocale">
            <option value="ar">ar</option>
            <option value="en">en</option>
          </Select>
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "النوع" : "Kind"}</span>
          <Select disabled={!props.canManage} name="kind">
            {factKinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </Select>
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "العنوان" : "Title"}</span>
          <TextInput disabled={!props.canManage} name="title" required />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "دليل المصدر" : "Evidence label"}</span>
          <TextInput disabled={!props.canManage} name="evidenceLabel" required />
        </label>
        <label className={fieldStackClassName}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "تاريخ انتهاء اختياري" : "Optional expiry"}</span>
          <TextInput disabled={!props.canManage} name="expiresAt" type="datetime-local" />
        </label>
        <label className={cx(fieldStackClassName, fieldSpanFullClassName)}>
          <span className={fieldLabelClassName}>{props.locale === "ar" ? "المحتوى المعتمد" : "Approved content"}</span>
          <TextArea disabled={!props.canManage} name="content" required rows={4} />
        </label>
      </div>
      <div className={formActionsRowClassName}>
        <FormSubmitButton
          disabled={!props.canManage}
          idleLabel={props.locale === "ar" ? "إضافة حقيقة" : "Add fact"}
          pendingLabel={props.locale === "ar" ? "جارٍ الحفظ..." : "Saving..."}
        />
        <p className={formFeedbackClassName(state.status)}>{state.message}</p>
      </div>
    </form>
  );
}
