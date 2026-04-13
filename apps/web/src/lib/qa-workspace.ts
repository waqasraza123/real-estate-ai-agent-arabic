import type { PersistedCaseDetail, PersistedCaseSummary, SupportedLocale } from "@real-estate-ai/contracts";

type PersistedQaCase = PersistedCaseDetail | PersistedCaseSummary;

export function buildQaWorkspaceQueues(persistedCases: PersistedQaCase[]) {
  const qaCases = persistedCases.filter((caseItem) => caseItem.currentQaReview);

  const sortedQaCases = [...qaCases].sort((left, right) => {
    const statusPriority = {
      pending_review: 0,
      follow_up_required: 1,
      approved: 2
    } as const;

    const leftPriority = statusPriority[left.currentQaReview?.status ?? "approved"];
    const rightPriority = statusPriority[right.currentQaReview?.status ?? "approved"];

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });

  return {
    approvedCases: sortedQaCases.filter((caseItem) => caseItem.currentQaReview?.status === "approved"),
    followUpCases: sortedQaCases.filter((caseItem) => caseItem.currentQaReview?.status === "follow_up_required"),
    pendingCases: sortedQaCases.filter((caseItem) => caseItem.currentQaReview?.status === "pending_review"),
    qaCases: sortedQaCases
  };
}

export function getQaWorkspaceCopy(locale: SupportedLocale) {
  if (locale === "ar") {
    return {
      accessRequiredTitle: "مساحة الجودة مطلوبة",
      summary: "طابور مراجعة الجودة للحالات الحية التي تحتاج فحصاً بشرياً واضحاً للسلامة أو التفسير أو جودة الرد.",
      title: "مركز مراجعة الجودة"
    };
  }

  return {
    accessRequiredTitle: "QA workspace required",
    summary: "A QA review queue for live cases that need explicit human inspection for safety, interpretation, or response quality.",
    title: "QA review center"
  };
}
