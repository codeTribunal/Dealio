import { prisma } from '../lib/prisma.js';

interface WorkingDay {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
}

type WorkingHours = Record<string, WorkingDay | null>;

export interface TimeSlot {
  startTime: string; // ISO datetime
  endTime: string;   // ISO datetime
  startLabel: string; // "HH:MM"
  endLabel: string;   // "HH:MM"
}

function parseWorkingHours(raw: unknown): WorkingHours | null {
  if (!raw || typeof raw !== 'object') return null;
  return raw as WorkingHours;
}

function minutesFromTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}


export async function computeAvailableSlots(params: {
  business: { id: string; workingHours: unknown };
  service: { durationMinutes: number };
  staff: { id: string; workingHours: unknown; daysOff: Date[] } | null;
  dateStr: string; // YYYY-MM-DD
}): Promise<TimeSlot[]> {
  const { business, service, staff, dateStr } = params;

  const date = new Date(dateStr + 'T00:00:00.000Z');
  const localDate = new Date(dateStr); // date-only parses as UTC midnight = correct calendar date
  const dayOfWeek = localDate.getDay().toString(); // "0"=Sun … "6"=Sat

  // Check staff day off
  if (staff?.daysOff) {
    const isDayOff = staff.daysOff.some((d) => {
      const off = new Date(d);
      return (
        off.getUTCFullYear() === localDate.getFullYear() &&
        off.getUTCMonth()    === localDate.getMonth()    &&
        off.getUTCDate()     === localDate.getDate()
      );
    });
    if (isDayOff) return [];
  }

  // Resolve working hours: staff-specific → business fallback
  const hoursSource = staff?.workingHours ?? business.workingHours;
  const workingHours = parseWorkingHours(hoursSource);

  // Default working day: 09:00–18:00 if no hours configured
  const dayHours: WorkingDay = workingHours?.[dayOfWeek] ?? { start: '09:00', end: '18:00' };
  if (!dayHours) return []; // null means closed that day

  const dayStartMin = minutesFromTime(dayHours.start);
  const dayEndMin = minutesFromTime(dayHours.end);
  const durationMin = service.durationMinutes;

  if (dayEndMin - dayStartMin < durationMin) return [];

  // Fetch existing appointments that overlap this UTC calendar day
  const dayStart = new Date(dateStr + 'T00:00:00.000Z');
  const dayEnd   = new Date(dateStr + 'T23:59:59.999Z');

  const existingWhere: Record<string, unknown> = {
    businessId: business.id,
    startTime: { gte: dayStart, lte: dayEnd },
    status: { notIn: ['CANCELLED', 'NO_SHOW'] },
    deletedAt: null,
  };
  if (staff) existingWhere.staffId = staff.id;

  const booked = await prisma.appointment.findMany({
    where: existingWhere,
    select: { startTime: true, endTime: true },
  });

  // Generate candidate slots
  const slots: TimeSlot[] = [];
  let cursor = dayStartMin;

  while (cursor + durationMin <= dayEndMin) {
    const slotStartH = Math.floor(cursor / 60);
    const slotStartM = cursor % 60;
    const slotEndCursor = cursor + durationMin;
    const slotEndH = Math.floor(slotEndCursor / 60);
    const slotEndM = slotEndCursor % 60;

    const slotStart = new Date(date);
    slotStart.setUTCHours(slotStartH, slotStartM, 0, 0);

    const slotEnd = new Date(date);
    slotEnd.setUTCHours(slotEndH, slotEndM, 0, 0);

    // Skip past slots
    if (slotStart > new Date()) {
      // Check overlap with booked appointments
      const overlaps = booked.some((appt) => {
        const aStart = new Date(appt.startTime).getTime();
        const aEnd = new Date(appt.endTime).getTime();
        return slotStart.getTime() < aEnd && slotEnd.getTime() > aStart;
      });

      if (!overlaps) {
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          startLabel: `${String(slotStartH).padStart(2, '0')}:${String(slotStartM).padStart(2, '0')}`,
          endLabel: `${String(slotEndH).padStart(2, '0')}:${String(slotEndM).padStart(2, '0')}`,
        });
      }
    }

    cursor += 30; // 30-minute slot increments
  }

  return slots;
}
