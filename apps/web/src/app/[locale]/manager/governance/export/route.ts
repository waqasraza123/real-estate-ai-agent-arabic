import { canOperatorRoleAccessWorkspace, operatorSessionHeaderName } from "@real-estate-ai/contracts";
import type { CommercialEvidenceGap, CommercialSourceSummary } from "@real-estate-ai/contracts";

import { buildCommercialEvidenceGapPressureSummary } from "@/lib/commercial-readiness-report";
import { parseExportRecipient } from "@/lib/export-summary";
import { buildGovernanceEventsPath, getWebApiBaseUrl, WebApiError } from "@/lib/live-api";
import { buildGovernanceEventCsv } from "@/lib/governance-export";
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
  const recipient = parseExportRecipient(requestUrl.searchParams.get("recipient"));
  const sessionToken = await getCurrentOperatorSessionToken();

  try {
    const requestHeaders = {
      [operatorSessionHeaderName]: sessionToken
    };
    const [response, commercialSourcesResponse, commercialEvidenceGapsResponse] = await Promise.all([
      fetch(`${getWebApiBaseUrl()}${buildGovernanceEventsPath({ ...filters, limit: 500 })}`, {
        cache: "no-store",
        headers: requestHeaders,
        signal: AbortSignal.timeout(8000)
      }),
      fetch(`${getWebApiBaseUrl()}/v1/commercial-sources`, {
        cache: "no-store",
        headers: requestHeaders,
        signal: AbortSignal.timeout(8000)
      }).catch(() => null),
      fetch(`${getWebApiBaseUrl()}/v1/commercial-evidence-gaps?status=open`, {
        cache: "no-store",
        headers: requestHeaders,
        signal: AbortSignal.timeout(8000)
      }).catch(() => null)
    ]);

    const responseBody = await response.json().catch(() => null);
    const commercialSourcesBody = commercialSourcesResponse
      ? await commercialSourcesResponse.json().catch(() => null)
      : null;
    const commercialEvidenceGapsBody = commercialEvidenceGapsResponse
      ? await commercialEvidenceGapsResponse.json().catch(() => null)
      : null;

    if (!response.ok) {
      throw new WebApiError(`web_api_request_failed:${response.status}`, response.status, responseBody);
    }

    const commercialEvidenceGapPressure =
      commercialSourcesResponse?.ok && commercialEvidenceGapsResponse?.ok
        ? buildCommercialEvidenceGapPressureSummary({
            gaps: (commercialEvidenceGapsBody?.gaps ?? []) as CommercialEvidenceGap[],
            sources: (commercialSourcesBody?.sources ?? []) as CommercialSourceSummary[]
          })
        : undefined;

    const csv = buildGovernanceEventCsv(responseBody?.items ?? [], {
      commercialEvidenceGapPressure,
      filters,
      locale: locale === "ar" ? "ar" : "en",
      recipient
    });
    const filename = `governance-report-${recipient !== "manager" ? `${recipient}-` : ""}${locale}-${filters.windowDays}d.csv`;

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
