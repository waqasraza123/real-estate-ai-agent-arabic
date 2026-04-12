"use client";

import { useActionState } from "react";

import type { HandoverTaskStatus, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, updateHandoverTaskStatusAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverTaskStatusLabel } from "@/lib/live-copy";

export function HandoverTaskStatusForm(props: {
  canManage: boolean;
  disabledLabel: string;
  handoverCaseId: string;
  handoverTaskId: string;
  locale: SupportedLocale;
  returnPath: string;
  status: HandoverTaskStatus;
}) {
  const [state, action] = useActionState(updateHandoverTaskStatusAction, initialFormActionState);
  const statusOptions: HandoverTaskStatus[] = ["open", "blocked", "complete"];

  return (
    <form action={action} className="document-update-form">
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="handoverTaskId" type="hidden" value={props.handoverTaskId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />

      <select className="select-shell" defaultValue={props.status} disabled={!props.canManage} name="status">
        {statusOptions.map((statusOption) => (
          <option key={statusOption} value={statusOption}>
            {getHandoverTaskStatusLabel(props.locale, statusOption)}
          </option>
        ))}
      </select>

      <FormSubmitButton
        disabled={!props.canManage}
        disabledLabel={props.disabledLabel}
        idleLabel={props.locale === "ar" ? "حفظ" : "Save"}
        pendingLabel={props.locale === "ar" ? "جارٍ الحفظ..." : "Saving..."}
      />

      <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
        {state.message}
      </p>
    </form>
  );
}
