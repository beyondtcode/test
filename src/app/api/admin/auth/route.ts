import { NextResponse } from "next/server";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSessionCookieValue,
} from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { password?: unknown };
    const password = parseNonEmptyString(body.password, "password");

    if (!password) {
      return NextResponse.json(
        { error: "נדרש להזין סיסמה." },
        { status: 400 }
      );
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword || password !== adminPassword) {
      return NextResponse.json(
        { error: "סיסמה שגויה. נסי שוב." },
        { status: 401 }
      );
    }

    const cookieValue = createAdminSessionCookieValue();

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_SESSION_COOKIE_NAME, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // Match TTL in session helper (in seconds).
      maxAge: 4 * 60 * 60,
    });

    return res;
  } catch (error) {
    console.error("[api/admin/auth]", error);
    return NextResponse.json(
      { error: "אירעה שגיאה במהלך אימות מנהל." },
      { status: 500 }
    );
  }
}

