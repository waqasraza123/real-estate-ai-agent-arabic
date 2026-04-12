import { operatorRoleSchema, type OperatorRole } from "@real-estate-ai/contracts";

export const operatorRoleCookieName = "operator_role";
export const defaultOperatorRole: OperatorRole = "handover_manager";
export const operatorRoleOptions: OperatorRole[] = ["sales_manager", "handover_coordinator", "handover_manager", "admin"];

export function getOperatorRoleFromCookie(value: string | undefined): OperatorRole {
  const result = operatorRoleSchema.safeParse(value);

  return result.success ? result.data : defaultOperatorRole;
}
