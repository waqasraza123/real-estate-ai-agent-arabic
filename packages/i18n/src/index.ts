import type { SupportedLocale } from "@real-estate-ai/domain";

import { arMessages } from "./messages/ar";
import { enMessages } from "./messages/en";

export interface AppMessages {
  app: {
    name: string;
    phaseLabel: string;
    shellNote: string;
  };
  navigation: {
    landing: string;
    dashboard: string;
    leads: string;
    manager: string;
  };
  landing: {
    eyebrow: string;
    title: string;
    summary: string;
    primaryAction: string;
    secondaryAction: string;
    spotlightTitle: string;
    spotlightSummary: string;
  };
  dashboard: {
    title: string;
    summary: string;
  };
  leads: {
    title: string;
    summary: string;
  };
  profile: {
    title: string;
    summary: string;
  };
  conversation: {
    title: string;
    summary: string;
  };
  schedule: {
    title: string;
    summary: string;
  };
  documents: {
    title: string;
    summary: string;
  };
  handover: {
    title: string;
    summary: string;
  };
  manager: {
    title: string;
    summary: string;
  };
  common: {
    switchLanguage: string;
    operatorRole: string;
    applyRole: string;
    roleGuardNote: string;
    skipToContent: string;
    primaryNavigation: string;
    demoState: string;
    lead: string;
    currentOwner: string;
    nextAction: string;
    lastChange: string;
    timeline: string;
    documents: string;
    visitReadiness: string;
    handoverReadiness: string;
    stage: string;
    customer: string;
    automation: string;
    manager: string;
    placeholderNotice: string;
  };
  roles: {
    sales_manager: string;
    handover_coordinator: string;
    handover_manager: string;
    qa_reviewer: string;
    admin: string;
  };
  states: {
    loadingTitle: string;
    loadingSummary: string;
    errorTitle: string;
    errorSummary: string;
    retry: string;
    emptyAlertsTitle: string;
    emptyAlertsSummary: string;
    emptyCasesTitle: string;
    emptyCasesSummary: string;
    emptyMessagesTitle: string;
    emptyMessagesSummary: string;
    emptyDocumentsTitle: string;
    emptyDocumentsSummary: string;
    emptyTimelineTitle: string;
    emptyTimelineSummary: string;
    emptyMilestonesTitle: string;
    emptyMilestonesSummary: string;
  };
}

export const locales: SupportedLocale[] = ["en", "ar"];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return locales.includes(value as SupportedLocale);
}

export function getDirection(locale: SupportedLocale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getMessages(locale: SupportedLocale): AppMessages {
  return locale === "ar" ? arMessages : enMessages;
}

export function getLocaleLabel(locale: SupportedLocale): string {
  return locale === "ar" ? "العربية" : "English";
}

export function toggleLocale(locale: SupportedLocale): SupportedLocale {
  return locale === "ar" ? "en" : "ar";
}
