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
    addToCalendar: string;
    googleCalendar: string;
    eventPassed: string;
    openCalendarFile: string;
    calendarDownloaded: string;
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
    heading5: string;
    content5: string;
    heading6: string;
    content6: string;
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
      moderation: string;
    };
    seedSampleEvents: string;
    seedSuccess: string;
    quickStatus: string;
    reportsCount: (n: number) => string;
    deleteReports: string;
    reportsDeleted: string;
  };
  community: {
    findBuddy: string;
    goingTogether: string;
    chooseNameTitle: string;
    chooseNameDesc: string;
    displayNameLabel: string;
    displayNamePlaceholder: string;
    avatarEmojiLabel: string;
    bioLabel: string;
    favoriteGenresLabel: string;
    ageConsentLabel: string;
    saveProfile: string;
    deleteProfileAndPosts: string;
    deleteProfileConfirm: string;
    safetyNotice: string;
    kinds: {
      looking_for_buddy: string;
      have_extra_ticket: string;
      need_ticket: string;
    };
    allKinds: string;
    postButton: string;
    writePostTitle: string;
    postKindLabel: string;
    postContentLabel: string;
    postContentPlaceholder: string;
    meetUpNoteLabel: string;
    meetUpNotePlaceholder: string;
    publishPost: string;
    closePost: string;
    deletePost: string;
    deletePostConfirm: string;
    closedBadge: string;
    comments: string;
    addComment: string;
    sendComment: string;
    report: string;
    block: string;
    blockConfirm: string;
    userBlocked: string;
    reportTitle: string;
    reportReasonLabel: string;
    reportSuccess: string;
    reasons: {
      spam: string;
      harassment: string;
      inappropriate: string;
      scalping: string;
      scam: string;
      other: string;
    };
    refresh: string;
    noPostsYet: string;
    noPostsOnBoard: string;
    signInToPost: string;
    profileTitle: string;
    editProfile: string;
    backToMap: string;
    bannedMessage: string;
    editPost: string;
    reopenPost: string;
    saveChanges: string;
    cancel: string;
    commentsLoading: string;
    noCommentsYet: string;
    completeProfileToComment: string;
    signInToViewProfile: string;
    signIn: string;
  };
  chat: {
    title: string;
    chatsTab: string;
    requestsTab: string;
    requestsCount: (n: number) => string;
    startChatTitle: (name: string) => string;
    messageButton: string;
    firstMessageNotice: string;
    safetyNotice: string;
    accept: string;
    decline: string;
    blockAndReport: string;
    deleteChatForMe: string;
    deleteChatConfirm: string;
    waitingForAcceptance: string;
    chatDeclined: string;
    chatBlocked: string;
    placeholder: string;
    send: string;
    noChatsYet: string;
    noRequestsYet: string;
    signInToMessage: string;
    reportMessage: string;
    deleteMessage: string;
    deleteMessageConfirm: string;
    offlineNotice: string;
    loading: string;
    error: string;
    retry: string;
    emptySearch: string;
    you: string;
    statusPending: string;
    statusAccepted: string;
    statusDeclined: string;
  };
}

export const translations: Record<Language, TranslationDictionary> = {
  th: {
    app: {
      title: 'gupaicon (กูไปคอน)',
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
      addToCalendar: 'เพิ่มลงปฏิทิน',
      googleCalendar: 'Google Calendar',
      eventPassed: 'คอนเสิร์ตนี้ผ่านไปแล้ว',
      openCalendarFile: 'เปิดไฟล์ปฏิทิน (.ics)',
      calendarDownloaded: 'ดาวน์โหลดไฟล์ปฏิทินแล้ว',
    },
    footer: {
      disclaimer: 'สถานะบัตรมาจากผู้ใช้และอาจคลาดเคลื่อน โปรดตรวจสอบกับหน้าขายบัตรอย่างเป็นทางการอีกครั้ง',
      privacyLink: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
    },
    privacy: {
      title: 'นโยบายความเป็นส่วนตัว (Privacy Policy)',
      backToMap: 'กลับสู่แผนที่',
      heading1: 'ข้อมูลที่เราจัดเก็บ',
      content1: 'เราจัดเก็บหมายเลขบัญชีผู้ใช้ Google (UID) สำหรับการรายงานสถานะบัตร และโปรไฟล์คอมมูนิตี้ (ชื่อแสดงผล, แท็กตัวเลข 4 หลัก, อิโมจิประจำตัว, ประวัติสั้นๆ และแนวเพลงที่ชอบ) ทั้งนี้ เราไม่มีการจัดเก็บหรือเปิดเผยอีเมล หรือรูปโปรไฟล์ Google ของท่านสู่สาธารณะโดยเด็ดขาด',
      heading2: 'การแสดงผลโพสต์และความคิดเห็น',
      content2: 'โพสต์หาเพื่อนไปคอนเสิร์ตและความคิดเห็นในบอร์ดเป็นข้อมูลสาธารณะที่ทุกคนสามารถเข้าถึงได้ โปรดอย่าเปิดเผยเบอร์โทรศัพท์ ที่อยู่ หรือข้อมูลส่วนตัวที่มีความอ่อนไหวในข้อความ',
      heading3: 'ไม่มีการขายข้อมูลหรือโฆษณา',
      content3: 'เราไม่มีการแสดงโฆษณา และไม่มีการขาย แบ่งปัน หรือส่งต่อข้อมูลส่วนบุคคลใดๆ ของผู้ใช้งานทั้งสิ้น',
      heading4: 'การลบข้อมูลและโปรไฟล์',
      content4: 'ท่านสามารถลบโปรไฟล์และโพสต์ทั้งหมดของท่านได้ทันทีด้วยตนเองผ่านหน้าโปรไฟล์ (#/me) หรือส่งคำขอทางอีเมล wanthawatjx@gmail.com',
      heading5: 'ความปลอดภัยและการดูแลชุมชน (Moderation & Bans)',
      content5: 'ผู้ดูแลระบบมีอำนาจในการตรวจสอบรายงาน ลบเนื้อหาที่ไม่เหมาะสม และระงับสิทธิ์การใช้งาน (Ban) ของผู้ใช้งานที่ละเมิดกฎความปลอดภัยของชุมชนอย่างถาวร',
      heading6: 'ข้อความส่วนตัว (Direct Messages) และความโปร่งใสด้านข้อมูล',
      content6: 'ข้อความส่วนตัว (DM) ถูกจัดเก็บไว้ในฐานข้อมูล Firestore ของโปรเจกต์ และไม่ได้เข้ารหัสจากต้นทางถึงปลายทาง (End-to-End Encrypted) เจ้าของโปรเจกต์สามารถเข้าถึงคอนโซลฐานข้อมูลในทางเทคนิคได้ แต่จะไม่มีการนำมาเปิดอ่านทั่วไป และจะถูกตรวจสอบโดยผู้ดูแลระบบเฉพาะเมื่อมีผู้ใช้งานรายงานข้อความที่ไม่เหมาะสมเท่านั้น โดยผู้ใช้สามารถลบข้อความของตนเอง ซ่อนแชท หรือลบโปรไฟล์ทิ้งได้ตลอดเวลา',
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
        moderation: 'จัดการความปลอดภัย (Moderation)',
      },
      seedSampleEvents: 'Seed ข้อมูลตัวอย่าง (SAMPLE)',
      seedSuccess: 'สร้างข้อมูลตัวอย่าง SAMPLE สำเร็จแล้ว',
      quickStatus: 'เปลี่ยนสถานะด่วน',
      reportsCount: (n) => `${n} รายงานใน 90 นาที`,
      deleteReports: 'ลบรายงานทั้งหมด (Spam Cleanup)',
      reportsDeleted: 'ลบรายงานทั้งหมดสำเร็จแล้ว',
    },
    community: {
      findBuddy: 'หาเพื่อนไปคอน',
      goingTogether: 'ไปด้วยกันไหม?',
      chooseNameTitle: 'ตั้งชื่อโปรไฟล์ของคุณ',
      chooseNameDesc: 'ระบุชื่อและเลือกอิโมจิเพื่อพูดคุยในบอร์ดหาเพื่อนไปคอน (ไม่มีการเปิดเผยอีเมลหรือรูปส่วนตัว)',
      displayNameLabel: 'ชื่อในคอมมูนิตี้',
      displayNamePlaceholder: 'เช่น IndieLover (2-24 ตัวอักษร)',
      avatarEmojiLabel: 'เลือกอิโมจิประจำตัว',
      bioLabel: 'คำแนะนำตัวสั้นๆ (ไม่บังคับ)',
      favoriteGenresLabel: 'แนวเพลงที่ชอบ (สูงสุด 5)',
      ageConsentLabel: 'ฉันอายุ 18 ปีขึ้นไป หรือได้รับความยินยอมจากผู้ปกครองแล้ว',
      saveProfile: 'บันทึกโปรไฟล์',
      deleteProfileAndPosts: 'ลบโปรไฟล์และโพสต์ทั้งหมดของฉัน',
      deleteProfileConfirm: 'คุณแน่ใจหรือไม่ว่าต้องการลบโปรไฟล์และโพสต์ทั้งหมดของคุณอย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้',
      safetyNotice: 'นัดพบในที่สาธารณะ, ไม่ควรให้เบอร์โทรหรือที่อยู่เร็วเกินไป, แจ้งเพื่อนหรือคนใกล้ชิดไว้เสมอ และช่วยกันรายงานหากพบผู้ใช้งานที่ไม่เหมาะสม',
      kinds: {
        looking_for_buddy: 'หาเพื่อนไป',
        have_extra_ticket: 'มีบัตรเหลือ',
        need_ticket: 'หาบัตร',
      },
      allKinds: 'ทุกประเภท',
      postButton: 'โพสต์หาเพื่อน',
      writePostTitle: 'สร้างโพสต์หาเพื่อนไปคอน',
      postKindLabel: 'ประเภทโพสต์',
      postContentLabel: 'ข้อความของคุณ',
      postContentPlaceholder: 'อยากชวนใครไปด้วย หรือมีรายละเอียดอะไรอยากบอกเพื่อนๆ (ข้อความธรรมดา)...',
      meetUpNoteLabel: 'จุดนัดพบ / ข้อสังเกต (ไม่บังคับ)',
      meetUpNotePlaceholder: 'เช่น เจอกันหน้าทางเข้า 19:30 น.',
      publishPost: 'เผยแพร่โพสต์',
      closePost: 'ปิดรับ (Closed)',
      deletePost: 'ลบโพสต์',
      deletePostConfirm: 'ต้องการลบโพสต์นี้หรือไม่?',
      closedBadge: 'ปิดรับแล้ว',
      comments: 'ความคิดเห็น',
      addComment: 'เขียนความคิดเห็น...',
      sendComment: 'ส่ง',
      report: 'รายงาน',
      block: 'บล็อก',
      blockConfirm: 'ต้องการบล็อกผู้ใช้นี้หรือไม่? โพสต์และความคิดเห็นของผู้ใช้นี้จะถูกซ่อนจากคุณ',
      userBlocked: 'บล็อกผู้ใช้แล้ว',
      reportTitle: 'รายงานเนื้อหาไม่เหมาะสม',
      reportReasonLabel: 'เหตุผลในการรายงาน',
      reportSuccess: 'ส่งรายงานให้แอดมินตรวจสอบแล้ว ขอบคุณที่ช่วยดูแลชุมชน',
      reasons: {
        spam: 'สแปม / โฆษณาซ้ำซ้อน',
        harassment: 'การคุกคาม / ถ้อยคำไม่เหมาะสม',
        inappropriate: 'เนื้อหาไม่เหมาะสม / หยาบคาย',
        scalping: 'ขายบัตรโก่งราคา (Scalping)',
        scam: 'มิจฉาชีพ / หลอกลวง',
        other: 'อื่นๆ',
      },
      refresh: 'รีเฟรช',
      noPostsYet: 'ยังไม่มีโพสต์หาเพื่อนในคอนนี้ เป็นคนแรกที่โพสต์เลย!',
      noPostsOnBoard: 'ยังไม่มีโพสต์หาเพื่อนในหมวดนี้',
      signInToPost: 'ลงชื่อเข้าใช้ด้วย Google เพื่อโพสต์หาเพื่อน',
      profileTitle: 'โปรไฟล์ของฉัน',
      editProfile: 'แก้ไขโปรไฟล์',
      backToMap: 'กลับสู่แผนที่',
      bannedMessage: 'บัญชีของคุณถูกระงับการโพสต์เนื่องจากละเมิดกฎชุมชน',
      editPost: 'แก้ไข',
      reopenPost: 'เปิดรับอีกครั้ง',
      saveChanges: 'บันทึก',
      cancel: 'ยกเลิก',
      commentsLoading: 'กำลังโหลดความคิดเห็น...',
      noCommentsYet: 'ยังไม่มีความคิดเห็น พิมพ์ด้านล่างได้เลย',
      completeProfileToComment: 'กรุณาตั้งค่าโปรไฟล์ให้เสร็จก่อนแสดงความคิดเห็น',
      signInToViewProfile: 'กรุณาเข้าสู่ระบบด้วย Google เพื่อดูหรือแก้ไขโปรไฟล์ของคุณ',
      signIn: 'เข้าสู่ระบบด้วย Google',
    },
    chat: {
      title: 'ข้อความส่วนตัว',
      chatsTab: 'แชท',
      requestsTab: 'คำขอส่งข้อความ',
      requestsCount: (n) => `${n} คำขอใหม่`,
      startChatTitle: (name) => `ส่งข้อความถึง ${name}`,
      messageButton: 'ส่งข้อความ',
      firstMessageNotice: 'คำขอส่งข้อความครั้งแรก: คุณสามารถส่งข้อความเปิดได้ 1 ข้อความ และอีกฝ่ายต้องกดยอมรับก่อน จึงจะเริ่มสนทนากันได้ตามปกติ',
      safetyNotice: 'โปรดระมัดระวังการเปิดเผยข้อมูลส่วนบุคคล เช่น เบอร์โทรหรือบัญชีการเงิน แจ้งรายงานหากพบพฤติกรรมไม่เหมาะสม',
      accept: 'ยอมรับ',
      decline: 'ปฏิเสธ',
      blockAndReport: 'บล็อกและรายงาน',
      deleteChatForMe: 'ลบแชทออกจากรายการของฉัน',
      deleteChatConfirm: 'ต้องการลบและซ่อนแชทนี้ออกจากรายการของคุณหรือไม่?',
      waitingForAcceptance: 'รออีกฝ่ายตอบรับคำขอก่อน จึงจะส่งข้อความเพิ่มได้',
      chatDeclined: 'คำขอส่งข้อความนี้ถูกปฏิเสธแล้ว',
      chatBlocked: 'คุณหรืออีกฝ่ายได้บล็อกการติดต่อ ไม่สามารถส่งข้อความได้',
      placeholder: 'พิมพ์ข้อความ (ข้อความธรรมดา สูงสุด 1,000 ตัวอักษร)...',
      send: 'ส่ง',
      noChatsYet: 'ยังไม่มีบทสนทนา คลิก "ส่งข้อความ" บนการ์ดหาเพื่อนเพื่อเริ่มคุย',
      noRequestsYet: 'ไม่มีคำขอส่งข้อความใหม่',
      signInToMessage: 'กรุณาเข้าสู่ระบบและสร้างโปรไฟล์ก่อนส่งข้อความ',
      reportMessage: 'รายงานข้อความ',
      deleteMessage: 'ลบข้อความ',
      deleteMessageConfirm: 'ต้องการลบข้อความนี้ของคุณหรือไม่?',
      offlineNotice: 'คุณกำลังออฟไลน์ ข้อความอาจยังไม่ถูกส่ง',
      loading: 'กำลังโหลด...',
      error: 'เกิดข้อผิดพลาดในการโหลดข้อความ',
      retry: 'ลองใหม่',
      emptySearch: 'ไม่พบบทสนทนา',
      you: 'คุณ',
      statusPending: 'รอตอบรับ',
      statusAccepted: 'เชื่อมต่อแล้ว',
      statusDeclined: 'ปฏิเสธแล้ว',
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
      addToCalendar: 'Add to calendar',
      googleCalendar: 'Google Calendar',
      eventPassed: 'This event has passed',
      openCalendarFile: 'Open calendar file (.ics)',
      calendarDownloaded: 'Calendar file downloaded',
    },
    footer: {
      disclaimer: 'Ticket status is reported by users and may be wrong. Always confirm on the official ticket page.',
      privacyLink: 'Privacy Policy',
    },
    privacy: {
      title: 'Privacy Policy',
      backToMap: 'Back to map',
      heading1: 'What We Store',
      content1: 'We store your Google account UID, crowd ticket reports, and community profile details (chosen display name, 4-digit tag, avatar emoji, optional bio, and favorite genres). We NEVER expose your Google email address or Google account profile photo to other users.',
      heading2: 'Public Posts & Comments',
      content2: 'All buddy requests and comments posted on the "Find a concert buddy" board are public and readable by anyone. Do not share phone numbers, addresses, or private details in public posts.',
      heading3: 'No Ads & No Data Selling',
      content3: 'We do not display ads, and we never sell, monetize, or transfer your personal data to third parties.',
      heading4: 'Data Deletion & Profile Removal',
      content4: 'You can permanently delete your community profile and all your buddy posts anytime directly from your profile page (#/me) or by contacting wanthawatjx@gmail.com.',
      heading5: 'Content Moderation & User Bans',
      content5: 'The administrator actively reviews moderation reports, removes inappropriate content, and permanently bans users who violate community safety standards.',
      heading6: 'Direct Messages & Honest Privacy Disclosure',
      content6: 'Private direct messages are stored in the project\'s Firestore database and are not end-to-end encrypted. The project owner technically has administrative access to the Firebase console; however, messages are not routinely monitored and are only reviewed if a user reports abusive content. Users may delete their own messages, hide chats from their view, or delete their profile entirely.',
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
        moderation: 'Moderation',
      },
      seedSampleEvents: 'Seed Sample Shows (SAMPLE)',
      seedSuccess: 'Sample shows successfully created',
      quickStatus: 'Quick Status Change',
      reportsCount: (n) => `${n} reports in 90m`,
      deleteReports: 'Delete all reports',
      reportsDeleted: 'All crowd reports deleted successfully',
    },
    community: {
      findBuddy: 'Find a concert buddy',
      goingTogether: 'Going together?',
      chooseNameTitle: 'Choose your profile name',
      chooseNameDesc: 'Pick a display name and avatar emoji to join the concert buddy board (your email and Google photo are never shared)',
      displayNameLabel: 'Community Name',
      displayNamePlaceholder: 'e.g. IndieLover (2-24 chars)',
      avatarEmojiLabel: 'Choose Avatar Emoji',
      bioLabel: 'Short Bio (Optional)',
      favoriteGenresLabel: 'Favorite Genres (Max 5)',
      ageConsentLabel: 'I am 18 or older, or I have my parent\'s consent',
      saveProfile: 'Save Profile',
      deleteProfileAndPosts: 'Delete my profile and posts',
      deleteProfileConfirm: 'Are you sure you want to permanently delete your profile and all your posts? This cannot be undone.',
      safetyNotice: 'Meet in public places, don\'t share phone numbers or addresses early, tell a friend, and report anyone who makes you uncomfortable.',
      kinds: {
        looking_for_buddy: 'Looking for buddy',
        have_extra_ticket: 'Have extra ticket',
        need_ticket: 'Need ticket',
      },
      allKinds: 'All types',
      postButton: 'Post a Buddy Request',
      writePostTitle: 'Create Buddy Post',
      postKindLabel: 'Post Type',
      postContentLabel: 'Your Message',
      postContentPlaceholder: 'Who are you looking to go with? What vibes or bands do you like (plain text only)?',
      meetUpNoteLabel: 'Meet-up Note (Optional)',
      meetUpNotePlaceholder: 'e.g. Meet by entrance at 19:30',
      publishPost: 'Publish Post',
      closePost: 'Close Post',
      deletePost: 'Delete Post',
      deletePostConfirm: 'Delete this post?',
      closedBadge: 'Closed',
      comments: 'Comments',
      addComment: 'Write a comment...',
      sendComment: 'Send',
      report: 'Report',
      block: 'Block',
      blockConfirm: 'Block this user? Their posts and comments will be hidden from you.',
      userBlocked: 'User blocked',
      reportTitle: 'Report Content',
      reportReasonLabel: 'Reason for report',
      reportSuccess: 'Report submitted to admin. Thank you for keeping our community safe.',
      reasons: {
        spam: 'Spam / Repeated ads',
        harassment: 'Harassment / Inappropriate behavior',
        inappropriate: 'Inappropriate language / content',
        scalping: 'Ticket scalping / overpricing',
        scam: 'Scam / Fraud attempt',
        other: 'Other violation',
      },
      refresh: 'Refresh',
      noPostsYet: 'No buddy posts yet for this show. Be the first to post!',
      noPostsOnBoard: 'No buddy posts found.',
      signInToPost: 'Sign in with Google to post',
      profileTitle: 'My Profile',
      editProfile: 'Edit Profile',
      backToMap: 'Back to Map',
      bannedMessage: 'Your account has been restricted from posting due to community violations.',
      editPost: 'Edit',
      reopenPost: 'Re-open',
      saveChanges: 'Save',
      cancel: 'Cancel',
      commentsLoading: 'Loading comments...',
      noCommentsYet: 'No comments yet. Write one below.',
      completeProfileToComment: 'Please complete your profile to post comments.',
      signInToViewProfile: 'Sign in with Google to view or edit your community profile.',
      signIn: 'Sign in with Google',
    },
    chat: {
      title: 'Direct Messages',
      chatsTab: 'Chats',
      requestsTab: 'Requests',
      requestsCount: (n) => `${n} new request${n === 1 ? '' : 's'}`,
      startChatTitle: (name) => `Message ${name}`,
      messageButton: 'Message',
      firstMessageNotice: 'First message request: You can send one opening message. The recipient must accept before you can chat freely.',
      safetyNotice: 'Be careful with personal info. Never share financial or sensitive data. Report any abuse immediately.',
      accept: 'Accept',
      decline: 'Decline',
      blockAndReport: 'Block & Report',
      deleteChatForMe: 'Delete chat for me',
      deleteChatConfirm: 'Are you sure you want to hide and remove this chat from your list?',
      waitingForAcceptance: 'Waiting for acceptance before sending more messages',
      chatDeclined: 'This chat request was declined.',
      chatBlocked: 'You or the other user has blocked communication.',
      placeholder: 'Type a message (plain text, max 1,000 chars)...',
      send: 'Send',
      noChatsYet: 'No conversations yet. Click "Message" on a buddy post to start.',
      noRequestsYet: 'No pending requests',
      signInToMessage: 'Sign in and set up your profile to send messages',
      reportMessage: 'Report message',
      deleteMessage: 'Delete message',
      deleteMessageConfirm: 'Delete this message for everyone?',
      offlineNotice: 'You are currently offline. Messages may not be sent.',
      loading: 'Loading...',
      error: 'Failed to load conversation',
      retry: 'Retry',
      emptySearch: 'No chats found',
      you: 'You',
      statusPending: 'Pending',
      statusAccepted: 'Connected',
      statusDeclined: 'Declined',
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
