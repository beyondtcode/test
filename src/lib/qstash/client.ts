import { Client } from "@upstash/qstash";
import { qstashConfig } from "@/lib/env";

let client: Client | null = null;

export function getQStashClient(): Client {
  if (!client) {
    client = new Client({
      token: qstashConfig.token,
      baseUrl: qstashConfig.url,
    });
  }
  return client;
}
