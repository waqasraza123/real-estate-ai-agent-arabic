"use client";

import { useActionState } from "react";

import type { HandoverPostCompletionFollowUpStatus, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { createHandoverPostCompletionFollowUpAction, initialFormActionState } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverPostCompletionFollowUpCopy } from "@/lib/live-copy";

export function HandoverPostCompletionFollowUpForm(props: {
  dueAt: string;
  handoverCaseId: string;
  locale: SupportedLocale;
  ownerName: string;
  returnPath: string;
  summary: string;
  status: HandoverPostCompletionFollowUpStatus;
}) {
  const copy = getHandoverPostCompletionFollowUpCopy(props.locale);
  const [state, action] = useActionState(createHandoverPostCompletionFollowUpAction, initialFormActionState);

  return (
    <form action={action} className="form-stack">
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="status" type="hidden" value="open" />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.ownerName}</span>
          <input className="input-shell" defaultValue={props.ownerName} name="ownerName" type="text" />
        </label>
        <label className="field-stack">
          <span>{copy.dueAt}</span>
          <input className="input-shell" defaultValue={props.dueAt} name="dueAt" required type="datetime-local" />
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
