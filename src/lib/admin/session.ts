import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session_v1";

// Keep sessions short-lived. This is a pure client-cookie design (no DB),
// so we rely on signature + expiration instead of server-side storage.
const ADMIN_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function requireAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password?.trim()) {
    // Treat as a server misconfiguration. Never fall back to an insecure default.
    throw new Error("Missing required environment variable: ADMIN_PASSWORD");
  }
  return password;
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str: string): Buffer {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  return Buffer.from(b64 + pad, "base64");
}

function sign(payload: string, secret: string): string {
  const digest = crypto.createHmac("sha256", secret).update(payload).digest();
  return base64UrlEncode(digest);
}

function timingSafeEqualBase64Url(a: string, b: string): boolean {
  try {
    const bufA = base64UrlDecode(a);
    const bufB = base64UrlDecode(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/**
 * Cookie format:
 *   sessionId.expMs.signature
 */
export function createAdminSessionCookieValue(): string {
  const secret = requireAdminPassword();
  const sessionId = crypto.randomBytes(32).toString("hex");
  const expMs = Date.now() + ADMIN_SESSION_TTL_MS;
  const payload = `${sessionId}.${expMs}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifyAdminSessionCookieValue(
  cookieValue: string | undefined | null
): boolean {
  if (!cookieValue) return false;

  const secret = process.env.ADMIN_PASSWORD;
  if (!secret?.trim()) return false;

  const parts = cookieValue.split(".");
  // sessionId.expMs.signature
  if (parts.length !== 3) return false;

  const [sessionId, expMsStr, signature] = parts;
  const expMs = Number(expMsStr);
  if (!Number.isFinite(expMs)) return false;
  if (Date.now() >= expMs) return false;

  const payload = `${sessionId}.${expMsStr}`;
  const expectedSignature = sign(payload, secret);
  return timingSafeEqualBase64Url(signature, expectedSignature);
}

export function isAdminSessionValidFromCookies(): boolean {
  const value = cookies().get(ADMIN_SESSION_COOKIE_NAME)?.value;
  return verifyAdminSessionCookieValue(value);
}

