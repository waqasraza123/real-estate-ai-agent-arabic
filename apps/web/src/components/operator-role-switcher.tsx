"use client";

import { useFormStatus } from "react-dom";

import { usePathname } from "next/navigation";

import type { OperatorRole } from "@real-estate-ai/contracts";
import type { AppMessages } from "@real-estate-ai/i18n";

import { setOperatorRoleAction } from "@/app/actions";
import { operatorRoleOptions } from "@/lib/operator-role";

export function OperatorRoleSwitcher(props: {
  currentOperatorRole: OperatorRole;
  messages: AppMessages;
}) {
  const pathname = usePathname();

  return (
    <form action={setOperatorRoleAction} className="role-switcher" data-testid="operator-role-switcher">
      <input name="returnPath" type="hidden" value={pathname} />
      <label className="role-switcher-label">
        <span>{props.messages.common.operatorRole}</span>
        <select defaultValue={props.currentOperatorRole} name="operatorRole">
          {operatorRoleOptions.map((role) => (
            <option key={role} value={role}>
              {props.messages.roles[role]}
            </option>
          ))}
        </select>
      </label>
      <label className="role-switcher-label">
        <span>Access key</span>
        <input autoComplete="off" name="accessKey" required type="password" />
      </label>
      <RoleSubmitButton label={props.messages.common.applyRole} />
    </form>
  );
}

function RoleSubmitButton(props: {
  label: string;
}) {
  const status = useFormStatus();

  return (
    <button className="role-switcher-button" disabled={status.pending} type="submit">
      {props.label}
    </button>
  );
}
