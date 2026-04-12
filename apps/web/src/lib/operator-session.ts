import { cookies } from "next/headers";

import { operatorSessionCookieName, type OperatorRole } from "@real-estate-ai/contracts";
import { createOperatorSessionToken, verifyOperatorSessionToken } from "@real-estate-ai/contracts/operator-session";

import { defaultOperatorRole } from "@/lib/operator-role";

export async function getCurrentOperatorRole() {
  const session = await getCurrentOperatorSession();

  return session.role;
}

export async function getCurrentOperatorSession() {
  const cookieStore = await cookies();
  const signedSession = verifyOperatorSessionToken(cookieStore.get(operatorSessionCookieName)?.value);

  if (signedSession) {
    return signedSession;
  }

  return createOperatorSessionToken(defaultOperatorRole).payload;
}

export async function getCurrentOperatorSessionToken() {
  const cookieStore = await cookies();
  const storedToken = cookieStore.get(operatorSessionCookieName)?.value;

  if (verifyOperatorSessionToken(storedToken)) {
    return storedToken as string;
  }

  return createOperatorSessionToken(defaultOperatorRole).token;
}

export function createSignedOperatorSession(role: OperatorRole) {
  return createOperatorSessionToken(role).token;
}
