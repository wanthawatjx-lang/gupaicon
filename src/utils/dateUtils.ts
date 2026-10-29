/**
 * Date and Time utilities for gupaicon
 * All livehouse concert dates formatted in Asia/Bangkok timezone
 */

export function parseTimestampToDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const parsed = new Date(val);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }
  if (typeof val === 'object' && 'seconds' in val) {
    return new Date(val.seconds * 1000 + (val.nanoseconds || 0) / 1000000);
  }
  return new Date();
}

/**
 * Format event date in Asia/Bangkok time
 * e.g. "Fri, 30 Oct 2026 • 19:30"
 */
export function formatBangkokDateTime(val: any): string {
  const date = parseTimestampToDate(val);
  try {
    const dateFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${dateFormatter.format(date)} • ${timeFormatter.format(date)}`;
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format event date only in Asia/Bangkok
 * e.g. "Fri, 30 Oct"
 */
export function formatBangkokDateOnly(val: any): string {
  const date = parseTimestampToDate(val);
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/**
 * Format event time only in Asia/Bangkok
 * e.g. "19:30"
 */
export function formatBangkokTimeOnly(val: any): string {
  const date = parseTimestampToDate(val);
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Relative time from now (e.g. "updated 5m ago", "updated 2h ago", "updated just now")
 */
export function formatRelativeTime(val: any): string {
  const date = parseTimestampToDate(val);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 45) return 'updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `updated ${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `updated ${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `updated ${diffDays}d ago`;
  return `updated ${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Checks if a date is today in Asia/Bangkok
 */
export function isDateToday(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Bangkok', year: 'numeric', month: 'numeric', day: 'numeric' };
  return (
    new Intl.DateTimeFormat('en-US', options).format(date) ===
    new Intl.DateTimeFormat('en-US', options).format(now)
  );
}

/**
 * Checks if a date is within this week (starting Monday to Sunday)
 */
export function isDateThisWeek(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();
  
  // Bangkok time representation
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const dayOfWeek = (startOfDay.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(startOfDay.getTime() - dayOfWeek * 86400000);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000 - 1);

  return date.getTime() >= startOfWeek.getTime() && date.getTime() <= endOfWeek.getTime();
}

/**
 * Checks if a date is within this month
 */
export function isDateThisMonth(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/**
 * Checks if an event is upcoming (startAt is after current time, or within 4 hours past start to account for ongoing concert)
 */
export function isEventUpcoming(val: any): boolean {
  const date = parseTimestampToDate(val);
  // Allow shows up to 4 hours after start time before hiding as past
  const threshold = Date.now() - 4 * 3600 * 1000;
  return date.getTime() >= threshold;
}
