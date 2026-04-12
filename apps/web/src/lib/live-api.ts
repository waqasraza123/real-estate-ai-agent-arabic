import { cookies } from "next/headers";

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
  SaveHandoverArchiveReviewInput,
  SaveHandoverReviewInput,
  ScheduleVisitInput,
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
import { createOperatorSessionToken, verifyOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";

import { defaultOperatorRole } from "@/lib/operator-role";

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

export async function manageCaseFollowUp(caseId: string, input: ManageCaseFollowUpInput, operatorRole?: OperatorRole) {
  return requestJson<PersistedCaseDetail>(`/v1/cases/${caseId}/follow-up-plan`, {
    headers: await getOperatorSessionHeaders(operatorRole),
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
  if (operatorRole) {
    return {
      [operatorSessionHeaderName]: createOperatorSessionToken(operatorRole).token
    };
  }

  const cookieStore = await cookies();
  const storedSessionToken = cookieStore.get(operatorSessionCookieName)?.value;

  return {
    [operatorSessionHeaderName]: verifyOperatorSessionToken(storedSessionToken)
      ? (storedSessionToken as string)
      : createOperatorSessionToken(defaultOperatorRole).token
  };
}
