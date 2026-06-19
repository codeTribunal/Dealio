import { prisma } from '../lib/prisma.js';

// ─── Timezone ────────────────────────────────────────────────────────────────
// All scheduling math is done in Asia/Tashkent, which is a FIXED UTC+5 offset
// (Uzbekistan has no daylight saving). We do not pull in a tz library; instead
// we apply the fixed offset uniformly. A Tashkent wall-clock time HH:MM on a
// given calendar date corresponds to that time minus 5h in UTC.
const TASHKENT_OFFSET_MIN = 5 * 60; // +5h
const TASHKENT_OFFSET_MS = TASHKENT_OFFSET_MIN * 60_000;

// UTC instant for Tashkent 00:00 on the given calendar date (YYYY-MM-DD).
function tashkentMidnightUtcMs(year: number, month1: number, day: number): number {
  // Date.UTC gives the instant for that wall-clock time interpreted as UTC;
  // subtract the offset so it represents Tashkent local midnight.
  return Date.UTC(year, month1 - 1, day, 0, 0, 0, 0) - TASHKENT_OFFSET_MS;
}

// Day-of-week (0=Sun … 6=Sat) of a Tashkent calendar date string. Because the
// date string already names a Tashkent calendar date, we read the weekday off a
// UTC date built from the same components (offset is irrelevant to weekday).
function tashkentDayOfWeek(year: number, month1: number, day: number): number {
  return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay();
}

// Tashkent calendar date (YYYY-MM-DD) for an arbitrary UTC instant.
function tashkentDateStr(d: Date): string {
  return new Date(d.getTime() + TASHKENT_OFFSET_MS).toISOString().slice(0, 10);
}

function parseDateStr(dateStr: string): { year: number; month1: number; day: number } {
  const [year, month1, day] = dateStr.split('-').map(Number);
  return { year, month1, day };
}

// ─── Working-hours shape ─────────────────────────────────────────────────────
interface WorkingDay {
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}
// A day's hours: an array of intervals (breaks/lunch are the gaps between
// them), a single interval object (legacy format), or null/absent (closed).
type WorkingHours = Record<string, WorkingDay | WorkingDay[] | null>;

export interface TimeSlot {
  startTime: string; // ISO datetime (UTC)
  endTime: string; // ISO datetime (UTC)
  startLabel: string; // "HH:MM" — Tashkent wall clock
  endLabel: string; // "HH:MM" — Tashkent wall clock
}

const DEFAULT_DAY: WorkingDay = { start: '09:00', end: '18:00' };

function minutesFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isWorkingDay(v: unknown): v is WorkingDay {
  return (
    v != null &&
    typeof v === 'object' &&
    typeof (v as WorkingDay).start === 'string' &&
    typeof (v as WorkingDay).end === 'string'
  );
}

/**
 * Resolve the open INTERVALS for a given day (a day can have several, with
 * breaks/lunch as the gaps between them).
 *  - workingHours entirely UNSET (no object)        → default [09:00–18:00].
 *  - this day === null / absent / empty             → CLOSED (returns null).
 *  - this day === { start,end } (legacy single)     → one interval.
 *  - this day === [{ start,end }, …]                → those intervals.
 */
function resolveDayWindows(rawHours: unknown, dayOfWeek: number): WorkingDay[] | null {
  if (rawHours == null || typeof rawHours !== 'object') {
    return [DEFAULT_DAY]; // never configured
  }
  const hours = rawHours as WorkingHours;
  const key = String(dayOfWeek);
  if (!(key in hours)) return null; // configured but day absent → closed
  const v = hours[key];
  if (v == null) return null; // explicitly closed
  if (Array.isArray(v)) {
    const arr = v.filter(isWorkingDay);
    return arr.length > 0 ? arr : null;
  }
  return isWorkingDay(v) ? [v] : null; // legacy single window
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ─── Day context ─────────────────────────────────────────────────────────────
// Everything the per-interval availability test needs for a single Tashkent day.
interface DayContext {
  closed: boolean;
  // Tashkent minute-of-day intervals the business is open (breaks are the gaps).
  windows: { startMin: number; endMin: number }[];
  dayStartUtcMs: number; // UTC instant of Tashkent midnight for this date
  durationMin: number;
  bufferMs: number;
  appointments: { start: number; end: number; staffId: string | null }[];
  blocks: { start: number; end: number; staffId: string | null }[];
  qualifiedStaffIds: string[];
  staffOffToday: Set<string>; // qualified staff on a day off for this date
  implicitResource: boolean; // no qualified staff → single shared resource
}

async function loadDayContext(params: {
  business: { id: string; workingHours: unknown; bufferMinutes?: number | null };
  service: { id: string; durationMinutes: number };
  staff: { id: string; daysOff: Date[] } | null;
  dateStr: string;
  // Edit/reschedule self-exclusion: omit this appointment's own row from the
  // overlap set so a booking never conflicts with itself.
  ignoreAppointmentId?: string;
}): Promise<DayContext> {
  const { business, service, staff, dateStr, ignoreAppointmentId } = params;
  const { year, month1, day } = parseDateStr(dateStr);
  const dayOfWeek = tashkentDayOfWeek(year, month1, day);
  const dayStartUtcMs = tashkentMidnightUtcMs(year, month1, day);
  const bufferMs = (business.bufferMinutes ?? 0) * 60_000;
  const durationMin = service.durationMinutes;

  const rawWindows = resolveDayWindows(business.workingHours, dayOfWeek);
  const windows = (rawWindows ?? [])
    .map((w) => ({ startMin: minutesFromTime(w.start), endMin: minutesFromTime(w.end) }))
    .filter((w) => w.endMin > w.startMin)
    .sort((a, b) => a.startMin - b.startMin);

  // NOTE: we intentionally do NOT early-return when there are no working
  // windows. Owners may place appointments outside working hours, so overlap
  // detection must still run on a "closed" day. `closed` is reported below
  // (windows.length === 0); the slot-LISTING path (computeAvailableSlots) is
  // the one that bails on a closed day, not this loader.

  // Resolve the set of staff who can perform this service.
  let qualifiedStaff: { id: string; daysOff: Date[] }[];
  if (staff) {
    qualifiedStaff = [staff];
  } else {
    const links = await prisma.staffService.findMany({
      where: { serviceId: service.id, staff: { businessId: business.id, deletedAt: null } },
      select: { staff: { select: { id: true, daysOff: true } } },
    });
    qualifiedStaff = links.map((l) => l.staff);
  }
  const implicitResource = qualifiedStaff.length === 0;

  // Day-off set (Tashkent calendar comparison).
  const staffOffToday = new Set(
    qualifiedStaff
      .filter((s) => (s.daysOff ?? []).some((d) => tashkentDateStr(new Date(d)) === dateStr))
      .map((s) => s.id),
  );

  // Fetch appointments and blocked slots that could influence ANY slot in the
  // day window (widened by the buffer on both sides).
  const fetchStart = new Date(dayStartUtcMs - bufferMs);
  const fetchEnd = new Date(dayStartUtcMs + 24 * 60 * 60_000 + bufferMs);

  const [apptRows, blockRows] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        businessId: business.id,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        startTime: { lt: fetchEnd },
        endTime: { gt: fetchStart },
        ...(ignoreAppointmentId ? { id: { not: ignoreAppointmentId } } : {}),
      },
      select: { startTime: true, endTime: true, staffId: true },
    }),
    prisma.blockedSlot.findMany({
      where: {
        businessId: business.id,
        startTime: { lt: fetchEnd },
        endTime: { gt: fetchStart },
      },
      select: { startTime: true, endTime: true, staffId: true },
    }),
  ]);

  return {
    closed: windows.length === 0,
    windows,
    dayStartUtcMs,
    durationMin,
    bufferMs,
    appointments: apptRows.map((a) => ({
      start: a.startTime.getTime(),
      end: a.endTime.getTime(),
      staffId: a.staffId,
    })),
    blocks: blockRows.map((b) => ({
      start: b.startTime.getTime(),
      end: b.endTime.getTime(),
      staffId: b.staffId,
    })),
    qualifiedStaffIds: qualifiedStaff.map((s) => s.id),
    staffOffToday,
    implicitResource,
  };
}

/**
 * Is the interval [startMs, endMs) bookable given the day context?
 *  - Business-wide blocks (staffId null) remove the slot for everyone.
 *  - Implicit single-resource business: de-conflict against ALL appointments
 *    (with buffer).
 *  - Otherwise the slot is available iff AT LEAST ONE qualified staff is free:
 *    not on a day off, not covered by a per-staff block, and with no buffered
 *    overlap against an appointment assigned to them.
 */
function isIntervalFree(ctx: DayContext, startMs: number, endMs: number): boolean {
  // Business-wide blocks affect everyone.
  for (const b of ctx.blocks) {
    if (b.staffId === null && overlaps(startMs, endMs, b.start, b.end)) return false;
  }

  if (ctx.implicitResource) {
    for (const a of ctx.appointments) {
      if (overlaps(startMs, endMs, a.start - ctx.bufferMs, a.end + ctx.bufferMs)) return false;
    }
    return true;
  }

  for (const staffId of ctx.qualifiedStaffIds) {
    if (ctx.staffOffToday.has(staffId)) continue;

    const blockedForStaff = ctx.blocks.some(
      (b) => b.staffId === staffId && overlaps(startMs, endMs, b.start, b.end),
    );
    if (blockedForStaff) continue;

    const apptConflict = ctx.appointments.some(
      (a) =>
        a.staffId === staffId &&
        overlaps(startMs, endMs, a.start - ctx.bufferMs, a.end + ctx.bufferMs),
    );
    if (apptConflict) continue;

    return true; // this staff member is free
  }

  return false;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Compute bookable time slots for a service on a Tashkent calendar date.
 * Response shape is unchanged from the previous implementation.
 */
export async function computeAvailableSlots(params: {
  business: { id: string; workingHours: unknown; bufferMinutes?: number | null };
  service: { id: string; durationMinutes: number };
  staff: { id: string; workingHours?: unknown; daysOff: Date[] } | null;
  dateStr: string; // YYYY-MM-DD (Tashkent calendar date)
}): Promise<TimeSlot[]> {
  const ctx = await loadDayContext(params);
  if (ctx.closed) return [];

  const now = Date.now();
  const slots: TimeSlot[] = [];

  // Generate slots WITHIN each open interval, so the gaps between intervals
  // (breaks / lunch) yield no bookable slots.
  for (const w of ctx.windows) {
    for (let cursor = w.startMin; cursor + ctx.durationMin <= w.endMin; cursor += 30) {
      const endMin = cursor + ctx.durationMin;
      const startMs = ctx.dayStartUtcMs + cursor * 60_000;
      const endMs = ctx.dayStartUtcMs + endMin * 60_000;

      if (startMs <= now) continue; // no slots in the past
      if (!isIntervalFree(ctx, startMs, endMs)) continue;

      slots.push({
        startTime: new Date(startMs).toISOString(),
        endTime: new Date(endMs).toISOString(),
        startLabel: minutesToLabel(cursor),
        endLabel: minutesToLabel(endMin),
      });
    }
  }

  return slots;
}

// Why a requested slot was rejected. CONFLICT = overlaps an existing booking
// (or block / buffer); PAST = before now; OUT_OF_HOURS = outside working hours
// (incl. a fully-closed day).
export type SlotRejectReason = 'PAST' | 'OUT_OF_HOURS' | 'CONFLICT';

export interface SlotCheckResult {
  ok: boolean;
  reason?: SlotRejectReason;
}

/**
 * Write-time guard: re-runs the engine for the exact requested interval and
 * reports WHY it is not bookable (so callers can treat the reasons differently).
 *
 * Overlap (CONFLICT) is evaluated FIRST and independently of timing, so the
 * owner path can warn specifically on double-booking even when the slot is also
 * in the past or outside working hours. Callers decide policy:
 *   - Bot booking (strict): reject on ANY `!ok`.
 *   - Owner create/edit: ignore PAST and OUT_OF_HOURS; only CONFLICT warns,
 *     and even that is overridable.
 *
 * `ignoreAppointmentId` excludes an appointment's own row from the overlap set
 * (edit/reschedule self-exclusion).
 */
export async function isSlotBookable(params: {
  business: { id: string; workingHours: unknown; bufferMinutes?: number | null };
  service: { id: string; durationMinutes: number };
  staff: { id: string; daysOff: Date[] } | null;
  startTime: Date;
  ignoreAppointmentId?: string;
}): Promise<SlotCheckResult> {
  const { business, service, staff, startTime, ignoreAppointmentId } = params;
  const startMs = startTime.getTime();
  const endMs = startMs + service.durationMinutes * 60_000;

  const dateStr = tashkentDateStr(startTime);
  const ctx = await loadDayContext({ business, service, staff, dateStr, ignoreAppointmentId });

  // 1) Overlap — the only guardrail the owner path cares about.
  if (!isIntervalFree(ctx, startMs, endMs)) return { ok: false, reason: 'CONFLICT' };

  // 2) Past.
  if (startMs <= Date.now()) return { ok: false, reason: 'PAST' };

  // 3) Working hours — closed day, or interval not fully inside one open window.
  if (ctx.closed) return { ok: false, reason: 'OUT_OF_HOURS' };
  const startMin = Math.round((startMs - ctx.dayStartUtcMs) / 60_000);
  const endMin = startMin + service.durationMinutes;
  const withinWindow = ctx.windows.some(
    (w) => startMin >= w.startMin && endMin <= w.endMin,
  );
  if (!withinWindow) return { ok: false, reason: 'OUT_OF_HOURS' };

  return { ok: true };
}
