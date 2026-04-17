import { timingSafeEqual } from "node:crypto";

import { operatorRoleSchema, type OperatorRole } from "@real-estate-ai/contracts";

const operatorRoleAccessKeysEnvironmentKey = "OPERATOR_ROLE_ACCESS_KEYS";

export function resolveOperatorRoleAccessKeys(environment: NodeJS.ProcessEnv = process.env): Map<OperatorRole, string> {
  const configuredPairs = (environment[operatorRoleAccessKeysEnvironmentKey] ?? "").trim();

  if (configuredPairs.length === 0) {
    return new Map();
  }

  const entries = configuredPairs
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const parsedEntries = new Map<OperatorRole, string>();

  for (const entry of entries) {
    const [rawRole, ...rawKeyParts] = entry.split(":");
    const roleResult = operatorRoleSchema.safeParse(rawRole?.trim());
    const accessKey = rawKeyParts.join(":").trim();

    if (!roleResult.success || accessKey.length === 0) {
      continue;
    }

    parsedEntries.set(roleResult.data, accessKey);
  }

  return parsedEntries;
}

export function canUseOperatorRoleAccessKey(operatorRole: OperatorRole, submittedAccessKey: string): boolean {
  const configuredAccessKey = resolveOperatorRoleAccessKeys().get(operatorRole);

  if (!configuredAccessKey) {
    return false;
  }

  const submittedKeyBuffer = Buffer.from(submittedAccessKey.trim());
  const configuredKeyBuffer = Buffer.from(configuredAccessKey);

  if (submittedKeyBuffer.length !== configuredKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(submittedKeyBuffer, configuredKeyBuffer);
}

