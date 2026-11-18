/**
 * Date and Time utilities for gupaicon
 * All livehouse concert dates formatted in Asia/Bangkok timezone (UTC+7)
 * Localized for Thai ('th') and English ('en')
 */

/**
 * Parse a Date, number, Firestore Timestamp, or ISO 8601 string strictly.
 * - Strings with explicit offset (Z, +HH:MM, -HH:MM, etc.) are parsed with that offset.
 * - Strings without offset (YYYY-MM-DD, YYYY-MM-DD HH:mm(:ss), YYYY-MM-DDTHH:mm(:ss)) are treated as Asia/Bangkok (+07:00).
 * - Invalid calendar dates (e.g. Feb 31) and unparseable values return null (never current time).
 */
export function parseStrictBangkokDate(val: any): Date | null {
  if (val === null || val === undefined || val === '') return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d : null;
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      const ms = val.seconds * 1000 + (Number(val.nanoseconds) || 0) / 1000000;
      const d = new Date(ms);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  }
  if (typeof val !== 'string') return null;

  const s = val.trim();
  if (!s) return null;

  // Date-only: YYYY-MM-DD -> 20:00:00+07:00
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const check = new Date(Date.UTC(year, month - 1, day));
    if (
      check.getUTCFullYear() !== year ||
      check.getUTCMonth() !== month - 1 ||
      check.getUTCDate() !== day
    ) {
      return null;
    }
    const d = new Date(`${s}T20:00:00+07:00`);
    return isNaN(d.getTime()) ? null : d;
  }

  // Date-time with optional seconds, fractional seconds, and optional offset
  const dtMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i.exec(
    s
  );
  if (!dtMatch) return null;

  const year = Number(dtMatch[1]);
  const month = Number(dtMatch[2]);
  const day = Number(dtMatch[3]);
  const hour = Number(dtMatch[4]);
  const minute = Number(dtMatch[5]);
  const second = dtMatch[6] !== undefined ? Number(dtMatch[6]) : 0;
  const frac = dtMatch[7] || '';
  const rawOffset = dtMatch[8];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const calCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calCheck.getUTCFullYear() !== year ||
    calCheck.getUTCMonth() !== month - 1 ||
    calCheck.getUTCDate() !== day
  ) {
    return null;
  }

  let normalizedOffset = '+07:00';
  if (rawOffset) {
    if (rawOffset.toUpperCase() === 'Z') {
      normalizedOffset = 'Z';
    } else {
      const sign = rawOffset[0];
      const digits = rawOffset.slice(1).replace(':', '');
      const offHour = Number(digits.slice(0, 2));
      const offMin = digits.length >= 4 ? Number(digits.slice(2, 4)) : 0;
      if (offHour > 23 || offMin > 59) return null;
      normalizedOffset = `${sign}${String(offHour).padStart(2, '0')}:${String(offMin).padStart(2, '0')}`;
    }
  }

  const isoStr = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T${dtMatch[4]}:${dtMatch[5]}:${String(second).padStart(2, '0')}${frac}${normalizedOffset}`;
  const parsed = new Date(isoStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatIsoInBangkok(date: Date): string {
  const bkkMs = date.getTime() + 7 * 60 * 60 * 1000;
  return new Date(bkkMs).toISOString().slice(0, 19) + '+07:00';
}

export function parseTimestampToDate(val: any): Date {
  const strict = parseStrictBangkokDate(val);
  if (strict) return strict;
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Format event date & time in Asia/Bangkok
 * e.g. "ศุกร์ 14 มี.ค. 2025 · 20:00 น." (th) or "Fri 14 Mar 2025 · 20:00" (en)
 */
export function formatBangkokDateTime(val: any, lang: 'th' | 'en' = 'en'): string {
  const date = parseStrictBangkokDate(val);
  if (!date) {
    return lang === 'th' ? 'วันที่ไม่ถูกต้อง' : 'Invalid date';
  }
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
  const date = parseStrictBangkokDate(val);
  if (!date) return false;
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
