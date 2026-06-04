/**
 * Server-only environment variables.
 * Import this only from Server Components, Route Handlers, or Server Actions.
 */
const PLACEHOLDER_PATTERN = /^your_.*_here$/i;

function normalizeMondayApiKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }
  if (key.toLowerCase().startsWith("bearer ")) {
    key = key.slice(7).trim();
  }
  return key;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value?.trim()) {
    // #region agent log
    fetch("http://127.0.0.1:7488/ingest/5e9b5d4c-503c-4b19-9abd-9ba9afdbe29a", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "4068cd",
      },
      body: JSON.stringify({
        sessionId: "4068cd",
        runId: "pre-fix",
        hypothesisId: "A",
        location: "src/lib/env.ts:requireEnv",
        message: "requireEnv failed",
        data: {
          name,
          defined: value !== undefined,
          trimmedLength: value?.trim().length ?? 0,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    throw new Error(`Missing required environment variable: ${name}`);
  }
  const trimmed = value.trim();
  if (PLACEHOLDER_PATTERN.test(trimmed)) {
    throw new Error(
      `${name} is still set to the placeholder from .env.example. Copy your real value from Monday.com (Admin → Connections → Personal API token, or Developers → My Access Tokens) into .env.local and restart the dev server.`
    );
  }
  return trimmed;
}

export const mondayConfig = {
  get apiKey() {
    return normalizeMondayApiKey(requireEnv("MONDAY_API_KEY"));
  },
  get boardId() {
    return requireEnv("MONDAY_BOARD_ID");
  },
} as const;

const DEFAULT_SMTP_USER = "dev@beyondtcode.com";

export const smtpConfig = {
  get host() {
    return requireEnv("SMTP_HOST");
  },
  get port() {
    const raw = process.env.SMTP_PORT?.trim();
    if (!raw) {
      return 587;
    }
    const port = Number.parseInt(raw, 10);
    if (!Number.isFinite(port) || port <= 0) {
      throw new Error("SMTP_PORT must be a positive integer");
    }
    return port;
  },
  get user() {
    return process.env.SMTP_USER?.trim() || DEFAULT_SMTP_USER;
  },
  get password() {
    return requireEnv("SMTP_PASSWORD");
  },
} as const;

export const qstashConfig = {
  get token() {
    return requireEnv("QSTASH_TOKEN");
  },
  get url() {
    return requireEnv("QSTASH_URL");
  },
  get currentSigningKey() {
    return requireEnv("QSTASH_CURRENT_SIGNING_KEY");
  },
  get nextSigningKey() {
    return requireEnv("QSTASH_NEXT_SIGNING_KEY");
  },
} as const;
