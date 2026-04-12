"use client";

import { useActionState } from "react";

import type { HandoverMilestoneStatus, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, updateHandoverMilestoneAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverMilestoneCopy, getHandoverMilestoneStatusLabel } from "@/lib/live-copy";

export function HandoverMilestoneForm(props: {
  handoverCaseId: string;
  locale: SupportedLocale;
  milestoneId: string;
  ownerName: string;
  returnPath: string;
  status: HandoverMilestoneStatus;
  targetAt: string;
}) {
  const copy = getHandoverMilestoneCopy(props.locale);
  const [state, action] = useActionState(updateHandoverMilestoneAction, initialFormActionState);
  const statusOptions: HandoverMilestoneStatus[] = ["planned", "blocked", "ready"];

  return (
    <form action={action} className="form-stack">
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="milestoneId" type="hidden" value={props.milestoneId} />
      <input name="returnPath" type="hidden" value={props.returnPath} />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.status}</span>
          <select className="select-shell" defaultValue={props.status} name="status">
            {statusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {getHandoverMilestoneStatusLabel(props.locale, statusOption)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack">
          <span>{copy.targetAt}</span>
          <input className="input-shell" defaultValue={props.targetAt} name="targetAt" required type="datetime-local" />
        </label>
        <label className="field-stack field-span-full">
          <span>{copy.ownerName}</span>
          <input className="input-shell" defaultValue={props.ownerName} name="ownerName" type="text" />
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
