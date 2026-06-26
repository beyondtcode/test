const LOCAL_FALLBACK_APP_URL = "http://localhost:3000";

export function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto =
    forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = forwardedHost?.split(",")[0]?.trim() || url.host;

  return `${proto}://${host}`;
}

function normalizeBaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "");
}

/** Public origin for magic links and QStash webhook targets. */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return normalizeBaseUrl(configured);
  }

  // Vercel sets these at runtime on deployed environments (server-side scheduling).
  const vercelHost = (
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    ""
  ).replace(/^https?:\/\//, "");

  if (vercelHost) {
    return `https://${normalizeBaseUrl(vercelHost)}`;
  }

  return LOCAL_FALLBACK_APP_URL;
}

export function buildExamMagicLink(token: string): string {
  return `${getAppBaseUrl()}/test?token=${encodeURIComponent(token)}`;
}
