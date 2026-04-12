"use client";

import { useActionState } from "react";

import type { HandoverBlockerSeverity, HandoverBlockerType, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { createHandoverBlockerAction, initialFormActionState } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  getHandoverBlockerCopy,
  getHandoverBlockerSeverityLabel,
  getHandoverBlockerTypeLabel
} from "@/lib/live-copy";

export function HandoverBlockerForm(props: {
  dueAt: string;
  handoverCaseId: string;
  locale: SupportedLocale;
  ownerName: string;
  returnPath: string;
}) {
  const copy = getHandoverBlockerCopy(props.locale);
  const [state, action] = useActionState(createHandoverBlockerAction, initialFormActionState);
  const typeOptions: HandoverBlockerType[] = ["unit_snag", "access_blocker", "document_gap"];
  const severityOptions: HandoverBlockerSeverity[] = ["warning", "critical"];

  return (
    <form action={action} className="form-stack">
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="status" type="hidden" value="open" />

      <div className="field-grid">
        <label className="field-stack">
          <span>{copy.severity}</span>
          <select className="select-shell" defaultValue="warning" name="severity">
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
          <span>{props.locale === "ar" ? "نوع العائق" : "Blocker type"}</span>
          <select className="select-shell" defaultValue="unit_snag" name="type">
            {typeOptions.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {getHandoverBlockerTypeLabel(props.locale, typeOption)}
              </option>
            ))}
          </select>
        </label>
        <label className="field-stack">
          <span>{copy.ownerName}</span>
          <input className="input-shell" defaultValue={props.ownerName} name="ownerName" type="text" />
        </label>
        <label className="field-stack field-span-full">
          <span>{copy.summary}</span>
          <textarea className="textarea-shell" name="summary" required rows={4} />
        </label>
      </div>

      <div className="form-actions-row">
        <FormSubmitButton idleLabel={copy.action} pendingLabel={props.locale === "ar" ? "جارٍ التسجيل..." : "Logging..."} />
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
