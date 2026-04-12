"use client";

import { useActionState } from "react";

import type { HandoverPostCompletionFollowUpStatus, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, resolveHandoverPostCompletionFollowUpAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverPostCompletionFollowUpResolutionCopy } from "@/lib/live-copy";

export function HandoverPostCompletionFollowUpResolutionForm(props: {
  followUpId: string;
  handoverCaseId: string;
  locale: SupportedLocale;
  resolutionSummary: string;
  returnPath: string;
  status: HandoverPostCompletionFollowUpStatus;
}) {
  const copy = getHandoverPostCompletionFollowUpResolutionCopy(props.locale);
  const [state, action] = useActionState(resolveHandoverPostCompletionFollowUpAction, initialFormActionState);
  const isResolved = props.status === "resolved";

  return (
    <form action={action} className="form-stack">
      <input name="followUpId" type="hidden" value={props.followUpId} />
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="status" type="hidden" value="resolved" />

      <label className="field-stack">
        <span>{copy.resolutionSummary}</span>
        <textarea
          className="textarea-shell"
          defaultValue={props.resolutionSummary}
          disabled={isResolved}
          name="resolutionSummary"
          required
          rows={4}
        />
      </label>

      <div className="form-actions-row">
        {isResolved ? (
          <button className="primary-button" disabled type="button">
            {props.locale === "ar" ? "مغلقة" : "Resolved"}
          </button>
        ) : (
          <FormSubmitButton idleLabel={copy.action} pendingLabel={props.locale === "ar" ? "جارٍ الإغلاق..." : "Resolving..."} />
        )}
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
