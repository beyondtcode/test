import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getRequestOrigin } from "@/lib/app-url";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";

export async function rejectUnlessAdminSession(): Promise<NextResponse | null> {
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

export function rejectUnlessSameOrigin(request: Request): NextResponse | null {
  const requestExpectedOrigin = getRequestOrigin(request);
  const requestOrigin = request.headers.get("origin");
  const referer = request.headers.get("referer");

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

  return null;
}
