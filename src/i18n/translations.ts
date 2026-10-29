/**
 * Bilingual translations for gupaicon (Thai & English)
 * Single dictionary file with th and en objects.
 */

export type Language = 'th' | 'en';

export interface TranslationDictionary {
  app: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    venuesCount: (count: number) => string;
    eventsCount: (count: number) => string;
    admin: string;
    mapLegend: {
      available: string;
      low: string;
      soldOut: string;
      noEvents: string;
    };
  };
  filters: {
    all: string;
    today: string;
    thisWeek: string;
    thisMonth: string;
    ticketsOnly: string;
    noEventsFound: string;
  };
  status: {
    available: string;
    low: string;
    sold_out: string;
    not_open: string;
    cancelled: string;
  };
  venueSheet: {
    upcomingEvents: string;
    noUpcomingEvents: string;
    openInMaps: string;
    instagram: string;
    eventsAtVenue: (n: number) => string;
  };
  eventDetail: {
    artists: string;
    promoter: string;
    verifiedBadge: string;
    dateTime: string;
    price: string;
    genres: string;
    status: string;
    buyTickets: string;
    viewIgPost: string;
    close: string;
    backToVenue: string;
  };
  relativeTime: {
    justNow: string;
    minutesAgo: (m: number) => string;
    hoursAgo: (h: number) => string;
    daysAgo: (d: number) => string;
    monthsAgo: (mo: number) => string;
    prefix: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  th: {
    app: {
      title: 'gupaicon',
      subtitle: 'แผนที่คอนเสิร์ตอินดี้ กรุงเทพฯ & รังสิต',
      searchPlaceholder: 'ค้นหาร้านหรือคอนเสิร์ต...',
      venuesCount: (n) => `${n} ร้าน`,
      eventsCount: (n) => `${n} คอนเสิร์ต`,
      admin: 'ผู้ดูแลระบบ',
      mapLegend: {
        available: 'ยังมีบัตร',
        low: 'เหลือน้อย',
        soldOut: 'บัตรหมด',
        noEvents: 'ไม่มีคอนเสิร์ต / ยังไม่เปิด',
      },
    },
    filters: {
      all: 'ทั้งหมด',
      today: 'วันนี้',
      thisWeek: 'สัปดาห์นี้',
      thisMonth: 'เดือนนี้',
      ticketsOnly: 'เฉพาะที่มีบัตร',
      noEventsFound: 'ไม่พบคอนเสิร์ตที่ตรงกับเงื่อนไข',
    },
    status: {
      available: 'ยังมีบัตร',
      low: 'เหลือน้อย',
      sold_out: 'บัตรหมด',
      not_open: 'ยังไม่เปิดขาย',
      cancelled: 'ยกเลิก',
    },
    venueSheet: {
      upcomingEvents: 'คอนเสิร์ตที่กำลังจะมาถึง',
      noUpcomingEvents: 'ไม่มีคอนเสิร์ตที่กำลังจะมาถึงในช่วงนี้',
      openInMaps: 'เปิดใน Maps',
      instagram: 'Instagram',
      eventsAtVenue: (n) => `${n} คอนเสิร์ต`,
    },
    eventDetail: {
      artists: 'ศิลปิน / วง',
      promoter: 'ผู้จัดงาน',
      verifiedBadge: 'ผู้จัดได้รับการยืนยัน',
      dateTime: 'วันและเวลา',
      price: 'ราคาบัตร',
      genres: 'แนวเพลง',
      status: 'สถานะบัตร',
      buyTickets: 'ซื้อบัตร',
      viewIgPost: 'ดูโพสต์ IG',
      close: 'ปิด',
      backToVenue: 'กลับหน้าร้าน',
    },
    relativeTime: {
      justNow: 'เมื่อสักครู่',
      minutesAgo: (m) => `${m} นาทีที่แล้ว`,
      hoursAgo: (h) => `${h} ชั่วโมงที่แล้ว`,
      daysAgo: (d) => `${d} วันที่แล้ว`,
      monthsAgo: (mo) => `${mo} เดือนที่แล้ว`,
      prefix: 'อัปเดตเมื่อ',
    },
  },
  en: {
    app: {
      title: 'gupaicon',
      subtitle: 'Bangkok & Rangsit Livehouse Map',
      searchPlaceholder: 'Search venue or event...',
      venuesCount: (n) => `${n} venues`,
      eventsCount: (n) => `${n} events`,
      admin: 'Admin',
      mapLegend: {
        available: 'Available',
        low: 'Low',
        soldOut: 'Sold out',
        noEvents: 'No events / Not open',
      },
    },
    filters: {
      all: 'All',
      today: 'Today',
      thisWeek: 'This week',
      thisMonth: 'This month',
      ticketsOnly: 'Tickets available only',
      noEventsFound: 'No events found matching current filter',
    },
    status: {
      available: 'Available',
      low: 'Low',
      sold_out: 'Sold out',
      not_open: 'Not open',
      cancelled: 'Cancelled',
    },
    venueSheet: {
      upcomingEvents: 'Upcoming Events',
      noUpcomingEvents: 'No upcoming concerts scheduled',
      openInMaps: 'Open in Maps',
      instagram: 'Instagram',
      eventsAtVenue: (n) => `${n} event${n === 1 ? '' : 's'}`,
    },
    eventDetail: {
      artists: 'Artists / Lineup',
      promoter: 'Promoter',
      verifiedBadge: 'Verified Promoter',
      dateTime: 'Date & Time',
      price: 'Tickets / Entry',
      genres: 'Genres',
      status: 'Ticket Status',
      buyTickets: 'Buy tickets',
      viewIgPost: 'View IG post',
      close: 'Close',
      backToVenue: 'Back to venue',
    },
    relativeTime: {
      justNow: 'just now',
      minutesAgo: (m) => `${m}m ago`,
      hoursAgo: (h) => `${h}h ago`,
      daysAgo: (d) => `${d}d ago`,
      monthsAgo: (mo) => `${mo}mo ago`,
      prefix: 'updated',
    },
  },
};

const STORAGE_KEY = 'gupaicon_lang';

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'th' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('th')) {
      return 'th';
    }
  } catch {
    // fallback
  }
  return 'en';
}

export function saveLanguagePreference(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}
