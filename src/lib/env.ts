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
