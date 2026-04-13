"use client";

import { useActionState } from "react";

import type { SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, requestCaseQaReviewAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getQaReviewRequestCopy } from "@/lib/live-copy";

export function QaReviewRequestForm(props: {
  canManage: boolean;
  caseId: string;
  defaultRequestedByName: string;
  disabledLabel: string;
  locale: SupportedLocale;
  returnPath: string;
}) {
  const copy = getQaReviewRequestCopy(props.locale);
  const [state, action] = useActionState(requestCaseQaReviewAction, initialFormActionState);

  return (
    <form action={action} className="form-stack">
      <input name="caseId" type="hidden" value={props.caseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.requestedByName}</span>
          <input
            className="input-shell"
            defaultValue={props.defaultRequestedByName}
            disabled={!props.canManage}
            name="requestedByName"
            type="text"
          />
        </label>
        <label className="field-stack field-span-full">
          <span>{copy.sampleSummary}</span>
          <textarea className="textarea-shell" disabled={!props.canManage} name="sampleSummary" required rows={4} />
        </label>
      </div>

      <div className="form-actions-row">
        <FormSubmitButton
          disabled={!props.canManage}
          disabledLabel={props.disabledLabel}
          idleLabel={copy.action}
          pendingLabel={props.locale === "ar" ? "جارٍ الإرسال..." : "Sending..."}
        />
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
