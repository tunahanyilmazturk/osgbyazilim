import { cookies } from "next/headers";
import { SessionUser, decodeSessionCookie } from "@/lib/auth/session";

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get("app_session")?.value ?? null;
  return decodeSessionCookie(raw);
}

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("Unauthorized: session is missing or invalid");
  }
  return user;
}
