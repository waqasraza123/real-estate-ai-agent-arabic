import type { ReactNode } from "react";

import { EmptyState, stackListClassName } from "@real-estate-ai/ui";

export function StatefulStack<T>(props: {
  className?: string;
  emptySummary: string;
  emptyTitle: string;
  items: T[];
  renderItem: (item: T) => ReactNode;
  testId?: string;
}) {
  if (props.items.length === 0) {
    const emptyStateProps = props.testId ? { testId: props.testId } : {};

    return <EmptyState summary={props.emptySummary} title={props.emptyTitle} {...emptyStateProps} />;
  }

  return <div className={props.className ?? stackListClassName}>{props.items.map(props.renderItem)}</div>;
}
