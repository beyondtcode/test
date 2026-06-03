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

export function getAppBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || LOCAL_FALLBACK_APP_URL;
  return rawBaseUrl.replace(/\/+$/, "");
}

export function buildExamMagicLink(token: string): string {
  return `${getAppBaseUrl()}/test?token=${encodeURIComponent(token)}`;
}
