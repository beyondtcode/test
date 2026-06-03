import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";
import { isExamTypeId } from "@/lib/exam/exam-types";
import {
  getAdminEditableExam,
  type UpdateExamInput,
  updateExamDefinition,
} from "@/lib/exam/questions";

export const runtime = "nodejs";

function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  const url = new URL(request.url);
  const proto =
    forwardedProto?.split(",")[0]?.trim() || url.protocol.replace(":", "");
  const host = forwardedHost?.split(",")[0]?.trim() || url.host;

  return `${proto}://${host}`;
}

async function ensureAdminSession(): Promise<NextResponse | null> {
  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  if (!verifyAdminSessionCookieValue(sessionValue)) {
    return NextResponse.json(
      { error: "אין לך הרשאה לבצע פעולה זו." },
      { status: 401 }
    );
  }
  return null;
}

function isSameOriginRequest(request: Request): boolean {
  const expectedOrigin = getRequestOrigin(request);
  const requestOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (requestOrigin && requestOrigin !== expectedOrigin) {
    return false;
  }

  if (referer && !referer.startsWith(expectedOrigin)) {
    return false;
  }

  return true;
}

function parseExamTypeFromUrl(request: Request): string | null {
  const examTypeId = new URL(request.url).searchParams.get("examTypeId");
  return examTypeId?.trim() || null;
}

export async function GET(request: Request) {
  const unauthorized = await ensureAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  const examTypeId = parseExamTypeFromUrl(request);
  if (!examTypeId || !isExamTypeId(examTypeId)) {
    return NextResponse.json(
      { error: "יש לציין סוג מבחן תקין (examTypeId)." },
      { status: 400 }
    );
  }

  return NextResponse.json(getAdminEditableExam(examTypeId));
}

export async function PUT(request: Request) {
  const unauthorized = await ensureAdminSession();
  if (unauthorized) {
    return unauthorized;
  }

  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "בקשה לא מורשית." }, { status: 403 });
  }

  const examTypeId = parseExamTypeFromUrl(request);
  if (!examTypeId || !isExamTypeId(examTypeId)) {
    return NextResponse.json(
      { error: "יש לציין סוג מבחן תקין (examTypeId)." },
      { status: 400 }
    );
  }

  try {
    const body = (await request.json()) as Partial<UpdateExamInput>;

    updateExamDefinition(examTypeId, {
      title: body.title ?? "",
      durationMinutes: body.durationMinutes ?? 0,
      questions: body.questions ?? [],
    });

    return NextResponse.json({
      ok: true,
      exam: getAdminEditableExam(examTypeId),
    });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "עדכון המבחן נכשל." }, { status: 400 });
  }
}
