export function parseNonEmptyString(
  value: unknown,
  fieldName: string
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }
  return value.trim();
}

export function parseAnswersArray(
  value: unknown,
  expectedLength: number
): (number | null)[] | null {
  if (
    !Array.isArray(value) ||
    !Number.isInteger(expectedLength) ||
    expectedLength <= 0 ||
    value.length !== expectedLength
  ) {
    return null;
  }
  const parsed: (number | null)[] = [];
  for (const item of value) {
    if (item === null) {
      parsed.push(null);
    } else if (typeof item === "number" && Number.isInteger(item) && item >= 0) {
      parsed.push(item);
    } else {
      return null;
    }
  }
  return parsed;
}

export function parseTabLeavesCount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return null;
  }
  return value;
}
