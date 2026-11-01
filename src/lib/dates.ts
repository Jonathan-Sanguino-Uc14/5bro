const DIAS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Convert Date to "YYYY-MM-DD" using LOCAL timezone */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get the local date string for today */
export function todayLocalISO(): string {
  return toLocalDateString(new Date());
}

/** Add N days to a date string YYYY-MM-DD */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

/** Get { startDia, endDia } for "today" period */
export function getTodayRange(): { startDia: string; endDia: string } {
  const today = todayLocalISO();
  return { startDia: today, endDia: today };
}

/** Get { startDia, endDia } for "this week" (Mon-Sun of current week) */
export function getWeekRange(referenceDate?: Date): { startDia: string; endDia: string } {
  const ref = referenceDate ?? new Date();
  // getDay(): 0=Sun, 1=Mon ... 6=Sat
  const dow = ref.getDay();
  // Distance to Monday: if Sun (0), go back 6; else go back (dow - 1)
  const daysFromMon = dow === 0 ? 6 : dow - 1;
  const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() - daysFromMon);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return {
    startDia: toLocalDateString(monday),
    endDia: toLocalDateString(sunday),
  };
}

/** Get { startDia, endDia } for "this month" (1st to last day of current month) */
export function getMonthRange(referenceDate?: Date): { startDia: string; endDia: string } {
  const ref = referenceDate ?? new Date();
  const firstDay = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const lastDay = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return {
    startDia: toLocalDateString(firstDay),
    endDia: toLocalDateString(lastDay),
  };
}

/**
 * Get prior period with same duration.
 * Given {startDia, endDia}, return {startDia, endDia} for the period immediately before.
 */
export function getPriorPeriod(range: {
  startDia: string;
  endDia: string;
}): { startDia: string; endDia: string } {
  const [sy, sm, sd] = range.startDia.split('-').map(Number);
  const [ey, em, ed] = range.endDia.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);
  // duration in days (inclusive)
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationDays = Math.round(durationMs / (1000 * 60 * 60 * 24)) + 1;
  const priorEnd = new Date(sy, sm - 1, sd - 1);
  const priorStart = new Date(priorEnd.getFullYear(), priorEnd.getMonth(), priorEnd.getDate() - durationDays + 1);
  return {
    startDia: toLocalDateString(priorStart),
    endDia: toLocalDateString(priorEnd),
  };
}

/** Format YYYY-MM-DD to "Lun 14 Oct" style (Spanish abbreviated) */
export function formatDayHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  // getDay(): 0=Sun, 1=Mon ... 6=Sat; map to Mon=0...Sun=6
  const dow = date.getDay();
  const diaIdx = dow === 0 ? 6 : dow - 1;
  const diaNombre = DIAS_ES[diaIdx];
  const mesNombre = MESES_ES[m - 1];
  return `${diaNombre} ${d} ${mesNombre}`;
}

/** Format epoch ms to "HH:MM" */
export function formatTime(epochMs: number): string {
  const date = new Date(epochMs);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** Reject impossible dates rather than allowing JavaScript to roll them over. */
export function isValidLocalDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
