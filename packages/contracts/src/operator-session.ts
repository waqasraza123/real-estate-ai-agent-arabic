import { createHmac, timingSafeEqual } from "node:crypto";

import {
  localOperatorSessionDurationSeconds,
  localOperatorSessionSecretEnvironmentKey,
  operatorSessionPayloadSchema,
  type OperatorRole,
  type OperatorSessionPayload
} from "./index";

const defaultLocalOperatorSessionSecret = "local-operator-session-dev-mode";

export function createOperatorSessionToken(
  role: OperatorRole,
  options?: {
    maxAgeSeconds?: number;
    now?: Date;
    secret?: string;
  }
) {
  const issuedAt = options?.now ?? new Date();
  const expiresAt = new Date(issuedAt.getTime() + (options?.maxAgeSeconds ?? localOperatorSessionDurationSeconds) * 1000);
  const payload = operatorSessionPayloadSchema.parse({
    expiresAt: expiresAt.toISOString(),
    issuedAt: issuedAt.toISOString(),
    role,
    version: 1
  });
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, resolveOperatorSessionSecret(options?.secret));

  return {
    payload,
    token: `${encodedPayload}.${signature}`
  };
}

export function verifyOperatorSessionToken(
  token: string | undefined,
  options?: {
    now?: Date;
    secret?: string;
  }
): OperatorSessionPayload | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload, resolveOperatorSessionSecret(options?.secret));

  if (!compareSignatures(encodedSignature, expectedSignature)) {
    return null;
  }

  const decodedPayload = decodeBase64Url(encodedPayload);

  if (!decodedPayload) {
    return null;
  }

  const parsedPayload = parseOperatorSessionPayload(decodedPayload);

  if (!parsedPayload.success) {
    return null;
  }

  const comparisonTime = options?.now ?? new Date();

  if (new Date(parsedPayload.data.expiresAt).getTime() <= comparisonTime.getTime()) {
    return null;
  }

  return parsedPayload.data;
}

export function resolveOperatorSessionSecret(secret?: string) {
  const configuredSecret = secret?.trim() ?? process.env[localOperatorSessionSecretEnvironmentKey]?.trim();

  return configuredSecret && configuredSecret.length > 0 ? configuredSecret : defaultLocalOperatorSessionSecret;
}

function compareSignatures(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function decodeBase64Url(value: string) {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function parseOperatorSessionPayload(decodedPayload: string) {
  try {
    return operatorSessionPayloadSchema.safeParse(JSON.parse(decodedPayload));
  } catch {
    return operatorSessionPayloadSchema.safeParse(null);
  }
}

function signPayload(encodedPayload: string, secret: string) {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}
