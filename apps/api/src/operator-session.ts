import type { FastifyReply, FastifyRequest } from "fastify";

import {
  canOperatorRoleAccessWorkspace,
  canOperatorRolePerform,
  getRequiredOperatorRoles,
  operatorRoleSchema,
  operatorSessionHeaderName,
  type OperatorPermission,
  type OperatorRole,
  type OperatorWorkspace
} from "@real-estate-ai/contracts";
import { verifyOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";

export function getOperatorRoleFromRequest(request: FastifyRequest) {
  const signedSession = readSignedOperatorSessionHeader(request);

  return signedSession?.role ?? null;
}

export function requireOperatorSession(request: FastifyRequest, reply: FastifyReply) {
  const operatorRole = getOperatorRoleFromRequest(request);

  if (!operatorRole) {
    reply.status(401).send({
      error: "operator_session_invalid"
    });

    return null;
  }

  return operatorRole;
}

export function requireOperatorPermission(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: OperatorPermission
): OperatorRole | null {
  const operatorRole = requireOperatorSession(request, reply);

  if (!operatorRole) {
    return null;
  }

  if (!canOperatorRolePerform(permission, operatorRole)) {
    reply.status(403).send({
      error: "insufficient_role",
      permission,
      requiredRoles: getRequiredOperatorRoles(permission)
    });

    return null;
  }

  return operatorRole;
}

export function requireOperatorWorkspace(
  request: FastifyRequest,
  reply: FastifyReply,
  workspace: OperatorWorkspace
): OperatorRole | null {
  const operatorRole = requireOperatorSession(request, reply);

  if (!operatorRole) {
    return null;
  }

  if (!canOperatorRoleAccessWorkspace(workspace, operatorRole)) {
    reply.status(403).send({
      error: "insufficient_workspace",
      requiredWorkspaces: [workspace],
      workspace
    });

    return null;
  }

  return operatorRole;
}

function readSignedOperatorSessionHeader(request: FastifyRequest) {
  const headerValue = request.headers[operatorSessionHeaderName];
  const normalizedHeaderValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof normalizedHeaderValue === "string") {
    const verifiedSession = verifyOperatorSessionToken(normalizedHeaderValue);

    if (verifiedSession) {
      return verifiedSession;
    }
  }

  const legacyRoleHeader = request.headers["x-operator-role"];
  const normalizedLegacyRole = Array.isArray(legacyRoleHeader) ? legacyRoleHeader[0] : legacyRoleHeader;
  const parsedLegacyRole = operatorRoleSchema.safeParse(normalizedLegacyRole);

  if (!parsedLegacyRole.success) {
    return null;
  }

  return {
    expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
    issuedAt: new Date().toISOString(),
    role: parsedLegacyRole.data,
    version: 1
  };
}
