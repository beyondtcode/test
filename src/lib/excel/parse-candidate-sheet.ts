import * as XLSX from "xlsx";

export type ParsedCandidateRow = {
  firstName: string;
  familyName: string;
  email: string;
  phone: string;
  seminary: string;
  notes: string;
  examName: string;
  /** 1-based spreadsheet row number (header = row 1) */
  sheetRow: number;
};

export type ParseCandidateSheetResult = {
  rows: ParsedCandidateRow[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldKey =
  | "firstName"
  | "familyName"
  | "email"
  | "phone"
  | "seminary"
  | "notes"
  | "examName";

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  firstName: ["first name", "firstname", "given name", "name", "שם", "שם פרטי"],
  familyName: [
    "family name",
    "familyname",
    "last name",
    "lastname",
    "surname",
    "שם משפחה",
  ],
  email: ["email", "מייל"],
  phone: ["phone", "טלפון"],
  seminary: ["seminary", "סמינר"],
  notes: ["notes", "הערות", "comments"],
  examName: ["exam name", "examname", "שם מבחן"],
};

const REQUIRED_FIELDS: FieldKey[] = [
  "firstName",
  "familyName",
  "email",
  "examName",
];

const FIELD_LABELS_HE: Record<FieldKey, string> = {
  firstName: "שם",
  familyName: "שם משפחה",
  email: "מייל",
  phone: "טלפון",
  seminary: "סמינר",
  notes: "הערות",
  examName: "שם מבחן",
};

/** Default Monday item name when both name columns are empty after import sanitization. */
export const IMPORT_NAME_FALLBACK = "מועמד ללא שם";

/** Builds the single Monday item name from separate Excel name columns. */
export function formatCandidateFullName(
  firstName: string,
  familyName: string
): string {
  return `${firstName.trim()} ${familyName.trim()}`.trim();
}

/** Monday item name with fallback when all name fields are empty. */
export function formatImportItemName(
  firstName: string,
  familyName: string
): string {
  return formatCandidateFullName(firstName, familyName) || IMPORT_NAME_FALLBACK;
}

/** Returns a single valid email, or "" when missing, multi-value, or invalid. */
export function sanitizeImportEmail(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return "";
  }
  if (/[;,]/.test(trimmed)) {
    return "";
  }
  return EMAIL_RE.test(trimmed) ? trimmed : "";
}

/** Normalizes import row fields; missing/invalid values become empty strings. */
export function sanitizeImportRow(row: ParsedCandidateRow): ParsedCandidateRow {
  return {
    ...row,
    firstName: row.firstName.trim(),
    familyName: row.familyName.trim(),
    email: sanitizeImportEmail(row.email),
    examName: row.examName.trim(),
  };
}

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildHeaderIndexMap(
  headers: string[]
): Partial<Record<FieldKey, number>> {
  const indexByField: Partial<Record<FieldKey, number>> = {};

  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    if (!normalized) {
      continue;
    }

    for (const field of Object.keys(HEADER_ALIASES) as FieldKey[]) {
      if (HEADER_ALIASES[field].some((alias) => normalizeHeader(alias) === normalized)) {
        indexByField[field] = i;
      }
    }
  }

  return indexByField;
}

function cellValue(row: unknown[], index: number | undefined): string {
  if (index === undefined) {
    return "";
  }
  const raw = row[index];
  if (raw === null || raw === undefined) {
    return "";
  }
  return String(raw).trim();
}

function isBlankDataRow(row: unknown[]): boolean {
  return row.every(
    (cell) => cell === null || cell === undefined || String(cell).trim() === ""
  );
}

export class ParseCandidateSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseCandidateSheetError";
  }
}

export function parseCandidateSheet(buffer: Buffer): ParseCandidateSheetResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new ParseCandidateSheetError("הקובץ ריק או לא מכיל גיליון נתונים.");
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (matrix.length === 0) {
    throw new ParseCandidateSheetError("הקובץ ריק או לא מכיל שורות נתונים.");
  }

  const headerRow = matrix[0].map((cell) => String(cell ?? ""));
  const indexByField = buildHeaderIndexMap(headerRow);

  const missing = REQUIRED_FIELDS.filter((field) => indexByField[field] === undefined);
  if (missing.length > 0) {
    const labels = missing.map((f) => FIELD_LABELS_HE[f]).join(", ");
    throw new ParseCandidateSheetError(
      `חסרות עמודות חובה בקובץ: ${labels}. ודאי שהכותרות תואמות לתבנית הנדרשת.`
    );
  }

  const rows: ParsedCandidateRow[] = [];

  for (let i = 1; i < matrix.length; i++) {
    const dataRow = matrix[i];
    if (!Array.isArray(dataRow) || isBlankDataRow(dataRow)) {
      continue;
    }

    const sheetRow = i + 1;
    rows.push({
      firstName: cellValue(dataRow, indexByField.firstName),
      familyName: cellValue(dataRow, indexByField.familyName),
      email: cellValue(dataRow, indexByField.email),
      phone: cellValue(dataRow, indexByField.phone),
      seminary: cellValue(dataRow, indexByField.seminary),
      notes: cellValue(dataRow, indexByField.notes),
      examName: cellValue(dataRow, indexByField.examName),
      sheetRow,
    });
  }

  if (rows.length === 0) {
    throw new ParseCandidateSheetError("לא נמצאו שורות מועמדות בקובץ.");
  }

  return { rows };
}

export { EMAIL_RE };
