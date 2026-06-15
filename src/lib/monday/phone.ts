/** Monday phone columns reject formatted numbers (e.g. 053-4177308). */
export function normalizeMondayPhone(phone: string): string {
  return phone.trim().replace(/[\s\-()]/g, "");
}
