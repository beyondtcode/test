import { timingSafeEqual } from "crypto";
import { mondayWebhookConfig } from "@/lib/env";

export function verifyMondayWebhookSecret(request: Request): boolean {
  const provided = new URL(request.url).searchParams.get("secret");
  if (!provided) {
    return false;
  }

  const expected = mondayWebhookConfig.secret;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer);
}
