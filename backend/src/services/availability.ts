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
type WorkingHours = Record<string, WorkingDay | null>;

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

/**
 * Resolve the working window for a given day.
 *  - workingHours entirely UNSET (no object)        → default 09:00–18:00.
 *  - configured object, this day === null           → CLOSED (returns null).
 *  - configured object, this day missing            → CLOSED (returns null).
 *  - configured object, this day has { start,end }  → that window.
 */
function resolveDayWindow(rawHours: unknown, dayOfWeek: number): WorkingDay | null {
  if (rawHours == null || typeof rawHours !== 'object') {
    return DEFAULT_DAY; // never configured
  }
  const hours = rawHours as WorkingHours;
  const key = String(dayOfWeek);
  if (!(key in hours)) return null; // configured but day absent → closed
  return hours[key]; // may be null (explicitly closed) or a window
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

// ─── Day context ─────────────────────────────────────────────────────────────
// Everything the per-interval availability test needs for a single Tashkent day.
interface DayContext {
  closed: boolean;
  dayStartMin: number; // Tashkent minute-of-day the window opens
  dayEndMin: number; // Tashkent minute-of-day the window closes
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
}): Promise<DayContext> {
  const { business, service, staff, dateStr } = params;
  const { year, month1, day } = parseDateStr(dateStr);
  const dayOfWeek = tashkentDayOfWeek(year, month1, day);
  const dayStartUtcMs = tashkentMidnightUtcMs(year, month1, day);
  const bufferMs = (business.bufferMinutes ?? 0) * 60_000;
  const durationMin = service.durationMinutes;

  const window = resolveDayWindow(business.workingHours, dayOfWeek);
  if (!window) {
    return {
      closed: true,
      dayStartMin: 0,
      dayEndMin: 0,
      dayStartUtcMs,
      durationMin,
      bufferMs,
      appointments: [],
      blocks: [],
      qualifiedStaffIds: [],
      staffOffToday: new Set(),
      implicitResource: true,
    };
  }

  const dayStartMin = minutesFromTime(window.start);
  const dayEndMin = minutesFromTime(window.end);

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
    closed: false,
    dayStartMin,
    dayEndMin,
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
  if (ctx.dayEndMin - ctx.dayStartMin < ctx.durationMin) return [];

  const now = Date.now();
  const slots: TimeSlot[] = [];

  for (let cursor = ctx.dayStartMin; cursor + ctx.durationMin <= ctx.dayEndMin; cursor += 30) {
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

  return slots;
}

/**
 * Write-time guard: is a specific requested appointment start still bookable?
 * Re-runs the same engine logic (working hours, day off, blocked time, buffer,
 * appointment overlap) for the exact requested interval. Used by both the
 * owner-facing and bot appointment-create endpoints to close the double-booking
 * TOCTOU gap.
 */
export async function isSlotBookable(params: {
  business: { id: string; workingHours: unknown; bufferMinutes?: number | null };
  service: { id: string; durationMinutes: number };
  staff: { id: string; daysOff: Date[] } | null;
  startTime: Date;
}): Promise<boolean> {
  const { business, service, staff, startTime } = params;
  const startMs = startTime.getTime();
  const endMs = startMs + service.durationMinutes * 60_000;

  if (startMs <= Date.now()) return false; // cannot book the past

  const dateStr = tashkentDateStr(startTime);
  const ctx = await loadDayContext({ business, service, staff, dateStr });
  if (ctx.closed) return false;

  // Requested interval must fall entirely within the working-hours window.
  const startMin = Math.round((startMs - ctx.dayStartUtcMs) / 60_000);
  const endMin = startMin + service.durationMinutes;
  if (startMin < ctx.dayStartMin || endMin > ctx.dayEndMin) return false;

  return isIntervalFree(ctx, startMs, endMs);
}
