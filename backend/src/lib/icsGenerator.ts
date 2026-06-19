export interface CalendarEvent {
  uid: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  reminderMinutes?: number;
}

function formatICSDate(date: Date): string {
  // Format: YYYYMMDDTHHMMSSZ (UTC)
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

function escapeICSText(text: string): string {
  // ICS requires escaping commas, semicolons, backslashes, newlines
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function foldLine(line: string): string {
  // ICS lines must not exceed 75 octets; fold with CRLF + space
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let remaining = line;
  chunks.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    chunks.push(' ' + remaining.slice(0, 74));
    remaining = remaining.slice(74);
  }
  return chunks.join('\r\n');
}

export function generateICS(businessName: string, events: CalendarEvent[]): string {
  const lines: string[] = [];

  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push('PRODID:-//Dealio//Calendar//EN');
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(foldLine(`X-WR-CALNAME:${escapeICSText(businessName)} — Dealio`));
  lines.push('X-WR-TIMEZONE:Asia/Tashkent');

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`DTSTAMP:${formatICSDate(new Date())}`);
    lines.push(`DTSTART:${formatICSDate(event.start)}`);
    lines.push(`DTEND:${formatICSDate(event.end)}`);
    lines.push(foldLine(`SUMMARY:${escapeICSText(event.title)}`));
    if (event.description) {
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.description)}`));
    }

    // Reminder alarm
    if (event.reminderMinutes && event.reminderMinutes > 0) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(foldLine(`DESCRIPTION:${escapeICSText(event.title)}`));
      lines.push(`TRIGGER:-PT${event.reminderMinutes}M`);
      lines.push('END:VALARM');
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // ICS requires CRLF line endings
  return lines.join('\r\n');
}
