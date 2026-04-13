import { listGovernanceEventsQuerySchema, type ListGovernanceEventsQuery, type SupportedLocale } from "@real-estate-ai/contracts";

type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | undefined;

export function parseGovernanceReportSearchParams(searchParams: SearchParamsInput): ListGovernanceEventsQuery {
  const rawSearchParams =
    searchParams instanceof URLSearchParams ? Object.fromEntries(searchParams.entries()) : normalizeSearchParamRecord(searchParams);

  return listGovernanceEventsQuerySchema.parse(rawSearchParams);
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

export function buildGovernanceReportHref(locale: SupportedLocale, query: Partial<ListGovernanceEventsQuery>) {
  const serialized = buildGovernanceReportSearchParams(query).toString();

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
