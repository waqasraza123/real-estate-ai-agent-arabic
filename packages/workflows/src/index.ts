import type { CreateWebsiteLeadInput, CreateWebsiteLeadResult, PersistedCaseDetail, PersistedCaseSummary } from "@real-estate-ai/contracts";
import type { LeadCaptureStore } from "@real-estate-ai/database";

export async function getPersistedCaseDetail(store: LeadCaptureStore, caseId: string): Promise<PersistedCaseDetail | null> {
  return store.getCaseDetail(caseId);
}

export async function listPersistedCases(store: LeadCaptureStore): Promise<PersistedCaseSummary[]> {
  return store.listCases();
}

export async function submitWebsiteLead(
  store: LeadCaptureStore,
  input: CreateWebsiteLeadInput
): Promise<CreateWebsiteLeadResult> {
  return store.createWebsiteLeadCase({
    ...input,
    nextAction:
      input.preferredLocale === "ar"
        ? "Review the lead and send the first Arabic response"
        : "Review the lead and send the first response"
  });
}
