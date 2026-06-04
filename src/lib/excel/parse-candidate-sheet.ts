import * as XLSX from "xlsx";

export type ParsedCandidateRow = {
  name: string;
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
  | "name"
  | "email"
  | "phone"
  | "seminary"
  | "notes"
  | "examName";

const HEADER_ALIASES: Record<FieldKey, string[]> = {
  name: ["name", "שם ושם משפחה"],
  email: ["email", "מייל"],
  phone: ["phone", "טלפון"],
  seminary: ["seminary", "סמינר"],
  notes: ["notes", "הערות", "comments"],
  examName: ["exam name", "examname", "שם מבחן"],
};

const REQUIRED_FIELDS: FieldKey[] = ["name", "email", "examName"];

const FIELD_LABELS_HE: Record<FieldKey, string> = {
  name: "שם",
  email: "מייל",
  phone: "טלפון",
  seminary: "סמינר",
  notes: "הערות",
  examName: "שם מבחן",
};

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

export function validateParsedRow(row: {
  name: string;
  email: string;
  examName: string;
  sheetRow: number;
}): string | null {
  if (!row.name) {
    return "חסר שם מועמדת.";
  }
  if (!row.email) {
    return "חסר אימייל.";
  }
  if (!EMAIL_RE.test(row.email)) {
    return `האימייל "${row.email}" אינו תקין.`;
  }
  if (!row.examName) {
    return "חסר שם מבחן.";
  }
  return null;
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
      name: cellValue(dataRow, indexByField.name),
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
