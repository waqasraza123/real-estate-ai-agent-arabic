"use client";

import { useActionState } from "react";

import type { HandoverReviewOutcome, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, saveHandoverReviewAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverReviewCopy, getHandoverReviewOutcomeLabel } from "@/lib/live-copy";

export function HandoverReviewForm(props: {
  handoverCaseId: string;
  locale: SupportedLocale;
  outcome: HandoverReviewOutcome;
  returnPath: string;
  summary: string;
}) {
  const copy = getHandoverReviewCopy(props.locale);
  const [state, action] = useActionState(saveHandoverReviewAction, initialFormActionState);
  const outcomeOptions: HandoverReviewOutcome[] = ["accepted", "follow_up_required"];

  return (
    <form action={action} className="form-stack">
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.outcome}</span>
          <select className="select-shell" defaultValue={props.outcome} name="outcome">
            {outcomeOptions.map((outcomeOption) => (
              <option key={outcomeOption} value={outcomeOption}>
                {getHandoverReviewOutcomeLabel(props.locale, outcomeOption)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack field-span-full">
          <span>{copy.summary}</span>
          <textarea className="textarea-shell" defaultValue={props.summary} name="summary" required rows={4} />
        </label>
      </div>

      <div className="form-actions-row">
        <FormSubmitButton idleLabel={copy.action} pendingLabel={props.locale === "ar" ? "جارٍ الحفظ..." : "Saving..."} />
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
