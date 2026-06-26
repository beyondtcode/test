import { NextResponse } from "next/server";
import {
  rejectUnlessAdminSession,
  rejectUnlessSameOrigin,
} from "@/lib/admin/api-auth";
import { parseScheduledAt } from "@/lib/api/scheduled-at";
import { parseNonEmptyString } from "@/lib/api/validation";
import {
  listBoardGroups,
  scheduleExamDateForGroup,
} from "@/lib/monday/groups";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const unauthorized = await rejectUnlessAdminSession();
    if (unauthorized) {
      return unauthorized;
    }

    const forbidden = rejectUnlessSameOrigin(request);
    if (forbidden) {
      return forbidden;
    }

    const body = (await request.json()) as {
      groupId?: unknown;
      scheduledAt?: unknown;
    };

    const groupId = parseNonEmptyString(body.groupId, "groupId");
    const scheduledAt = parseScheduledAt(body.scheduledAt);

    if (!groupId || !scheduledAt) {
      return NextResponse.json(
        { error: "יש לבחור קבוצה ולהזין תאריך ושעה תקינים." },
        { status: 400 }
      );
    }

    const groups = await listBoardGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) {
      return NextResponse.json(
        { error: "הקבוצה שנבחרה לא נמצאה או שאין בה מועמדות." },
        { status: 404 }
      );
    }

    const result = await scheduleExamDateForGroup(groupId, scheduledAt);

    return NextResponse.json({
      groupId,
      groupTitle: group.title,
      scheduledAt: scheduledAt.toISOString(),
      updated: result.updated,
      failed: result.failed.length,
      errors: result.failed,
      qstashFailed: result.qstashFailed.length,
      qstashErrors: result.qstashFailed,
    });
  } catch (error) {
    console.error("[api/admin/set-group-schedule]", error);
    return NextResponse.json(
      { error: "עדכון תאריכי המבחן לקבוצה נכשל." },
      { status: 500 }
    );
  }
}
