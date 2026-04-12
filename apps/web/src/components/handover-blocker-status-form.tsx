"use client";

import { useActionState } from "react";

import type {
  HandoverBlockerSeverity,
  HandoverBlockerStatus,
  SupportedLocale
} from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { initialFormActionState, updateHandoverBlockerAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  getHandoverBlockerCopy,
  getHandoverBlockerSeverityLabel,
  getHandoverBlockerStatusLabel
} from "@/lib/live-copy";

export function HandoverBlockerStatusForm(props: {
  blockerId: string;
  dueAt: string;
  handoverCaseId: string;
  locale: SupportedLocale;
  ownerName: string;
  returnPath: string;
  severity: HandoverBlockerSeverity;
  status: HandoverBlockerStatus;
  summary: string;
}) {
  const copy = getHandoverBlockerCopy(props.locale);
  const [state, action] = useActionState(updateHandoverBlockerAction, initialFormActionState);
  const statusOptions: HandoverBlockerStatus[] = ["open", "in_progress", "resolved"];
  const severityOptions: HandoverBlockerSeverity[] = ["warning", "critical"];

  return (
    <form action={action} className="form-stack">
      <input name="blockerId" type="hidden" value={props.blockerId} />
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.status}</span>
          <select className="select-shell" defaultValue={props.status} name="status">
            {statusOptions.map((statusOption) => (
              <option key={statusOption} value={statusOption}>
                {getHandoverBlockerStatusLabel(props.locale, statusOption)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack">
          <span>{copy.severity}</span>
          <select className="select-shell" defaultValue={props.severity} name="severity">
            {severityOptions.map((severityOption) => (
              <option key={severityOption} value={severityOption}>
                {getHandoverBlockerSeverityLabel(props.locale, severityOption)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack">
          <span>{copy.dueAt}</span>
          <input className="input-shell" defaultValue={props.dueAt} name="dueAt" required type="datetime-local" />
        </label>
        <label className="field-stack">
          <span>{copy.ownerName}</span>
          <input className="input-shell" defaultValue={props.ownerName} name="ownerName" type="text" />
        </label>
        <label className="field-stack field-span-full">
          <span>{copy.summary}</span>
          <textarea className="textarea-shell" defaultValue={props.summary} name="summary" required rows={4} />
        </label>
      </div>

      <div className="form-actions-row">
        <FormSubmitButton idleLabel={props.locale === "ar" ? "حفظ العائق" : "Save blocker"} pendingLabel={props.locale === "ar" ? "جارٍ الحفظ..." : "Saving..."} />
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
