import type {
  ApproveHandoverCustomerUpdateInput,
  CompleteHandoverInput,
  ConfirmHandoverAppointmentInput,
  CreateHandoverBlockerInput,
  CreateHandoverPostCompletionFollowUpInput,
  CreateHandoverIntakeInput,
  CreateWebsiteLeadInput,
  CreateWebsiteLeadResult,
  MarkHandoverCustomerUpdateDispatchReadyInput,
  ManageCaseFollowUpInput,
  PlanHandoverAppointmentInput,
  PrepareHandoverCustomerUpdateDeliveryInput,
  PersistedCaseDetail,
  PersistedCaseSummary,
  PersistedHandoverCaseDetail,
  QualifyCaseInput,
  ResolveHandoverPostCompletionFollowUpInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
  StartHandoverExecutionInput,
  UpdateAutomationStatusInput,
  UpdateDocumentRequestInput,
  UpdateHandoverBlockerInput,
  UpdateHandoverMilestoneInput,
  UpdateHandoverTaskStatusInput
} from "@real-estate-ai/contracts";

const defaultApiBaseUrl = "http://127.0.0.1:4000";

interface ApiRequestOptions {
  cache?: RequestCache;
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

export async function manageCaseFollowUp(caseId: string, input: ManageCaseFollowUpInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/follow-up-plan`, {
    method: "POST",
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

export async function updateAutomationStatus(caseId: string, input: UpdateAutomationStatusInput) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/automation`, {
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

export async function updateHandoverTask(handoverCaseId: string, handoverTaskId: string, input: UpdateHandoverTaskStatusInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/tasks/${handoverTaskId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function createHandoverBlocker(handoverCaseId: string, input: CreateHandoverBlockerInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/blockers`, {
    method: "POST",
    payload: input
  });
}

export async function updateHandoverBlocker(
  handoverCaseId: string,
  blockerId: string,
  input: UpdateHandoverBlockerInput
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/blockers/${blockerId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function startHandoverExecution(handoverCaseId: string, input: StartHandoverExecutionInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/execution`, {
    method: "PATCH",
    payload: input
  });
}

export async function completeHandover(handoverCaseId: string, input: CompleteHandoverInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/completion`, {
    method: "PATCH",
    payload: input
  });
}

export async function saveHandoverReview(handoverCaseId: string, input: SaveHandoverReviewInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/review`, {
    method: "PATCH",
    payload: input
  });
}

export async function createHandoverPostCompletionFollowUp(
  handoverCaseId: string,
  input: CreateHandoverPostCompletionFollowUpInput
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/post-completion-follow-up`, {
    method: "PATCH",
    payload: input
  });
}

export async function resolveHandoverPostCompletionFollowUp(
  handoverCaseId: string,
  followUpId: string,
  input: ResolveHandoverPostCompletionFollowUpInput
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/post-completion-follow-up/${followUpId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function updateHandoverMilestone(
  handoverCaseId: string,
  milestoneId: string,
  input: UpdateHandoverMilestoneInput
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/milestones/${milestoneId}`, {
    method: "PATCH",
    payload: input
  });
}

export async function approveHandoverCustomerUpdate(
  handoverCaseId: string,
  customerUpdateId: string,
  input: ApproveHandoverCustomerUpdateInput
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}`,
    {
      method: "PATCH",
      payload: input
    }
  );
}

export async function planHandoverAppointment(handoverCaseId: string, input: PlanHandoverAppointmentInput) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/appointment`, {
    method: "PATCH",
    payload: input
  });
}

export async function confirmHandoverAppointment(
  handoverCaseId: string,
  appointmentId: string,
  input: ConfirmHandoverAppointmentInput
) {
  return requestJson<PersistedHandoverCaseDetail>(`/v1/handover-cases/${handoverCaseId}/appointment/${appointmentId}/confirmation`, {
    method: "PATCH",
    payload: input
  });
}

export async function prepareHandoverCustomerUpdateDelivery(
  handoverCaseId: string,
  customerUpdateId: string,
  input: PrepareHandoverCustomerUpdateDeliveryInput
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}/delivery`,
    {
      method: "PATCH",
      payload: input
    }
  );
}

export async function markHandoverCustomerUpdateDispatchReady(
  handoverCaseId: string,
  customerUpdateId: string,
  input: MarkHandoverCustomerUpdateDispatchReadyInput
) {
  return requestJson<PersistedHandoverCaseDetail>(
    `/v1/handover-cases/${handoverCaseId}/customer-updates/${customerUpdateId}/dispatch-ready`,
    {
      method: "PATCH",
      payload: input
    }
  );
}

export function getWebApiBaseUrl() {
  const configuredBaseUrl = process.env.WEB_API_BASE_URL ?? defaultApiBaseUrl;

  return configuredBaseUrl.replace(/\/$/, "");
}

async function requestJson<T>(path: string, options?: ApiRequestOptions) {
  const requestInit: RequestInit = {
    cache: options?.cache ?? "no-store",
    headers: {
      "content-type": "application/json"
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
