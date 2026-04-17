"use client";

import Link from "next/link";

import {
  cx,
  pageStackClassName,
  panelSummaryClassName,
  segmentedLinkTabClassName,
  segmentedLinkTabsClassName
} from "@real-estate-ai/ui";

export function SegmentedLinkTabs(props: {
  activeValue: string;
  className?: string;
  items: Array<{
    href: string;
    label: string;
    value: string;
  }>;
  title?: string;
}) {
  const tabs = (
    <div className={cx(segmentedLinkTabsClassName, props.className)}>
      {props.items.map((item) => (
        <Link key={`${props.title ?? "segmented-tabs"}:${item.value}`} className={segmentedLinkTabClassName(item.value === props.activeValue)} href={item.href}>
          {item.label}
        </Link>
      ))}
    </div>
  );

  if (!props.title) {
    return tabs;
  }

  return (
    <div className={pageStackClassName}>
      <p className={panelSummaryClassName}>{props.title}</p>
      {tabs}
    </div>
  );
}
