import type { ReactNode } from "react";

import { DetailListItem, StatusBadge, WorkflowCard, detailListClassName } from "@real-estate-ai/ui";

type ReviewBadge = {
  label: ReactNode;
  tone?: "critical" | "neutral" | "success" | "warning";
};

type ReviewDetail = {
  label: string;
  value: ReactNode;
  valueClassName?: string;
};

export function ReviewSummaryCard(props: {
  actions?: ReactNode;
  badges?: ReviewBadge[];
  children?: ReactNode;
  details?: ReviewDetail[];
  meta?: ReactNode;
  summary?: ReactNode;
  title: ReactNode;
  tone?: "critical" | "neutral" | "success" | "warning";
}) {
  const badges = props.badges?.filter((badge) => badge.label !== null && badge.label !== undefined) ?? [];
  const details = props.details?.filter((detail) => detail.value !== null && detail.value !== undefined) ?? [];
  const workflowCardProps = props.tone ? { tone: props.tone } : {};

  return (
    <WorkflowCard
      actions={props.actions}
      badges={
        badges.length > 0
          ? badges.map((badge, index) => (
              <StatusBadge key={index} {...(badge.tone ? { tone: badge.tone } : {})}>
                {badge.label}
              </StatusBadge>
            ))
          : undefined
      }
      meta={props.meta}
      summary={props.summary}
      title={props.title}
      {...workflowCardProps}
    >
      {props.children}
      {details.length > 0 ? (
        <dl className={detailListClassName}>
          {details.map((detail, index) => (
            <DetailListItem
              key={index}
              label={detail.label}
              value={detail.value}
              {...(detail.valueClassName ? { valueClassName: detail.valueClassName } : {})}
            />
          ))}
        </dl>
      ) : null}
    </WorkflowCard>
  );
}
