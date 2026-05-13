import { cookies } from "next/headers";

import type {
  ApproveHandoverCustomerUpdateInput,
  ApproveCommercialFactProposalInput,
  AssignCommercialSourceOwnerInput,
  BulkApproveCommercialFactProposalsInput,
  BulkRejectCommercialFactProposalsInput,
  CaseReplyGroundingPreview,
  CommercialEvidenceGap,
  CommercialFact,
  CommercialFactExpiryReview,
  CommercialFactProposalBulkDecisionResult,
  CommercialFactProposal,
  CommercialSourceDetail,
  CommercialSourceRefreshTask,
  CommercialSourceSummary,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  CreateCommercialSourceInput,
  CreateHandoverBlockerInput,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateManualCommercialFactInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  ImportInventoryCsvInput,
  ListCommercialSourcesQuery,
  ListGovernanceEventsQuery,
  ManageBulkCaseFollowUpInput,
  ManageBulkCaseFollowUpResult,
  MarkHandoverCustomerUpdateDispatchReadyInput,
  ManageCaseFollowUpInput,
  PlanHandoverAppointmentInput,
  PrepareCaseReplyDraftQaReviewInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedGovernanceEventList,
  PersistedGovernanceSummary,
  PersistedHandoverCaseDetail,
  ProjectCommercialReadinessSummary,
  QualifyCaseInput,
  PreviewCaseReplyGroundingInput,
  RejectCommercialFactProposalInput,
  ReviewCommercialFactExpiryInput,
  ResolveCommercialEvidenceGapInput,
  ResolveCommercialSourceRefreshTaskInput,
  RequestCaseQaReviewInput,
  ResolveCaseQaReviewInput,
  ResolveHandoverCustomerUpdateQaReviewInput,
  ResolveHandoverPostCompletionFollowUpInput,
  SaveHandoverArchiveReviewInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
  SendCaseReplyInput,
  StartHandoverExecutionInput,
  OperatorRole,
  UpdateHandoverArchiveStatusInput,
  UpdateAutomationStatusInput,
  UpdateDocumentRequestInput,
  UpdateHandoverBlockerInput,
  UpdateHandoverMilestoneInput,
  UpdateHandoverTaskStatusInput
} from "@real-estate-ai/contracts";
import { operatorSessionCookieName, operatorSessionHeaderName } from "@real-estate-ai/contracts";
import { verifyOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

interface ApiRequestOptions {
  cache?: RequestCache;
  headers?: Record<string, string> | undefined;
  method?: "GET" | "POST" | "PATCH";
  payload?: unknown;
}

export class WebApiError extends Error {
  body: unknown;
  status: number;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.body = body;
    this.status = status;
  }
}

export async function createHandoverIntake(caseId: string, input: CreateHandoverIntakeInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/handover-intake`, {
    method: "POST",
    payload: input
  });
}

export async function createWebsiteLead(input: CreateWebsiteLeadInput) {
  return requestJson<CreateWebsiteLeadResult>("/v1/website-leads", {
    method: "POST",
    payload: input
  });
}

export async function getPersistedCaseDetailFromApi(caseId: string) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}`, {
    cache: "no-store"
  });
}

export async function getPersistedHandoverCaseDetailFromApi(handoverCaseId: string) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}`, {
    cache: "no-store"
  });
}

export async function listPersistedCasesFromApi() {
  const payload = await requestJson<{
    cases: PersistedCaseSummary[];
  }>("/v1/cases", {
    cache: "no-store"
  });

  return payload.cases;
}

export async function listCommercialSourcesFromApi(operatorRole?: OperatorRole, query: Partial<ListCommercialSourcesQuery> = {}) {
  const searchParams = new URLSearchParams();

  if (query.ownerName) {
    searchParams.set("ownerName", query.ownerName);
  }

  if (query.projectCode) {
    searchParams.set("projectCode", query.projectCode);
  }

  if (query.tenantId) {
    searchParams.set("tenantId", query.tenantId);
  }

  const serialized = searchParams.toString();
  const payload = await requestJson<{
    sources: CommercialSourceSummary[];
  }>(`/v1/commercial-sources${serialized ? `?${serialized}` : ""}`, {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.sources;
}

export async function getCommercialSourceDetailFromApi(sourceId: string, operatorRole?: OperatorRole) {
  return requestJson<CommercialSourceDetail>(`/v1/commercial-sources/${sourceId}`, {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });
}

export async function createCommercialSource(input: CreateCommercialSourceInput, operatorRole?: OperatorRole) {
  return requestJson<CommercialSourceDetail>("/v1/commercial-sources", {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function assignCommercialSourceOwner(
  sourceId: string,
  input: AssignCommercialSourceOwnerInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialSourceDetail>(`/v1/commercial-sources/${sourceId}/owner`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function importCommercialInventoryCsv(sourceId: string, input: ImportInventoryCsvInput, operatorRole?: OperatorRole) {
  return requestJson<CommercialSourceDetail>(`/v1/commercial-sources/${sourceId}/inventory-import`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function listCommercialFactProposalsFromApi(operatorRole?: OperatorRole) {
  const payload = await requestJson<{
    proposals: CommercialFactProposal[];
  }>("/v1/commercial-fact-proposals", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.proposals;
}

export async function approveCommercialFactProposal(
  proposalId: string,
  input: ApproveCommercialFactProposalInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialFactProposal>(`/v1/commercial-fact-proposals/${proposalId}/approve`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function bulkApproveCommercialFactProposals(
  input: BulkApproveCommercialFactProposalsInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialFactProposalBulkDecisionResult>("/v1/commercial-fact-proposals/bulk-approve", {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function rejectCommercialFactProposal(
  proposalId: string,
  input: RejectCommercialFactProposalInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialFactProposal>(`/v1/commercial-fact-proposals/${proposalId}/reject`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function bulkRejectCommercialFactProposals(
  input: BulkRejectCommercialFactProposalsInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialFactProposalBulkDecisionResult>("/v1/commercial-fact-proposals/bulk-reject", {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function listActiveCommercialFactsFromApi(operatorRole?: OperatorRole) {
  const payload = await requestJson<{
    facts: CommercialFact[];
  }>("/v1/commercial-facts/active", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.facts;
}

export async function listCommercialFactExpiryReviewsFromApi(operatorRole?: OperatorRole) {
  const payload = await requestJson<{
    reviews: CommercialFactExpiryReview[];
  }>("/v1/commercial-facts/expiry-reviews", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.reviews;
}

export async function reviewCommercialFactExpiry(
  factId: string,
  input: ReviewCommercialFactExpiryInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialFactExpiryReview>(`/v1/commercial-facts/${factId}/expiry-review`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function listCommercialSourceRefreshTasksFromApi(operatorRole?: OperatorRole) {
  const payload = await requestJson<{
    tasks: CommercialSourceRefreshTask[];
  }>("/v1/commercial-source-refresh-tasks", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.tasks;
}

export async function listCommercialEvidenceGapsFromApi(operatorRole?: OperatorRole) {
  const payload = await requestJson<{
    gaps: CommercialEvidenceGap[];
  }>("/v1/commercial-evidence-gaps", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });

  return payload.gaps;
}

export async function resolveCommercialSourceRefreshTask(
  taskId: string,
  input: ResolveCommercialSourceRefreshTaskInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialSourceRefreshTask>(`/v1/commercial-source-refresh-tasks/${taskId}/resolve`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function resolveCommercialEvidenceGap(
  gapId: string,
  input: ResolveCommercialEvidenceGapInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CommercialEvidenceGap>(`/v1/commercial-evidence-gaps/${gapId}/resolve`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function createManualCommercialFact(input: CreateManualCommercialFactInput, operatorRole?: OperatorRole) {
  return requestJson<CommercialFact>("/v1/commercial-facts/manual", {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function getProjectCommercialReadinessFromApi(projectCode: string, operatorRole?: OperatorRole) {
  return requestJson<ProjectCommercialReadinessSummary>(`/v1/projects/${encodeURIComponent(projectCode)}/commercial-readiness`, {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });
}

export async function getPersistedGovernanceSummaryFromApi(operatorRole?: OperatorRole) {
  return requestJson<PersistedGovernanceSummary>("/v1/governance/summary", {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });
}

export async function getPersistedGovernanceEventsFromApi(query?: Partial<ListGovernanceEventsQuery>, operatorRole?: OperatorRole) {
  return requestJson<PersistedGovernanceEventList>(buildGovernanceEventsPath(query), {
    cache: "no-store",
    headers: await getOperatorSessionHeaders(operatorRole)
  });
}

export async function manageCaseFollowUp(caseId: string, input: ManageCaseFollowUpInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/follow-up-plan`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function manageBulkCaseFollowUp(input: ManageBulkCaseFollowUpInput, operatorRole?: OperatorRole) {
  return requestJson<ManageBulkCaseFollowUpResult>("/v1/cases/follow-up-plan/bulk", {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function requestCaseQaReview(caseId: string, input: RequestCaseQaReviewInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/qa-review`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function prepareCaseReplyDraftQaReview(
  caseId: string,
  input: PrepareCaseReplyDraftQaReviewInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/reply-draft/qa-review`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function previewCaseReplyGrounding(
  caseId: string,
  input: PreviewCaseReplyGroundingInput,
  operatorRole?: OperatorRole
) {
  return requestJson<CaseReplyGroundingPreview>(`/v1/cases/${caseId}/reply-grounding-preview`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function sendCaseReply(caseId: string, input: SendCaseReplyInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/replies`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function resolveCaseQaReview(
  caseId: string,
  qaReviewId: string,
  input: ResolveCaseQaReviewInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/qa-review/${qaReviewId}`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function qualifyCase(caseId: string, input: QualifyCaseInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/qualification`, {
    method: "POST",
    payload: input
  });
}

export async function scheduleVisit(caseId: string, input: ScheduleVisitInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/visits`, {
    method: "POST",
    payload: input
  });
}

export async function tryGetPersistedCaseDetail(caseId: string) {
  try {
    return await getPersistedCaseDetailFromApi(caseId);
  } catch (error) {
    if (error instanceof WebApiError && error.status === 404) {
      return null;
    }

    return null;
  }
}

export async function tryGetPersistedHandoverCaseDetail(handoverCaseId: string) {
  try {
    return await getPersistedHandoverCaseDetailFromApi(handoverCaseId);
  } catch (error) {
    if (error instanceof WebApiError && error.status === 404) {
      return null;
    }

    return null;
  }
}

export async function tryListPersistedCases() {
  try {
    return await listPersistedCasesFromApi();
  } catch {
    return [];
  }
}

export async function tryListCommercialSources(operatorRole?: OperatorRole, query: Partial<ListCommercialSourcesQuery> = {}) {
  try {
    return await listCommercialSourcesFromApi(operatorRole, query);
  } catch {
    return [];
  }
}

export async function tryGetCommercialSourceDetail(sourceId: string, operatorRole?: OperatorRole) {
  try {
    return await getCommercialSourceDetailFromApi(sourceId, operatorRole);
  } catch {
    return null;
  }
}

export async function tryListCommercialFactProposals(operatorRole?: OperatorRole) {
  try {
    return await listCommercialFactProposalsFromApi(operatorRole);
  } catch {
    return [];
  }
}

export async function tryListActiveCommercialFacts(operatorRole?: OperatorRole) {
  try {
    return await listActiveCommercialFactsFromApi(operatorRole);
  } catch {
    return [];
  }
}

export async function tryListCommercialFactExpiryReviews(operatorRole?: OperatorRole) {
  try {
    return await listCommercialFactExpiryReviewsFromApi(operatorRole);
  } catch {
    return [];
  }
}

export async function tryListCommercialSourceRefreshTasks(operatorRole?: OperatorRole) {
  try {
    return await listCommercialSourceRefreshTasksFromApi(operatorRole);
  } catch {
    return [];
  }
}

export async function tryListCommercialEvidenceGaps(operatorRole?: OperatorRole) {
  try {
    return await listCommercialEvidenceGapsFromApi(operatorRole);
  } catch {
    return [];
  }
}

export async function tryGetProjectCommercialReadiness(projectCode: string, operatorRole?: OperatorRole) {
  try {
    return await getProjectCommercialReadinessFromApi(projectCode, operatorRole);
  } catch {
    return null;
  }
}

export async function tryGetPersistedGovernanceSummary(operatorRole?: OperatorRole) {
  try {
    return await getPersistedGovernanceSummaryFromApi(operatorRole);
  } catch {
    return null;
  }
}

export async function tryGetPersistedGovernanceEvents(query?: Partial<ListGovernanceEventsQuery>, operatorRole?: OperatorRole) {
  try {
    return await getPersistedGovernanceEventsFromApi(query, operatorRole);
  } catch {
    return null;
  }
}

export async function updateAutomationStatus(caseId: string, input: UpdateAutomationStatusInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/automation`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function updateDocumentRequest(caseId: string, documentRequestId: string, input: UpdateDocumentRequestInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/documents/${documentRequestId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function uploadCaseDocument(
  caseId: string,
  documentRequestId: string,
  input: {
    bytes: ArrayBuffer;
    fileName: string;
    mimeType: string;
  },
  operatorRole?: OperatorRole
) {
  const response = await fetch(`${getWebApiBaseUrl()}/v1/cases/${caseId}/documents/${documentRequestId}/uploads`, {
    body: input.bytes,
    cache: "no-store",
    headers: {
      ...(await getOperatorSessionHeaders(operatorRole)),
      "content-type": "application/octet-stream",
      "x-document-file-name": encodeURIComponent(input.fileName),
      "x-document-mime-type": encodeURIComponent(input.mimeType)
    },
    method: "POST",
    signal: AbortSignal.timeout(12000)
  });

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new WebApiError(`web_api_request_failed:${response.status}`, response.status, responseBody);
  }

  return responseBody as PersistedCaseDetail;
}

export async function updateHandoverTask(handoverCaseId: string, handoverTaskId: string, input: UpdateHandoverTaskStatusInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/tasks/${handoverTaskId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function createHandoverBlocker(handoverCaseId: string, input: CreateHandoverBlockerInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/blockers`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "POST",
    payload: input
  });
}

export async function updateHandoverBlocker(
  handoverCaseId: string,
  blockerId: string,
  input: UpdateHandoverBlockerInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function startHandoverExecution(
  handoverCaseId: string,
  input: StartHandoverExecutionInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/execution`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function completeHandover(handoverCaseId: string, input: CompleteHandoverInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/completion`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function saveHandoverReview(handoverCaseId: string, input: SaveHandoverReviewInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/review`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function saveHandoverArchiveReview(
  handoverCaseId: string,
  input: SaveHandoverArchiveReviewInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/archive-review`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function createHandoverPostCompletionFollowUp(
  handoverCaseId: string,
  input: CreateHandoverPostCompletionFollowUpInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function resolveHandoverPostCompletionFollowUp(
  handoverCaseId: string,
  followUpId: string,
  input: ResolveHandoverPostCompletionFollowUpInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/post-completion-follow-up/${followUpId}`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function updateHandoverArchiveStatus(
  handoverCaseId: string,
  input: UpdateHandoverArchiveStatusInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/archive-status`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function updateHandoverMilestone(
  handoverCaseId: string,
  milestoneId: string,
  input: UpdateHandoverMilestoneInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/milestones/${milestoneId}`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function approveHandoverCustomerUpdate(
  handoverCaseId: string,
  customerUpdateId: string,
  input: ApproveHandoverCustomerUpdateInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}`,
    {
      headers: await getOperatorSessionHeaders(operatorRole),
      method: "PATCH",
      payload: input
    }
  );
}

export async function planHandoverAppointment(
  handoverCaseId: string,
  input: PlanHandoverAppointmentInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/appointment`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function confirmHandoverAppointment(
  handoverCaseId: string,
  appointmentId: string,
  input: ConfirmHandoverAppointmentInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/appointment/${appointmentId}/confirmation`, {
    headers: await getOperatorSessionHeaders(operatorRole),
    method: "PATCH",
    payload: input
  });
}

export async function prepareHandoverCustomerUpdateDelivery(
  handoverCaseId: string,
  customerUpdateId: string,
  input: PrepareHandoverCustomerUpdateDeliveryInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}/delivery`,
    {
      headers: await getOperatorSessionHeaders(operatorRole),
      method: "PATCH",
      payload: input
    }
  );
}

export async function resolveHandoverCustomerUpdateQaReview(
  handoverCaseId: string,
  customerUpdateId: string,
  input: ResolveHandoverCustomerUpdateQaReviewInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}/qa-review`,
    {
      headers: await getOperatorSessionHeaders(operatorRole),
      method: "PATCH",
      payload: input
    }
  );
}

export async function markHandoverCustomerUpdateDispatchReady(
  handoverCaseId: string,
  customerUpdateId: string,
  input: MarkHandoverCustomerUpdateDispatchReadyInput,
  operatorRole?: OperatorRole
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}/dispatch-ready`,
    {
      headers: await getOperatorSessionHeaders(operatorRole),
      method: "PATCH",
      payload: input
    }
  );
}

export function getWebApiBaseUrl() {
  const configuredBaseUrl = process.env.WEB_API_BASE_URL ?? defaultApiBaseUrl;

  return configuredBaseUrl.replace(/\/$/, "");
}

export function buildGovernanceEventsPath(query?: Partial<ListGovernanceEventsQuery>) {
  if (!query) {
    return "/v1/governance/events";
  }

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

  const serialized = searchParams.toString();

  return serialized.length > 0 ? `/v1/governance/events?${serialized}` : "/v1/governance/events";
}

async function requestJson<T>(path: string, options?: ApiRequestOptions) {
  const operatorSessionHeaders = await getOperatorSessionHeaders();
  const requestInit: RequestInit = {
    cache: options?.cache ?? "no-store",
    headers: {
      "content-type": "application/json",
      ...operatorSessionHeaders,
      ...(options?.headers ?? {})
    },
    method: options?.method ?? "GET",
    signal: AbortSignal.timeout(8000)
  };

  if (options?.payload) {
    requestInit.body = JSON.stringify(options.payload);
  }

  const response = await fetch(`${getWebApiBaseUrl()}${path}`, requestInit);

  const responseBody = await response.json().catch(() => null);

  if (!response.ok) {
    throw new WebApiError(`web_api_request_failed:${response.status}`, response.status, responseBody);
  }

  return responseBody as T;
}

async function getOperatorSessionHeaders(operatorRole?: OperatorRole) {
  const cookieStore = await cookies();
  const storedSessionToken = cookieStore.get(operatorSessionCookieName)?.value;

  if (operatorRole) {
    void operatorRole;
  }

  if (!verifyOperatorSessionToken(storedSessionToken)) {
    return {};
  }

  return {
    [operatorSessionHeaderName]: storedSessionToken as string
  };
}
