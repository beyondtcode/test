export function extractTokenFromInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const token = url.searchParams.get("token")?.trim();
    if (token) {
      return token;
    }
  } catch {
    // Not a full URL — treat as a raw token.
  }

  return trimmed;
}
