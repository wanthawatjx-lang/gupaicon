/**
 * Date and Time utilities for gupaicon
 * All livehouse concert dates formatted in Asia/Bangkok timezone (UTC+7)
 * Localized for Thai ('th') and English ('en')
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
 * Format event date & time in Asia/Bangkok
 * e.g. "ศุกร์ 14 มี.ค. 2025 · 20:00 น." (th) or "Fri 14 Mar 2025 · 20:00" (en)
 */
export function formatBangkokDateTime(val: any, lang: 'th' | 'en' = 'en'): string {
  const date = parseTimestampToDate(val);
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  try {
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      timeZone: 'Asia/Bangkok',
      weekday: lang === 'th' ? 'long' : 'short',
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
    const dateStr = dateFormatter.format(date);
    const timeStr = timeFormatter.format(date);
    return lang === 'th' ? `${dateStr} · ${timeStr} น.` : `${dateStr} · ${timeStr}`;
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format event date only in Asia/Bangkok
 * e.g. "ศุกร์ 14 มี.ค." (th) or "Fri 14 Mar" (en)
 */
export function formatBangkokDateOnly(val: any, lang: 'th' | 'en' = 'en'): string {
  const date = parseTimestampToDate(val);
  const locale = lang === 'th' ? 'th-TH' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, {
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
 * e.g. "20:00 น." or "20:00"
 */
export function formatBangkokTimeOnly(val: any, lang: 'th' | 'en' = 'en'): string {
  const date = parseTimestampToDate(val);
  try {
    const timeStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return lang === 'th' ? `${timeStr} น.` : timeStr;
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Relative time from now with bilingual support
 * e.g. "updated 12 min ago" (en) or "อัปเดตล่าสุด 12 นาทีที่แล้ว" (th)
 */
export function formatRelativeTime(val: any, lang: 'th' | 'en' = 'en'): string {
  const date = parseTimestampToDate(val);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (lang === 'th') {
    if (diffSec < 45) return 'อัปเดตล่าสุด เมื่อสักครู่';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `อัปเดตล่าสุด ${diffMin} นาทีที่แล้ว`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `อัปเดตล่าสุด ${diffHours} ชั่วโมงที่แล้ว`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `อัปเดตล่าสุด ${diffDays} วันที่แล้ว`;
    return `อัปเดตล่าสุด ${Math.floor(diffDays / 30)} เดือนที่แล้ว`;
  }

  // English fallback
  if (diffSec < 45) return 'updated just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `updated ${diffMin} min ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `updated ${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `updated ${diffDays} days ago`;
  return `updated ${Math.floor(diffDays / 30)} months ago`;
}

/**
 * Checks if a date is today in Asia/Bangkok
 */
export function isDateToday(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  };
  return (
    new Intl.DateTimeFormat('en-US', options).format(date) ===
    new Intl.DateTimeFormat('en-US', options).format(now)
  );
}

/**
 * Checks if a date is within this week (starting Monday to Sunday) in Asia/Bangkok
 */
export function isDateThisWeek(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();

  // Convert to Bangkok day boundaries
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const dayOfWeek = (startOfDay.getDay() + 6) % 7; // Monday = 0
  const startOfWeek = new Date(startOfDay.getTime() - dayOfWeek * 86400000);
  const endOfWeek = new Date(startOfWeek.getTime() + 7 * 86400000 - 1);

  return date.getTime() >= startOfWeek.getTime() && date.getTime() <= endOfWeek.getTime();
}

/**
 * Checks if a date is within this month in Asia/Bangkok
 */
export function isDateThisMonth(val: any): boolean {
  const date = parseTimestampToDate(val);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

/**
 * Checks if an event is upcoming (startAt is after current time, or within 4 hours past start)
 */
export function isEventUpcoming(val: any): boolean {
  const date = parseTimestampToDate(val);
  // Allow shows up to 4 hours after start time before hiding as past
  const threshold = Date.now() - 4 * 3600 * 1000;
  return date.getTime() >= threshold;
}

/**
 * Format a Date object into YYYY-MM-DDTHH:mm string for datetime-local inputs
 */
export function formatDateForInput(date: Date): string {
  const localIso = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
  return localIso;
}
