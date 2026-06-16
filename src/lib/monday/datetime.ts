const JERUSALEM_TZ = "Asia/Jerusalem";

const JERUSALEM_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: JERUSALEM_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Formats an instant as date/time for Monday columns (wall clock in Asia/Jerusalem). */
export function formatMondayDateTime(date: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    JERUSALEM_PARTS_FORMATTER.formatToParts(date).map((p) => [p.type, p.value])
  ) as Record<string, string>;

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}:${parts.second}`,
  };
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
