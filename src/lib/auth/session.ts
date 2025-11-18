export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  role: "admin" | "manager" | "user" | "viewer";
};

const allowedRoles: SessionUser["role"][] = [
  "admin",
  "manager",
  "user",
  "viewer",
];

function base64UrlToString(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;

  if (typeof atob === "function") {
    return atob(padded);
  }

  if (typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf-8");
  }

  throw new Error("Base64 decoding not supported in this environment");
}

function isSessionUser(payload: any): payload is SessionUser {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.id === "number" &&
    typeof payload.fullName === "string" &&
    typeof payload.email === "string" &&
    allowedRoles.includes(payload.role)
  );
}

export function decodeSessionCookie(raw?: string | null): SessionUser | null {
  if (!raw) return null;

  try {
    const decoded = base64UrlToString(raw);
    const payload = JSON.parse(decoded);
    if (isSessionUser(payload)) {
      return payload;
    }
    return null;
  } catch (error) {
    console.error("decodeSessionCookie error", error);
    return null;
  }
}
