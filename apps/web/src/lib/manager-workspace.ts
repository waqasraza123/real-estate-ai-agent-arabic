import {
  canOperatorRoleAccessWorkspace,
  canOperatorRolePerform,
  type OperatorRole,
  type PersistedCaseDetail,
  type PersistedCaseSummary,
  type SupportedLocale
} from "@real-estate-ai/contracts";

import { getPersistedHandoverWorkspaceSurface } from "./persisted-case-presenters";

export type ManagerWorkspaceRoute = "manager_revenue" | "manager_handover";

type PersistedManagerCase = PersistedCaseDetail | PersistedCaseSummary;

export function buildManagerWorkspaceQueues(persistedCases: PersistedManagerCase[]) {
  const planningCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "planning")
    .sort((left, right) => {
      const priority = {
        customer_scheduling_ready: 0,
        internal_tasks_open: 1,
        pending_readiness: 2
      } as const;

      const leftStatus = left.handoverCase?.status;
      const rightStatus = right.handoverCase?.status;
      const leftPriority = leftStatus ? (priority[leftStatus as keyof typeof priority] ?? 2) : 2;
      const rightPriority = rightStatus ? (priority[rightStatus as keyof typeof priority] ?? 2) : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  const executionCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "execution")
    .sort((left, right) => {
      const priority = {
        in_progress: 0,
        scheduled: 1
      } as const;

      const leftStatus = left.handoverCase?.status;
      const rightStatus = right.handoverCase?.status;
      const leftPriority = leftStatus ? (priority[leftStatus as keyof typeof priority] ?? 1) : 1;
      const rightPriority = rightStatus ? (priority[rightStatus as keyof typeof priority] ?? 1) : 1;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  const closureCases = persistedCases
    .filter((caseItem) => getPersistedHandoverWorkspaceSurface(caseItem) === "closure")
    .sort((left, right) => {
      const priority = {
        ready_to_archive: 0,
        held: 1,
        closure_review_required: 2,
        aftercare_open: 3,
        archived: 4
      } as const;

      const leftPriority = priority[left.handoverClosure?.status ?? "archived"];
      const rightPriority = priority[right.handoverClosure?.status ?? "archived"];

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });

  const revenueAttentionCases = persistedCases.filter(
    (caseItem) => caseItem.followUpStatus === "attention" || caseItem.openInterventionsCount > 0
  );
  const governanceHeldAutomationCases = persistedCases.filter((caseItem) => caseItem.automationHoldReason !== null);
  const pausedAutomationCases = persistedCases.filter((caseItem) => caseItem.automationStatus === "paused");
  const openInterventionsCount = persistedCases.reduce((total, caseItem) => total + caseItem.openInterventionsCount, 0);

  return {
    closureCases,
    executionCases,
    governanceHeldAutomationCases,
    openInterventionsCount,
    pausedAutomationCases,
    planningCases,
    revenueAttentionCases
  };
}

export function getDefaultManagerPath(locale: SupportedLocale, operatorRole: OperatorRole) {
  const canAccessRevenueManagerWorkspace = canOperatorRoleAccessWorkspace("manager_revenue", operatorRole);
  const canAccessHandoverManagerWorkspace = canOperatorRoleAccessWorkspace("manager_handover", operatorRole);

  if (canAccessRevenueManagerWorkspace && canAccessHandoverManagerWorkspace) {
    return `/${locale}/manager`;
  }

  if (canAccessRevenueManagerWorkspace) {
    return getManagerWorkspacePath(locale, "manager_revenue");
  }

  if (canAccessHandoverManagerWorkspace) {
    return getManagerWorkspacePath(locale, "manager_handover");
  }

  return `/${locale}/dashboard`;
}

export function getManagerWorkspaceCapabilities(operatorRole: OperatorRole) {
  return {
    canManageClosure: canOperatorRolePerform("manage_handover_governance", operatorRole),
    canManageExecution:
      canOperatorRolePerform("manage_handover_blockers", operatorRole) ||
      canOperatorRolePerform("manage_handover_execution", operatorRole),
    canManageFollowUp: canOperatorRolePerform("manage_case_follow_up", operatorRole),
    canManagePlanning:
      canOperatorRolePerform("manage_handover_milestones", operatorRole) ||
      canOperatorRolePerform("manage_handover_appointments", operatorRole) ||
      canOperatorRolePerform("manage_handover_customer_updates", operatorRole)
  };
}

export function getManagerWorkspaceFallbackAction(locale: SupportedLocale, operatorRole: OperatorRole) {
  const href = getDefaultManagerPath(locale, operatorRole);

  if (href.endsWith("/manager/revenue")) {
    return {
      href,
      label: locale === "ar" ? "فتح قيادة الإيرادات" : "Open revenue command center"
    };
  }

  if (href.endsWith("/manager/handover")) {
    return {
      href,
      label: locale === "ar" ? "فتح قيادة التسليم" : "Open handover command center"
    };
  }

  return {
    href,
    label: locale === "ar" ? "العودة إلى اللوحة" : "Return to the dashboard"
  };
}

export function getManagerWorkspacePath(locale: SupportedLocale, workspace: ManagerWorkspaceRoute) {
  return workspace === "manager_revenue" ? `/${locale}/manager/revenue` : `/${locale}/manager/handover`;
}

export function getManagerWorkspaceCopy(locale: SupportedLocale, workspace: ManagerWorkspaceRoute) {
  const copy = {
    ar: {
      manager_handover: {
        accessRequiredTitle: "قيادة التسليم مطلوبة",
        summary: "طوابير تخطيط وتنفيذ وإغلاق التسليم الحي مع حدود واضحة للأدوار والاعتماد.",
        title: "مركز قيادة التسليم"
      },
      manager_revenue: {
        accessRequiredTitle: "قيادة الإيرادات مطلوبة",
        summary: "متابعة تجارية وتدخلات إدارية ورقابة على الأتمتة للحالات التي تحتاج قراراً سريعاً.",
        title: "مركز قيادة الإيرادات"
      }
    },
    en: {
      manager_handover: {
        accessRequiredTitle: "Handover command center required",
        summary: "Planning, execution, and closure queues for live handover operations with explicit role boundaries.",
        title: "Handover command center"
      },
      manager_revenue: {
        accessRequiredTitle: "Revenue command center required",
        summary: "Commercial follow-up, intervention, and automation oversight for cases that need manager action.",
        title: "Revenue command center"
      }
    }
  } as const;

  return copy[locale][workspace];
}
