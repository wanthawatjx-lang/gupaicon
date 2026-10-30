/**
 * Bilingual translations for กูไกูปคอน (gupaicon)
 * Single dictionary file with th and en objects.
 * Default language is 'th'.
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
    mapView: string;
    listView: string;
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
    clearFilters: string;
    noEventsFound: string;
    noEventsInPeriod: string;
  };
  status: {
    available: string;
    low: string;
    soldout: string;
    notopen: string;
    cancelled: string;
    // aliases for backward compatibility
    sold_out: string;
    not_open: string;
  };
  statusSymbols: {
    available: string;
    low: string;
    soldout: string;
    notopen: string;
    cancelled: string;
  };
  venueSheet: {
    upcomingEvents: string;
    noUpcomingEventsHere: string;
    openInMaps: string;
    instagram: string;
    eventsAtVenue: (n: number) => string;
    dragToExpand: string;
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
    unconfirmedNotice: string;
    disclaimerText: string;
  };
  relativeTime: {
    justNow: string;
    minutesAgo: (m: number) => string;
    hoursAgo: (h: number) => string;
    daysAgo: (d: number) => string;
    monthsAgo: (mo: number) => string;
    prefix: string;
  };
  admin: {
    title: string;
    subtitle: string;
    loginRequired: string;
    loginWithGoogle: string;
    unauthorized: string;
    signOut: string;
    tabs: {
      events: string;
      venues: string;
      promoters: string;
    };
    seedSampleEvents: string;
    seedSuccess: string;
    quickStatus: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  th: {
    app: {
      title: 'gupaicon',
      subtitle: 'แผนที่คอนเสิร์ตอินดี้ กรุงเทพฯ & รังสิต',
      searchPlaceholder: 'ค้นหาร้านหรือคอนเสิร์ต...',
      venuesCount: (n) => `${n} ร้าน`,
      eventsCount: (n) => `${n} งาน`,
      admin: 'ผู้ดูแลระบบ',
      mapView: 'แผนที่',
      listView: 'รายการงาน',
      mapLegend: {
        available: '✓ ยังมีบัตร',
        low: '◐ เหลือน้อย',
        soldOut: '✕ บัตรหมด',
        noEvents: 'ไม่มีงาน / ยังไม่เปิดขาย',
      },
    },
    filters: {
      all: 'ทั้งหมด',
      today: 'วันนี้',
      thisWeek: 'สัปดาห์นี้',
      thisMonth: 'เดือนนี้',
      ticketsOnly: 'เฉพาะที่ยังมีบัตร',
      clearFilters: 'ล้างตัวกรอง',
      noEventsFound: 'ไม่พบคอนเสิร์ตที่ตรงกับเงื่อนไข',
      noEventsInPeriod: 'ยังไม่มีงานในช่วงนี้',
    },
    status: {
      available: 'ยังมีบัตร',
      low: 'เหลือน้อย',
      soldout: 'บัตรหมด',
      notopen: 'ยังไม่เปิดขาย',
      cancelled: 'ยกเลิก',
      sold_out: 'บัตรหมด',
      not_open: 'ยังไม่เปิดขาย',
    },
    statusSymbols: {
      available: '✓',
      low: '◐',
      soldout: '✕',
      notopen: '○',
      cancelled: '⊘',
    },
    venueSheet: {
      upcomingEvents: 'งานที่กำลังจะมาถึง',
      noUpcomingEventsHere: 'ยังไม่มีงานที่นี่',
      openInMaps: 'แผนที่',
      instagram: 'Instagram',
      eventsAtVenue: (n) => `${n} งาน`,
      dragToExpand: 'ลากเพื่อขยาย',
    },
    eventDetail: {
      artists: 'ศิลปิน',
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
      unconfirmedNotice: 'ยังไม่ยืนยัน',
      disclaimerText: 'สถานะบัตรมาจากผู้ใช้/แอดมิน อาจคลาดเคลื่อน เช็กกับหน้าขายบัตรอีกครั้ง',
    },
    relativeTime: {
      justNow: 'เมื่อสักครู่',
      minutesAgo: (m) => `อัปเดตล่าสุด ${m} นาทีที่แล้ว`,
      hoursAgo: (h) => `อัปเดตล่าสุด ${h} ชั่วโมงที่แล้ว`,
      daysAgo: (d) => `อัปเดตล่าสุด ${d} วันที่แล้ว`,
      monthsAgo: (mo) => `อัปเดตล่าสุด ${mo} เดือนที่แล้ว`,
      prefix: 'อัปเดตล่าสุด',
    },
    admin: {
      title: 'แอดมินคอนโซล',
      subtitle: 'จัดการร้าน ผู้จัด และคอนเสิร์ต (เฉพาะ wantawachjz@gmail.com)',
      loginRequired: 'กรุณาเข้าสู่ระบบด้วย Google',
      loginWithGoogle: 'เข้าสู่ระบบด้วย Google',
      unauthorized: 'ขออภัย เฉพาะ wantawachjz@gmail.com ที่ได้รับการยืนยันอีเมลแล้วเท่านั้นที่มีสิทธิ์เข้าถึง',
      signOut: 'ออกจากระบบ',
      tabs: {
        events: 'จัดการงาน (Events)',
        venues: 'จัดการร้าน (Venues)',
        promoters: 'จัดการผู้จัด (Promoters)',
      },
      seedSampleEvents: 'Seed ข้อมูลตัวอย่าง (SAMPLE)',
      seedSuccess: 'สร้างข้อมูลตัวอย่าง SAMPLE สำเร็จแล้ว',
      quickStatus: 'เปลี่ยนสถานะด่วน',
    },
  },
  en: {
    app: {
      title: 'gupaicon',
      subtitle: 'Bangkok & Rangsit Livehouse Map',
      searchPlaceholder: 'Search venue or concert...',
      venuesCount: (n) => `${n} venues`,
      eventsCount: (n) => `${n} shows`,
      admin: 'Admin',
      mapView: 'Map',
      listView: 'List',
      mapLegend: {
        available: '✓ Available',
        low: '◐ Low',
        soldOut: '✕ Sold out',
        noEvents: 'No shows / Not open',
      },
    },
    filters: {
      all: 'All',
      today: 'Today',
      thisWeek: 'This week',
      thisMonth: 'This month',
      ticketsOnly: 'Tickets available only',
      clearFilters: 'Clear filters',
      noEventsFound: 'No shows found matching current filter',
      noEventsInPeriod: 'No upcoming events in this period',
    },
    status: {
      available: 'Available',
      low: 'Low',
      soldout: 'Sold out',
      notopen: 'Not open',
      cancelled: 'Cancelled',
      sold_out: 'Sold out',
      not_open: 'Not open',
    },
    statusSymbols: {
      available: '✓',
      low: '◐',
      soldout: '✕',
      notopen: '○',
      cancelled: '⊘',
    },
    venueSheet: {
      upcomingEvents: 'Upcoming Events',
      noUpcomingEventsHere: 'No upcoming events here',
      openInMaps: 'Map',
      instagram: 'Instagram',
      eventsAtVenue: (n) => `${n} event${n === 1 ? '' : 's'}`,
      dragToExpand: 'Drag to expand',
    },
    eventDetail: {
      artists: 'Artists',
      promoter: 'Promoter',
      verifiedBadge: 'Verified Promoter',
      dateTime: 'Date & Time',
      price: 'Tickets',
      genres: 'Genres',
      status: 'Ticket Status',
      buyTickets: 'Buy tickets',
      viewIgPost: 'View IG post',
      close: 'Close',
      backToVenue: 'Back to venue',
      unconfirmedNotice: 'Unconfirmed',
      disclaimerText: 'Ticket status comes from users/admins and may differ. Please check official ticketing page.',
    },
    relativeTime: {
      justNow: 'updated just now',
      minutesAgo: (m) => `updated ${m} min ago`,
      hoursAgo: (h) => `updated ${h} hours ago`,
      daysAgo: (d) => `updated ${d} days ago`,
      monthsAgo: (mo) => `updated ${mo} months ago`,
      prefix: 'updated',
    },
    admin: {
      title: 'Admin Console',
      subtitle: 'Manage Venues, Promoters, and Events (wantawachjz@gmail.com only)',
      loginRequired: 'Please sign in with Google to access admin controls',
      loginWithGoogle: 'Sign in with Google',
      unauthorized: 'Access denied: Strictly restricted to verified wantawachjz@gmail.com',
      signOut: 'Sign out',
      tabs: {
        events: 'Events',
        venues: 'Venues',
        promoters: 'Promoters',
      },
      seedSampleEvents: 'Seed Sample Shows (SAMPLE)',
      seedSuccess: 'Sample shows successfully created',
      quickStatus: 'Quick Status Change',
    },
  },
};

const STORAGE_KEY = 'gupaicon_lang';

export function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'th' || saved === 'en') return saved;
  } catch {
    // fallback
  }
  // Default language is 'th'
  return 'th';
}

export function saveLanguagePreference(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}
