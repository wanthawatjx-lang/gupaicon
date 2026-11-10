/**
 * Calendar Utilities for gupaicon (RFC 5545 iCalendar & Google Calendar Template URL)
 * Pure helper module with unit-test-style examples.
 */

import { parseTimestampToDate } from './dateUtils';

export interface CalendarEventInput {
  id: string;
  title: string;
  artists?: string[];
  startAt: string | number | { seconds: number; nanoseconds: number };
  priceText?: string;
  ticketUrl?: string;
}

export interface CalendarVenueInput {
  name: string;
  address?: string;
}

/**
 * Format a Date object into UTC iCalendar timestamp: YYYYMMDDTHHMMSSZ
 *
 * Example:
 * formatUtcTimestamp(new Date('2026-11-20T13:00:00Z')) => '20261120T130000Z'
 */
export function formatUtcTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hours = pad(date.getUTCHours());
  const minutes = pad(date.getUTCMinutes());
  const seconds = pad(date.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text characters per RFC 5545 Section 3.3.11:
 * Backslash, semicolon, comma, and newlines must be escaped.
 *
 * Example:
 * escapeIcsText("Hello, world; next\\line\nSecond line")
 * => "Hello\\, world\\; next\\\\line\\nSecond line"
 */
export function escapeIcsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n|\r/g, '\\n');
}

/**
 * Fold lines longer than 75 octets (UTF-8 bytes) per RFC 5545 Section 3.1.
 * A folded line is indicated by CRLF followed immediately by a space (1 octet).
 *
 * Example:
 * foldLine("SUMMARY:Short title") => "SUMMARY:Short title"
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);
  if (bytes.length <= 75) {
    return line;
  }

  const chunks: string[] = [];
  let currentChunk = '';
  let currentBytes = 0;
  let maxBytes = 75; // First line can have up to 75 bytes

  for (const ch of Array.from(line)) {
    const chBytes = encoder.encode(ch).length;
    if (currentBytes + chBytes > maxBytes) {
      chunks.push(currentChunk);
      currentChunk = ch;
      currentBytes = chBytes;
      maxBytes = 74; // Subsequent lines start with a single space (1 byte)
    } else {
      currentChunk += ch;
      currentBytes += chBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.join('\r\n ');
}

/**
 * Generate .ics file slug and filename: gupaicon-{slug}.ics
 * Slug is title lowercased and reduced to a-z, 0-9 and dashes (max 40 chars, fallback "event").
 *
 * Example:
 * buildIcsFileName("Dept Live at De Commune!") => "gupaicon-dept-live-at-de-commune.ics"
 * buildIcsFileName("คอนเสิร์ตอินดี้") => "gupaicon-event.ics"
 */
export function buildIcsFileName(title: string): string {
  const slug = (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'event';
  return `gupaicon-${slug}.ics`;
}

/**
 * Build RFC 5545 compliant iCalendar (.ics) string.
 *
 * Rules:
 * - CRLF line endings (\r\n)
 * - Fold lines longer than 75 octets
 * - PRODID: -//gupaicon//TH
 * - VERSION: 2.0
 * - CALSCALE: GREGORIAN
 * - METHOD: PUBLISH
 * - One VEVENT with UID "{eventId}@gupaicon"
 * - DTSTAMP: now (UTC)
 * - DTSTART: startAt in UTC format
 * - DTEND: startAt + 3 hours in UTC format
 * - SUMMARY: Event title
 * - LOCATION: "venue name, address"
 * - DESCRIPTION: artists, price, ticket URL, "End time is approximate", "Ticket status may have changed, check the official ticket page"
 * - URL: ticketUrl when present
 * - VALARM: 1 day before reminder (TRIGGER:-P1D, ACTION:DISPLAY)
 *
 * Example Unit Test / Specification:
 * ```ts
 * const sampleEvent: CalendarEventInput = {
 *   id: 'evt_101',
 *   title: 'Indie Night #4',
 *   artists: ['Dept', 'Television off'],
 *   startAt: '2026-11-20T20:00:00+07:00', // UTC 2026-11-20T13:00:00Z
 *   priceText: '350 THB',
 *   ticketUrl: 'https://ticketmelon.com/sample',
 * };
 * const sampleVenue: CalendarVenueInput = {
 *   name: 'De Commune',
 *   address: '1st Floor, Liberty Plaza, Thonglor, Bangkok',
 * };
 *
 * const ics = buildIcs(sampleEvent, sampleVenue);
 * // Contains:
 * // BEGIN:VCALENDAR\r\n
 * // VERSION:2.0\r\n
 * // PRODID:-//gupaicon//TH\r\n
 * // CALSCALE:GREGORIAN\r\n
 * // METHOD:PUBLISH\r\n
 * // BEGIN:VEVENT\r\n
 * // UID:evt_101@gupaicon\r\n
 * // DTSTART:20261120T130000Z\r\n
 * // DTEND:20261120T160000Z\r\n
 * // SUMMARY:Indie Night #4\r\n
 * // LOCATION:De Commune\\, 1st Floor\\, Liberty Plaza\\, Thonglor\\, Bangkok\r\n
 * // DESCRIPTION:Artists: Dept\\, Television off\\nPrice: 350 THB\\nTickets: https://ticketmelon.com/sample\\nEnd time is approximate.\\nTicket status may have changed\\, check the official ticket page.\r\n
 * // URL:https://ticketmelon.com/sample\r\n
 * // BEGIN:VALARM\r\n
 * // ACTION:DISPLAY\r\n
 * // DESCRIPTION:Reminder\r\n
 * // TRIGGER:-P1D\r\n
 * // END:VALARM\r\n
 * // END:VEVENT\r\n
 * // END:VCALENDAR\r\n
 * ```
 */
export function buildIcs(
  event: CalendarEventInput,
  venue?: CalendarVenueInput | null
): string {
  const startDate = parseTimestampToDate(event.startAt);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // start + 3 hours
  const now = new Date();

  const dtstamp = formatUtcTimestamp(now);
  const dtstart = formatUtcTimestamp(startDate);
  const dtend = formatUtcTimestamp(endDate);

  const uid = `${event.id || 'event'}@gupaicon`;
  const summary = escapeIcsText(event.title || 'Live Concert');

  // Location: "venue name, address" or just venue name
  let locationStr = '';
  if (venue?.name) {
    locationStr = venue.address ? `${venue.name}, ${venue.address}` : venue.name;
  }
  const escapedLocation = escapeIcsText(locationStr);

  // Description: artists, price, ticket URL, "End time is approximate", "Ticket status may have changed, check the official ticket page"
  const descParts: string[] = [];
  if (event.artists && event.artists.length > 0) {
    descParts.push(`Artists: ${event.artists.join(', ')}`);
  }
  if (event.priceText) {
    descParts.push(`Price: ${event.priceText}`);
  }
  if (event.ticketUrl) {
    descParts.push(`Tickets: ${event.ticketUrl}`);
  }
  descParts.push('End time is approximate.');
  descParts.push('Ticket status may have changed, check the official ticket page.');
  const escapedDescription = escapeIcsText(descParts.join('\n'));

  // Assemble un-folded lines
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gupaicon//TH',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
  ];

  if (escapedLocation) {
    lines.push(`LOCATION:${escapedLocation}`);
  }

  lines.push(`DESCRIPTION:${escapedDescription}`);

  if (event.ticketUrl) {
    lines.push(`URL:${event.ticketUrl.trim()}`);
  }

  // Reminder alarm 1 day before
  lines.push('BEGIN:VALARM');
  lines.push('ACTION:DISPLAY');
  lines.push('DESCRIPTION:Reminder');
  lines.push('TRIGGER:-P1D');
  lines.push('END:VALARM');

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  // Fold long lines and join with CRLF per RFC 5545
  return lines.map((l) => foldLine(l)).join('\r\n') + '\r\n';
}

/**
 * Build Google Calendar template URL (action=TEMPLATE with text, dates, location, details).
 *
 * Example Unit Test / Specification:
 * ```ts
 * const sampleEvent: CalendarEventInput = {
 *   id: 'evt_101',
 *   title: 'Indie Night #4',
 *   artists: ['Dept'],
 *   startAt: '2026-11-20T20:00:00+07:00', // UTC 20261120T130000Z
 *   priceText: '350 THB',
 *   ticketUrl: 'https://ticketmelon.com/sample',
 * };
 * const sampleVenue: CalendarVenueInput = {
 *   name: 'De Commune',
 *   address: 'Bangkok',
 * };
 *
 * const url = buildGoogleCalendarUrl(sampleEvent, sampleVenue);
 * // Returns:
 * // "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Indie%20Night%20%234&dates=20261120T130000Z%2F20261120T160000Z&details=...&location=De%20Commune%2C%20Bangkok"
 * ```
 */
export function buildGoogleCalendarUrl(
  event: CalendarEventInput,
  venue?: CalendarVenueInput | null
): string {
  const startDate = parseTimestampToDate(event.startAt);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // start + 3 hours

  const dtstart = formatUtcTimestamp(startDate);
  const dtend = formatUtcTimestamp(endDate);

  const title = event.title || 'Live Concert';

  let locationStr = '';
  if (venue?.name) {
    locationStr = venue.address ? `${venue.name}, ${venue.address}` : venue.name;
  }

  const detailsParts: string[] = [];
  if (event.artists && event.artists.length > 0) {
    detailsParts.push(`Artists: ${event.artists.join(', ')}`);
  }
  if (event.priceText) {
    detailsParts.push(`Price: ${event.priceText}`);
  }
  if (event.ticketUrl) {
    detailsParts.push(`Tickets: ${event.ticketUrl}`);
  }
  detailsParts.push('End time is approximate.');
  detailsParts.push('Ticket status may have changed, check the official ticket page.');
  const details = detailsParts.join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${dtstart}/${dtend}`,
    details: details,
    location: locationStr,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Triggers in-browser download of an .ics file via Blob and temporary Object URL.
 * Returns the object URL and a cleanup function to revoke it after use.
 */
export function triggerIcsDownload(
  filename: string,
  content: string
): { url: string; revoke: () => void } {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('Programmatic download click failed, user can use fallback link:', err);
  }

  const revoke = () => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return { url, revoke };
}
