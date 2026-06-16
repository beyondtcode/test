/** Removes internal role labels from Monday item names shown to candidates. */
export function formatConfirmGreetingName(name: string): string {
  return name
    .replace(/\s*ג'וניור\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}
