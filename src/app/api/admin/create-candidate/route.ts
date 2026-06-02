import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseNonEmptyString } from "@/lib/api/validation";
import { mondayFetch, EXAM_STATUS, MONDAY_COLUMNS } from "@/lib/monday";
import { mondayConfig } from "@/lib/env";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_FALLBACK_APP_URL = "http://localhost:3000";

function getRequestOrigin(request: Request): string {
  // Prefer proxy headers (works in Vercel), otherwise fall back to request.url.
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto = forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = forwardedHost?.split(",")[0]?.trim() || url.host;

  return `${proto}://${host}`;
}

function getAppBaseUrl(): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() || LOCAL_FALLBACK_APP_URL;
  return rawBaseUrl.replace(/\/+$/, "");
}

export async function POST(request: Request) {
  try {
    // Verify admin session via signed HttpOnly cookie.
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

    if (!verifyAdminSessionCookieValue(sessionValue)) {
      return NextResponse.json(
        { error: "אין לך הרשאה לבצע פעולה זו." },
        { status: 401 }
      );
    }

    const requestExpectedOrigin = getRequestOrigin(request);
    const requestOrigin = request.headers.get("origin");
    const referer = request.headers.get("referer");

    // CSRF mitigation: only allow requests from the same origin.
    if (requestOrigin && requestOrigin !== requestExpectedOrigin) {
      return NextResponse.json(
        { error: "בקשה לא מורשית." },
        { status: 403 }
      );
    }

    if (referer && !referer.startsWith(requestExpectedOrigin)) {
      return NextResponse.json(
        { error: "בקשה לא מורשית." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      name?: unknown;
      email?: unknown;
      jobPosition?: unknown;
    };

    const name = parseNonEmptyString(body.name, "name");
    const email = parseNonEmptyString(body.email, "email");
    const jobPosition = parseNonEmptyString(body.jobPosition, "jobPosition");

    if (!name || !email || !jobPosition) {
      return NextResponse.json(
        { error: "יש להזין שם, אימייל ותפקיד." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "האימייל שהוזן אינו תקין." },
        { status: 400 }
      );
    }

    const token =
      crypto.randomUUID() + "-" + crypto.randomBytes(16).toString("hex");

    const columnValues = JSON.stringify({
      [MONDAY_COLUMNS.email]: {
        email,
        text: email,
      },
      [MONDAY_COLUMNS.jobPosition]: { labels: [jobPosition] },
      [MONDAY_COLUMNS.magicLinkToken]: token,
      [MONDAY_COLUMNS.examStatus]: { label: EXAM_STATUS.NOT_STARTED },
    });

    const query = `
      mutation CreateCandidate($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
          create_labels_if_missing: true
        ) {
          id
        }
      }
    `;

    await mondayFetch<{ create_item: { id: string } }>({
      query,
      variables: {
        boardId: mondayConfig.boardId,
        itemName: name,
        columnValues,
      },
    });

    const baseUrl = getAppBaseUrl();
    const link = `${baseUrl}/test?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ link, token });
  } catch (error) {
    console.error("[api/admin/create-candidate]", error);
    return NextResponse.json(
      { error: "יצירת מועמדת חדשה נכשלה." },
      { status: 500 }
    );
  }
}

