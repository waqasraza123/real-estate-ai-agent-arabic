"use client";

import { usePathname } from "next/navigation";

import type { SupportedLocale } from "@real-estate-ai/domain";
import { getMessages } from "@real-estate-ai/i18n";

import { SegmentedLinkTabs } from "@/components/segmented-link-tabs";

export function CaseRouteTabs(props: {
  caseId: string;
  handoverCaseId?: string | undefined;
  locale: SupportedLocale;
}) {
  const pathname = usePathname();
  const messages = getMessages(props.locale);
  const tabs = [
    {
      href: `/${props.locale}/leads/${props.caseId}`,
      label: messages.profile.title
    },
    {
      href: `/${props.locale}/leads/${props.caseId}/conversation`,
      label: messages.conversation.title
    },
    {
      href: `/${props.locale}/leads/${props.caseId}/schedule`,
      label: messages.schedule.title
    },
    {
      href: `/${props.locale}/leads/${props.caseId}/documents`,
      label: messages.documents.title
    },
    props.handoverCaseId
      ? {
          href: `/${props.locale}/handover/${props.handoverCaseId}`,
          label: messages.handover.title
        }
      : null
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
  }>;

  return <SegmentedLinkTabs activeValue={pathname} items={tabs.map((tab) => ({ ...tab, value: tab.href }))} />;
}
