import { listGovernanceEventsQuerySchema, type ListGovernanceEventsQuery, type SupportedLocale } from "@real-estate-ai/contracts";
import { parseExportRecipient } from "./export-summary";
import type { ExportRecipient } from "./export-summary";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | undefined;

export type GovernanceReportView = "blended" | "operational_risk" | "qa_history";

export function parseGovernanceReportSearchParams(searchParams: SearchParamsInput): ListGovernanceEventsQuery {
  const rawSearchParams =
    searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams.entries()) : normalizeSearchParamRecord(searchParams);

  return listGovernanceEventsQuerySchema.parse(rawSearchParams);
}

export function parseGovernanceReportView(searchParams: SearchParamsInput): GovernanceReportView {
  const rawSearchParams =
    searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams.entries()) : normalizeSearchParamRecord(searchParams);
  const rawView = rawSearchParams.view;

  if (rawView === "qa_history" || rawView === "operational_risk") {
    return rawView;
  }

  return "blended";
}

export function parseGovernanceReportExportRecipient(searchParams: SearchParamsInput): ExportRecipient {
  const rawSearchParams =
    searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams.entries()) : normalizeSearchParamRecord(searchParams);

  return parseExportRecipient(rawSearchParams.recipient);
}

export function buildGovernanceReportSearchParams(query: Partial<ListGovernanceEventsQuery>) {
  const searchParams = new URLSearchParams();

  if (query.action) {
    searchParams.set("action", query.action);
  }

  if (query.kind) {
    searchParams.set("kind", query.kind);
  }

  if (typeof query.limit === "number") {
    searchParams.set("limit", String(query.limit));
  }

  if (query.status) {
    searchParams.set("status", query.status);
  }

  if (query.subjectType) {
    searchParams.set("subjectType", query.subjectType);
  }

  if (query.triggerSource) {
    searchParams.set("triggerSource", query.triggerSource);
  }

  if (typeof query.windowDays === "number") {
    searchParams.set("windowDays", String(query.windowDays));
  }

  return searchParams;
}

export function buildGovernanceReportHref(
  locale: SupportedLocale,
  query: Partial<ListGovernanceEventsQuery>,
  view: GovernanceReportView = "blended",
  options: { exportRecipient?: ExportRecipient } = {}
) {
  const searchParams = buildGovernanceReportSearchParams(query);

  if (view !== "blended") {
    searchParams.set("view", view);
  }

  if (options.exportRecipient && options.exportRecipient !== "manager") {
    searchParams.set("recipient", options.exportRecipient);
  }

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `/${locale}/manager/governance?${serialized}` : `/${locale}/manager/governance`;
}

function normalizeSearchParamRecord(searchParams: SearchParamsInput) {
  if (!searchParams) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(searchParams).flatMap(([key, value]) => {
      if (typeof value === "undefined") {
        return [];
      }

      if (Array.isArray(value)) {
        return value.length > 0 ? [[key, value[0]]] : [];
      }

      return [[key, value]];
    })
  );
}
