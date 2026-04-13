import { canOperatorRoleAccessWorkspace } from "@real-estate-ai/contracts";
import { operatorSessionHeaderName } from "@real-estate-ai/contracts";

import { buildGovernanceEventsPath, getWebApiBaseUrl, WebApiError } from "@/lib/live-api";
import { parseGovernanceReportSearchParams } from "@/lib/governance-report";
import { getCurrentOperatorRole, getCurrentOperatorSessionToken } from "@/lib/operator-session";

export async function GET(request: Request, context: { params: Promise<{ locale: string }> }) {
  const [{ locale }, currentOperatorRole] = await Promise.all([context.params, getCurrentOperatorRole()]);
  const canAccessManagerReport =
    canOperatorRoleAccessWorkspace("manager_revenue", currentOperatorRole) ||
    canOperatorRoleAccessWorkspace("manager_handover", currentOperatorRole);

  if (!canAccessManagerReport) {
    return new Response(locale === "ar" ? "وصول إداري مطلوب" : "Manager access required", {
      status: 403
    });
  }

  const requestUrl = new URL(request.url);
  const filters = parseGovernanceReportSearchParams(requestUrl.searchParams);
  const sessionToken = await getCurrentOperatorSessionToken();

  try {
    const response = await fetch(`${getWebApiBaseUrl()}${buildGovernanceEventsPath({ ...filters, limit: 500 })}`, {
      cache: "no-store",
      headers: {
        [operatorSessionHeaderName]: sessionToken
      },
      signal: AbortSignal.timeout(8000)
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new WebApiError(`web_api_request_failed:${response.status}`, response.status, responseBody);
    }

    const csv = buildGovernanceEventCsv(responseBody?.items ?? []);
    const filename = `governance-report-${locale}-${filters.windowDays}d.csv`;

    return new Response(csv, {
      headers: {
        "content-disposition": `attachment; filename="${filename}"`,
        "content-type": "text/csv; charset=utf-8"
      },
      status: 200
    });
  } catch {
    return new Response(locale === "ar" ? "تعذر إنشاء تقرير CSV" : "Unable to generate CSV report", {
      status: 502
    });
  }
}

function buildGovernanceEventCsv(items: Array<Record<string, unknown>>) {
  const headers = [
    "createdAt",
    "action",
    "kind",
    "status",
    "subjectType",
    "triggerSource",
    "customerName",
    "caseId",
    "handoverCaseId",
    "actorName",
    "sampleSummary",
    "reviewSummary",
    "draftMessage",
    "policySignals",
    "triggerEvidence"
  ];

  const rows = items.map((item) =>
    [
      item.createdAt,
      item.action,
      item.kind,
      item.status,
      item.subjectType,
      item.triggerSource,
      item.customerName,
      item.caseId,
      item.handoverCaseId,
      item.actorName,
      item.sampleSummary,
      item.reviewSummary,
      item.draftMessage,
      Array.isArray(item.policySignals) ? item.policySignals.join(" | ") : "",
      Array.isArray(item.triggerEvidence) ? item.triggerEvidence.join(" | ") : ""
    ].map((value) => escapeCsvValue(typeof value === "string" ? value : value == null ? "" : String(value)))
  );

  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}
