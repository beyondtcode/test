import { Receiver } from "@upstash/qstash";
import { qstashConfig } from "@/lib/env";

let receiver: Receiver | null = null;

function getReceiver(): Receiver {
  if (!receiver) {
    receiver = new Receiver({
      currentSigningKey: qstashConfig.currentSigningKey,
      nextSigningKey: qstashConfig.nextSigningKey,
    });
  }
  return receiver;
}

export type QStashVerificationResult =
  | { ok: true }
  | {
      ok: false;
      reason: "missing_signature" | "verification_failed";
      error: string;
    };

export async function verifyQStashRequest(
  request: Request,
  rawBody: string
): Promise<QStashVerificationResult> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return {
      ok: false,
      reason: "missing_signature",
      error: "Missing upstash-signature header",
    };
  }

  try {
    await getReceiver().verify({
      signature,
      body: rawBody,
    });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "QStash signature verification failed";
    return {
      ok: false,
      reason: "verification_failed",
      error: message,
    };
  }
}
