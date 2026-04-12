"use client";

import { useActionState } from "react";

import type { HandoverCustomerUpdateStatus, SupportedLocale } from "@real-estate-ai/contracts";
import { cx } from "@real-estate-ai/ui";

import { approveHandoverCustomerUpdateAction, initialFormActionState } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { getHandoverCustomerUpdateApprovalCopy } from "@/lib/live-copy";

export function HandoverCustomerUpdateApprovalForm(props: {
  customerUpdateId: string;
  handoverCaseId: string;
  locale: SupportedLocale;
  returnPath: string;
  status: HandoverCustomerUpdateStatus;
}) {
  const copy = getHandoverCustomerUpdateApprovalCopy(props.locale);
  const [state, action] = useActionState(approveHandoverCustomerUpdateAction, initialFormActionState);
  const isReady = props.status === "ready_for_approval";
  const isApproved = props.status === "approved";

  return (
    <form action={action} className="form-stack">
      <input name="customerUpdateId" type="hidden" value={props.customerUpdateId} />
      <input name="handoverCaseId" type="hidden" value={props.handoverCaseId} />
      <input name="locale" type="hidden" value={props.locale} />
      <input name="returnPath" type="hidden" value={props.returnPath} />
      <input name="status" type="hidden" value="approved" />

      <div className="form-actions-row">
        {isReady ? (
          <FormSubmitButton idleLabel={copy.action} pendingLabel={props.locale === "ar" ? "جارٍ الاعتماد..." : "Approving..."} />
        ) : (
          <button className="primary-button" disabled type="button">
            {isApproved ? (props.locale === "ar" ? "تم الاعتماد" : "Already approved") : (props.locale === "ar" ? "بانتظار الجاهزية" : "Waiting for readiness")}
          </button>
        )}
        <p className={cx("form-feedback", state.status === "error" && "form-feedback-error", state.status === "success" && "form-feedback-success")}>
          {state.message}
        </p>
      </div>
    </form>
  );
}
