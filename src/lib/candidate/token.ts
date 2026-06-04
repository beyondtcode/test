import crypto from "crypto";

export function generateCandidateMagicToken(): string {
  return crypto.randomUUID() + "-" + crypto.randomBytes(16).toString("hex");
}
