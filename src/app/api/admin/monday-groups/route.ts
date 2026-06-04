import { NextResponse } from "next/server";
import { rejectUnlessAdminSession } from "@/lib/admin/api-auth";
import { listBoardGroups } from "@/lib/monday/groups";

export const runtime = "nodejs";

export async function GET() {
  try {
    const unauthorized = await rejectUnlessAdminSession();
    if (unauthorized) {
      return unauthorized;
    }

    const groups = await listBoardGroups();

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("[api/admin/monday-groups]", error);
    return NextResponse.json(
      { error: "טעינת קבוצות מ-Monday נכשלה." },
      { status: 500 }
    );
  }
}
