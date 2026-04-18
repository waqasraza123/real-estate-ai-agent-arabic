"use client";

import { useFormStatus } from "react-dom";

import { usePathname } from "next/navigation";

import type { OperatorRole } from "@real-estate-ai/contracts";
import type { AppMessages } from "@real-estate-ai/i18n";
import { Button, cx, Select, TextInput } from "@real-estate-ai/ui";

import { setOperatorRoleAction } from "@/app/actions";
import { operatorRoleOptions } from "@/lib/operator-role";

export function OperatorRoleSwitcher(props: {
  compact?: boolean;
  currentOperatorRole: OperatorRole;
  messages: AppMessages;
}) {
  const pathname = usePathname();

  return (
    <form
      action={setOperatorRoleAction}
      className={cx(
        "flex flex-wrap items-end gap-3",
        props.compact ? "flex-col" : undefined,
        props.compact ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end" : undefined
      )}
      data-testid="operator-role-switcher"
    >
      <input name="returnPath" type="hidden" value={pathname} />
      <label
        className={cx(
          "flex flex-col gap-2 text-xs font-semibold tracking-[0.16em] text-ink-soft",
          props.compact ? "min-w-0" : "min-w-[12rem]"
        )}
      >
        <span>{props.messages.common.operatorRole}</span>
        <Select defaultValue={props.currentOperatorRole} name="operatorRole">
          {operatorRoleOptions.map((role) => (
            <option key={role} value={role}>
              {props.messages.roles[role]}
            </option>
          ))}
        </Select>
      </label>
      <label
        className={cx(
          "flex flex-col gap-2 text-xs font-semibold tracking-[0.16em] text-ink-soft",
          props.compact ? "min-w-0" : "min-w-[12rem]"
        )}
      >
        <span>{props.messages.common.accessKey}</span>
        <TextInput autoComplete="off" name="accessKey" required type="password" />
      </label>
      <RoleSubmitButton compact={Boolean(props.compact)} label={props.messages.common.applyRole} />
    </form>
  );
}

function RoleSubmitButton(props: {
  compact: boolean;
  label: string;
}) {
  const status = useFormStatus();
  const sizeProps = props.compact ? ({ size: "sm" } as const) : {};

  return (
    <Button {...sizeProps} disabled={status.pending} tone="secondary" type="submit">
      {props.label}
    </Button>
  );
}
