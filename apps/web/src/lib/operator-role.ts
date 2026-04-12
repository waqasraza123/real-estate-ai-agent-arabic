import {
  canOperatorRolePerform,
  canOperatorRoleAccessWorkspace,
  getRequiredOperatorRoles,
  insufficientRoleErrorSchema,
  type OperatorWorkspace,
  type InsufficientRoleError,
  type OperatorPermission,
  type OperatorRole
} from "@real-estate-ai/contracts";
import type { SupportedLocale } from "@real-estate-ai/domain";

export const defaultOperatorRole: OperatorRole = "handover_manager";
export const operatorRoleOptions: OperatorRole[] = ["sales_manager", "handover_coordinator", "handover_manager", "admin"];

export function canCurrentOperatorPerform(permission: OperatorPermission, operatorRole: OperatorRole) {
  return canOperatorRolePerform(permission, operatorRole);
}

export function canCurrentOperatorAccessWorkspace(workspace: OperatorWorkspace, operatorRole: OperatorRole) {
  return canOperatorRoleAccessWorkspace(workspace, operatorRole);
}

export function getOperatorPermissionGuardNote(locale: SupportedLocale, permission: OperatorPermission) {
  const roleLabels = getRequiredOperatorRoles(permission).map((role) => getOperatorRoleLabel(locale, role));
  const joinedRoles =
    roleLabels.length === 2 ? roleLabels.join(locale === "ar" ? " أو " : " or ") : joinRoleLabels(locale, roleLabels);

  return locale === "ar"
    ? `يتطلب هذا الإجراء دور ${joinedRoles} في وضع التحكم المحلي.`
    : `This action requires the ${joinedRoles} role in local control mode.`;
}

export function getInsufficientRoleError(body: unknown): InsufficientRoleError | null {
  const result = insufficientRoleErrorSchema.safeParse(body);

  return result.success ? result.data : null;
}

export function getOperatorRoleLabel(locale: SupportedLocale, role: OperatorRole) {
  const labels = {
    ar: {
      admin: "المشرف",
      handover_coordinator: "منسق التسليم",
      handover_manager: "مدير التسليم",
      sales_manager: "مدير المبيعات"
    },
    en: {
      admin: "admin",
      handover_coordinator: "handover coordinator",
      handover_manager: "handover manager",
      sales_manager: "sales manager"
    }
  } as const;

  return labels[locale][role];
}

export function getOperatorWorkspaceLabel(locale: SupportedLocale, workspace: OperatorWorkspace) {
  const labels = {
    ar: {
      handover: "مساحة التسليم",
      manager_handover: "قيادة التسليم",
      manager_revenue: "قيادة الإيرادات",
      sales: "مساحة المبيعات"
    },
    en: {
      handover: "handover workspace",
      manager_handover: "handover command center",
      manager_revenue: "revenue command center",
      sales: "sales workspace"
    }
  } as const;

  return labels[locale][workspace];
}

function joinRoleLabels(locale: SupportedLocale, roleLabels: string[]) {
  const leadingLabels = roleLabels.slice(0, -1).join(", ");
  const trailingLabel = roleLabels.at(-1);

  if (!trailingLabel) {
    return "";
  }

  return locale === "ar" ? `${leadingLabels} أو ${trailingLabel}` : `${leadingLabels}, or ${trailingLabel}`;
}
