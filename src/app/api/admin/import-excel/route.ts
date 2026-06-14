import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateCandidateMagicToken } from "@/lib/candidate/token";
import {
  formatCandidateFullName,
  parseCandidateSheet,
  ParseCandidateSheetError,
  validateParsedRow,
} from "@/lib/excel/parse-candidate-sheet";
import { getRequestOrigin } from "@/lib/app-url";
import {
  buildImportColumnValues,
  createCandidateItemInGroup,
  createMondayGroup,
  groupNameFromFilename,
} from "@/lib/monday/groups";
import {
  ADMIN_SESSION_COOKIE_NAME,
  verifyAdminSessionCookieValue,
} from "@/lib/admin/session";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

type ImportRowError = {
  row: number;
  message: string;
  name?: string;
};

function hasAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export async function POST(request: Request) {
  try {
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

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!fileEntry || typeof fileEntry === "string") {
      return NextResponse.json(
        { error: "יש להעלות קובץ Excel או CSV." },
        { status: 400 }
      );
    }

    const file = fileEntry as File;

    if (!hasAllowedExtension(file.name)) {
      return NextResponse.json(
        { error: "סוג קובץ לא נתמך. ניתן להעלות קבצי .xlsx, .xls או .csv בלבד." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "הקובץ גדול מדי. הגודל המקסימלי הוא 5MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(arrayBuffer);
    let parsed;

    try {
      parsed = parseCandidateSheet(buffer);
    } catch (error) {
      if (error instanceof ParseCandidateSheetError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    if (parsed.rows.length > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `הקובץ מכיל יותר מ-${MAX_ROWS} שורות. פצלו את הקובץ לקבצים קטנים יותר.`,
        },
        { status: 400 }
      );
    }

    const groupName = groupNameFromFilename(file.name);
    const groupId = await createMondayGroup(groupName);

    const errors: ImportRowError[] = [];
    let imported = 0;

    for (const row of parsed.rows) {
      const fullName = formatCandidateFullName(row.firstName, row.familyName);
      const validationError = validateParsedRow(row);
      if (validationError) {
        errors.push({
          row: row.sheetRow,
          name: fullName || undefined,
          message: validationError,
        });
        continue;
      }

      try {
        const token = generateCandidateMagicToken();
        const columnValues = buildImportColumnValues(row, token);
        await createCandidateItemInGroup({
          groupId,
          name: fullName,
          columnValues,
        });
        imported += 1;
      } catch (rowError) {
        const message =
          rowError instanceof Error
            ? rowError.message
            : "יצירת פריט ב-Monday נכשלה.";
        errors.push({
          row: row.sheetRow,
          name: fullName,
          message,
        });
      }
    }

    return NextResponse.json({
      groupId,
      groupName,
      imported,
      failed: errors.length,
      totalRows: parsed.rows.length,
      errors,
    });
  } catch (error) {
    console.error("[api/admin/import-excel]", error);
    return NextResponse.json(
      { error: "ייבוא הקובץ נכשל." },
      { status: 500 }
    );
  }
}
