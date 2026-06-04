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

export async function verifyQStashRequest(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return false;
  }

  try {
    await getReceiver().verify({
      signature,
      body: rawBody,
    });
    return true;
  } catch {
    return false;
  }
}
