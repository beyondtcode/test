const JERUSALEM_TZ = "Asia/Jerusalem";

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Formats an instant for Monday date columns that are not timezone-sensitive
 * (e.g. startTime audit stamps). Values are stored as UTC components.
 */
export function formatMondayDateTime(date: Date): { date: string; time: string } {
  return {
    date: `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`,
    time: `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`,
  };
}

/** Parses Monday date column raw values (stored in UTC) into an instant. */
export function instantFromMondayDateColumn(
  dateKey: string,
  time: string
): Date {
  const timeMatch = time.trim().match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
  const hh = timeMatch?.[1] ?? "00";
  const mm = timeMatch?.[2] ?? "00";
  const ss = timeMatch?.[3] ?? "00";
  return new Date(`${dateKey}T${hh}:${mm}:${ss}Z`);
}

/** Formats an instant as Jerusalem wall-clock date and HH:mm. */
export function instantToJerusalemWallClock(date: Date): {
  dateKey: string;
  timeHm: string;
} {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JERUSALEM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    timeHm: `${parts.hour}:${parts.minute}`,
  };
}

/** Monday UTC storage → Jerusalem wall-clock for candidate-facing display. */
export function jerusalemWallClockFromMondayDateColumn(
  dateKey: string,
  time: string
): { dateKey: string; timeHm: string } {
  return instantToJerusalemWallClock(
    instantFromMondayDateColumn(dateKey, time)
  );
}

/** Converts a Jerusalem wall-clock date and HH:mm into a UTC instant. */
export function jerusalemWallClockToInstant(
  dateKey: string,
  timeHm: string
): Date {
  const target = `${dateKey} ${timeHm}`;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JERUSALEM_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  let instant = Date.parse(`${dateKey}T${timeHm}:00Z`);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map((p) => [p.type, p.value])
    ) as Record<string, string>;
    const shown = `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
    if (shown === target) {
      return new Date(instant);
    }

    const [y, m, d] = dateKey.split("-").map(Number);
    const [hh, mm] = timeHm.split(":").map(Number);
    const shownDate = new Date(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute)
    );
    const targetDate = new Date(y, m - 1, d, hh, mm);
    instant += targetDate.getTime() - shownDate.getTime();
  }

  return new Date(instant);
}
