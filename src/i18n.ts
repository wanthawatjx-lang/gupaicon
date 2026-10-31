/**
 * Bilingual translations for กูไปคอน (gupaicon)
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
    sold_out: string;
    not_open: string;
    cancelled: string;
  };
  statusSymbols: {
    available: string;
    low: string;
    sold_out: string;
    not_open: string;
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
    reportTitle: string;
    signInToReport: string;
    thanksReported: (statusText: string) => string;
    changeReport: string;
    reportAProblem: string;
  };
  footer: {
    disclaimer: string;
    privacyLink: string;
  };
  privacy: {
    title: string;
    backToMap: string;
    heading1: string;
    content1: string;
    heading2: string;
    content2: string;
    heading3: string;
    content3: string;
    heading4: string;
    content4: string;
  };
  states: {
    offlineTitle: string;
    offlineMessage: string;
    errorTitle: string;
    errorMessage: string;
    retry: string;
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
      sources: string;
      aiReview: string;
    };
    seedSampleEvents: string;
    seedSuccess: string;
    quickStatus: string;
    reportsCount: (n: number) => string;
    deleteReports: string;
    reportsDeleted: string;
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
      sold_out: 'บัตรหมด',
      not_open: 'ยังไม่เปิดขาย',
      cancelled: 'ยกเลิก',
    },
    statusSymbols: {
      available: '✓',
      low: '◐',
      sold_out: '✕',
      not_open: '○',
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
      reportTitle: 'รายงานสถานะบัตร (Crowd Reports)',
      signInToReport: 'ลงชื่อเข้าใช้เพื่อรายงานสถานะ',
      thanksReported: (st) => `ขอบคุณที่คุณรายงานสถานะ: ${st}`,
      changeReport: 'เปลี่ยนสถานะที่รายงาน',
      reportAProblem: 'แจ้งปัญหา / ส่งข้อเสนอแนะเกี่ยวกับงานนี้',
    },
    footer: {
      disclaimer: 'สถานะบัตรมาจากผู้ใช้และอาจคลาดเคลื่อน โปรดตรวจสอบกับหน้าขายบัตรอย่างเป็นทางการอีกครั้ง',
      privacyLink: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
    },
    privacy: {
      title: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
      backToMap: 'กลับสู่แผนที่',
      heading1: 'ข้อมูลที่เราจัดเก็บ',
      content1: 'เราจัดเก็บหมายเลขบัญชีผู้ใช้ Google (UID) เมื่อท่านเข้าสู่ระบบเพื่อรายงานสถานะบัตร รวมถึงข้อมูลสถานะบัตรที่ท่านส่งเข้ามา และอีเมลของแอดมินสำหรับการจัดการระบบ',
      heading2: 'การใช้งานข้อมูล',
      content2: 'ข้อมูลทั้งหมดใช้เพื่อการแสดงผลสถานะบัตรภายในแอปพลิเคชันกูไปคอน (gupaicon) เท่านั้น',
      heading3: 'ไม่มีการขายข้อมูลหรือโฆษณา',
      content3: 'เราไม่มีนโยบายแสดงโฆษณา ไม่มีการขายหรือเปิดเผยข้อมูลส่วนบุคคลของท่านให้แก่บุคคลที่สาม',
      heading4: 'การติดต่อและการขอลบข้อมูล',
      content4: 'ท่านสามารถติดต่อสอบถาม หรือส่งคำขอให้ลบข้อมูลรายงานสถานะหรือบัญชีของท่านได้โดยตรงที่อีเมล wanthawatjx@gmail.com',
    },
    states: {
      offlineTitle: 'คุณกำลังออฟไลน์',
      offlineMessage: 'กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ',
      errorTitle: 'เกิดข้อผิดพลาดในการโหลดข้อมูล',
      errorMessage: 'ไม่สามารถเชื่อมต่อกับฐานข้อมูล Firestore ได้ในขณะนี้',
      retry: 'ลองใหม่อีกครั้ง',
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
      subtitle: 'จัดการร้าน ผู้จัด และคอนเสิร์ต (เฉพาะ wanthawatjx@gmail.com)',
      loginRequired: 'กรุณาเข้าสู่ระบบด้วย Google',
      loginWithGoogle: 'เข้าสู่ระบบด้วย Google',
      unauthorized: 'ขออภัย เฉพาะ wanthawatjx@gmail.com ที่ได้รับการยืนยันอีเมลแล้วเท่านั้นที่มีสิทธิ์เข้าถึง',
      signOut: 'ออกจากระบบ',
      tabs: {
        events: 'จัดการงาน (Events)',
        venues: 'จัดการร้าน (Venues)',
        promoters: 'จัดการผู้จัด (Promoters)',
        sources: 'แหล่งข้อมูล (Sources)',
        aiReview: 'ตรวจสอบ AI (AI Review)',
      },
      seedSampleEvents: 'Seed ข้อมูลตัวอย่าง (SAMPLE)',
      seedSuccess: 'สร้างข้อมูลตัวอย่าง SAMPLE สำเร็จแล้ว',
      quickStatus: 'เปลี่ยนสถานะด่วน',
      reportsCount: (n) => `${n} รายงานใน 90 นาที`,
      deleteReports: 'ลบรายงานทั้งหมด (Spam Cleanup)',
      reportsDeleted: 'ลบรายงานทั้งหมดสำเร็จแล้ว',
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
      sold_out: 'Sold out',
      not_open: 'Not open',
      cancelled: 'Cancelled',
    },
    statusSymbols: {
      available: '✓',
      low: '◐',
      sold_out: '✕',
      not_open: '○',
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
      reportTitle: 'Report Ticket Status',
      signInToReport: 'Sign in to report',
      thanksReported: (st) => `Thanks, you reported: ${st}`,
      changeReport: 'Change report',
      reportAProblem: 'Report a problem regarding this event',
    },
    footer: {
      disclaimer: 'Ticket status is reported by users and may be wrong. Always confirm on the official ticket page.',
      privacyLink: 'Privacy Policy',
    },
    privacy: {
      title: 'Privacy Policy',
      backToMap: 'Back to map',
      heading1: 'Information We Store',
      content1: 'We store your Google account ID (UID) when you sign in to report ticket status, the status reports you submit, and the admin email address for administration.',
      heading2: 'How We Use Data',
      content2: 'All stored information is used exclusively to display ticket status within the gupaicon application.',
      heading3: 'No Ads & No Data Selling',
      content3: 'We do not display ads, nor do we sell or share your personal data with any third parties.',
      heading4: 'Contact & Data Deletion',
      content4: 'You can contact us or request the deletion of your reports or account data by emailing wanthawatjx@gmail.com.',
    },
    states: {
      offlineTitle: 'You are offline',
      offlineMessage: 'Please check your internet connection.',
      errorTitle: 'Failed to load data',
      errorMessage: 'Could not connect to Firestore database at this time.',
      retry: 'Retry',
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
      subtitle: 'Manage Venues, Promoters, and Events (wanthawatjx@gmail.com only)',
      loginRequired: 'Please sign in with Google to access admin controls',
      loginWithGoogle: 'Sign in with Google',
      unauthorized: 'Access denied: Strictly restricted to verified wanthawatjx@gmail.com',
      signOut: 'Sign out',
      tabs: {
        events: 'Events',
        venues: 'Venues',
        promoters: 'Promoters',
        sources: 'Sources',
        aiReview: 'AI Review',
      },
      seedSampleEvents: 'Seed Sample Shows (SAMPLE)',
      seedSuccess: 'Sample shows successfully created',
      quickStatus: 'Quick Status Change',
      reportsCount: (n) => `${n} reports in 90m`,
      deleteReports: 'Delete all reports',
      reportsDeleted: 'All crowd reports deleted successfully',
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
  return 'th';
}

export function saveLanguagePreference(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}
