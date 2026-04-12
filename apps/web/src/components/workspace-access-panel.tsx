import Link from "next/link";

import type { SupportedLocale } from "@real-estate-ai/contracts";
import { Panel, StatusBadge } from "@real-estate-ai/ui";

import { getOperatorRoleLabel, getOperatorWorkspaceLabel } from "@/lib/operator-role";

export function WorkspaceAccessPanel(props: {
  actionHref: string;
  actionLabel: string;
  locale: SupportedLocale;
  operatorRole: "sales_manager" | "handover_coordinator" | "handover_manager" | "admin";
  summary: string;
  title: string;
  workspace: "sales" | "handover" | "manager_revenue" | "manager_handover";
}) {
  return (
    <Panel title={props.title}>
      <div className="page-stack">
        <p className="panel-summary">{props.summary}</p>
        <div className="status-row-wrap">
          <StatusBadge>{getOperatorRoleLabel(props.locale, props.operatorRole)}</StatusBadge>
          <StatusBadge tone="warning">{getOperatorWorkspaceLabel(props.locale, props.workspace)}</StatusBadge>
        </div>
        <Link className="inline-link" href={props.actionHref}>
          {props.actionLabel}
        </Link>
      </div>
    </Panel>
  );
}
