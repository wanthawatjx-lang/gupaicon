# Implementation Plan: gupaicon - Indie Livehouse Map Extension

Extend the **gupaicon** (กู้ภัยคอน) web application with events, promoters, pin urgency coloring, bilingual support (Thai & English), Spark-tier friendly Firestore queries, and a streamlined admin panel strictly guarded by `wantawachjz@gmail.com`.

---

## User Review & Critical Decisions

> ### ⚠️ Scope & Security Alignment Check
> 1. **Strict Admin Restriction**: All Firestore write permissions across `venues`, `promoters`, and `events` are strictly locked to `wantawachjz@gmail.com` with `email_verified == true`. All other emails or temporary dev rules are removed.
> 2. **Explicit Negative Constraint Enforced**: As instructed (*"Do not add user accounts, voting, or crowd reports yet"*), crowd status voting, user sign-in for reporting, and organizer self-service applications are removed from the public UI. The consumer experience focuses purely on discovering venues, livehouse events, urgency badges, and verified ticket/IG links.
> 3. **Bilingual Implementation**: The consumer interface toggles between Thai (`th`) and English (`en`), persisting in `localStorage` and defaulting to Thai if `navigator.language` starts with `th`. Firestore entity names (venue/event names) remain intact without automated translation. Admin console remains in English.
> 4. **Free-tier Spark Quota Safety**: Firestore queries filter out past events (`startAt >= startOfDay`) and enforce strict limits (`limit(80)`). All logic runs client-side with zero Cloud Functions or Cloud Storage dependencies.

---

## 1. Overview & Core Concept

**gupaicon** is a mobile-first, dark-themed concert discovery web application mapping underground and indie livehouses across Bangkok and Pathum Thani (Rangsit). 

This release introduces:
- **Promoters & Events Collections**: Structured data for promoters (name, Instagram, verified status) and events (artists, venue, promoter, start time in Asia/Bangkok, pricing, genres, ticket URLs, and status).
- **Interactive Pin Urgency**: Map pins styled by event availability urgency (Available = Green, Low tickets = Yellow, Sold out = Red, No upcoming = Grey).
- **Dual Sheets (Venue & Event)**:
  - **Venue Sheet**: Venue info + list of upcoming events with status badges and relative update timestamps.
  - **Event Detail Sheet**: Deep dive into event details, artist line-up, promoter with verified badge, localized date/time in `Asia/Bangkok`, ticket purchase button, and direct IG link.
- **Top Filter Bar**: Time ranges (All, Today, This week, This month) and a "Tickets available only" switch.
- **Bilingual Experience**: Smooth TH/EN switcher in the header, Thai typography via Google Fonts (`Prompt` / `Noto Sans Thai`), and localized date formatting.
- **Admin Management**: Full CRUD for Venues, Promoters, and Events with 1-tap status switching and sample data seeding.

---

## 2. User Experience & Visual Design

### 2.1 Aesthetic & Typography
- **Theme**: Dark, minimal concert-poster visual design (`#0a0b0e` canvas, `#14171f` card surfaces, `#222736` borders, crisp amber `#f59e0b` accents).
- **Typography**: Google Fonts **Prompt** and **Noto Sans Thai** paired with system sans-serif for sharp Thai and Latin legibility.
- **Mobile First**: Handcrafted touch ergonomics for 390px viewport width, swipeable bottom sheets, large tap targets (minimum 44px).

### 2.2 Top Header & Controls
- **Header**:
  - Left: Logo icon + "gupaicon" branding (subtitle "Bangkok & Rangsit Livehouses" / "แผนที่คอนเสิร์ตอินดี้").
  - Right:
    - **Language Switcher**: Toggle button showing `TH | EN` with high-contrast active state.
    - **Admin Button**: Unobtrusive lock icon button leading to `/admin` login.
- **Filter Bar**:
  - Horizontal scrolling pill chips: **All** (`ทั้งหมด`), **Today** (`วันนี้`), **This week** (`สัปดาห์นี้`), **This month** (`เดือนนี้`).
  - Toggle chip: **Tickets available only** (`เฉพาะที่มีบัตร`).

### 2.3 Map & Pin Status Logic
- Leaflet map centered at `[13.80, 100.55]` with zoom 11, restricted to Bangkok & Pathum Thani bounding box.
- Pins colored by the most urgent upcoming event status at each venue:
  - 🟡 **Yellow**: At least one upcoming event has `"low"` tickets.
  - 🟢 **Green**: Upcoming events have `"available"` tickets (and none are low).
  - 🔴 **Red**: All upcoming events are `"sold_out"`.
  - ⚪ **Grey**: Venue has no upcoming events or only `"not_open"` / `"cancelled"`.

### 2.4 Sheets
1. **Venue Bottom Sheet**:
   - Venue Name, Address, "Open in Maps" button, and "Instagram" button.
   - List of upcoming events at this venue sorted chronologically (past events hidden).
   - Event row: Date/time, Title, Status badge (green Available, yellow Low, red Sold out, grey Not open/Cancelled), and "updated X min ago".
   - Tapping an event opens the Event Detail Sheet.
2. **Event Detail Sheet**:
   - Title, Artists tags list.
   - Promoter name with verified checkmark linking to promoter Instagram.
   - Date and time in `Asia/Bangkok` timezone (e.g. `24 เม.ย. 2025, 19:30 น.` in TH, `24 Apr 2025, 19:30` in EN).
   - Price text (e.g. `450 THB` or `Free entry`) and Genre pills.
   - Status badge with last status update time.
   - Action buttons:
     - **Buy tickets** (`ticketUrl`, opens external tab).
     - **View IG post** (`igPostUrl`, opens external tab as direct link, no iframe/embeds).

---

## 3. Key Product Decisions & Trade-Offs

| Decision | Chosen Implementation | Rationale |
| :--- | :--- | :--- |
| **Bilingual Architecture** | Single dictionary `src/i18n/translations.ts` (`th` and `en`) with typed keys and React context/hook. | Minimal bundle size, lightning-fast instant switching without reloading, zero external i18n bloat. |
| **Language Fallback** | `navigator.language.startsWith('th') ? 'th' : 'en'`, saved in `localStorage.getItem('gupaicon_lang')`. | Seamless native experience for Thai concert-goers while supporting international visitors. |
| **Timezone Precision** | `Intl.DateTimeFormat` configured with `timeZone: 'Asia/Bangkok'` across all date utilities. | Avoids device timezone discrepancies (crucial if a user travels or has system timezone set elsewhere). |
| **Negative Constraint** | Crowd status reporting and organizer registration components stripped/disabled from consumer UI. | User explicitly specified: *"Do not add user accounts, voting, or crowd reports yet."* Keeps the experience fast and rock-solid. |
| **Single Admin Security** | Restricted to `wantawachjz@gmail.com` with `email_verified == true`. | Eliminates accidental access or test-admin bypasses. |
| **Spark Plan Reads** | Query filtering on `startAt >= startOfDay` and limit 80. | Keeps reads well within Firebase's 50,000 daily read Spark free tier limit. |

---

## 4. Technical Architecture & Data Strategy

### 4.1 Data Flow Architecture

```
                  +-----------------------------------+
                  |  Firebase Firestore (Spark Tier)  |
                  +-----------------+-----------------+
                                    |
          +-------------------------+-------------------------+
          |                                                   |
+---------v---------+                               +---------v---------+
|      venues       |                               | events & promoters|
|  (public read)    |                               |   (public read)   |
+---------+---------+                               +---------+---------+
          |                                                   |
          +-------------------------+-------------------------+
                                    |
                        +-----------v-----------+
                        |  App Root / Context   |
                        | - Venues & Events     |
                        | - Lang State (TH/EN)  |
                        | - Time/Filter State   |
                        +-----------+-----------+
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
+------v------+              +------v------+              +------v------+
| Header &    |              | Leaflet Map |              | Bottom      |
| FilterBar   |              | Pins colored|              | Sheets      |
| - TH/EN     |              | by urgency  |              | - Venue     |
| - Time Pill |              |             |              | - Event     |
+-------------+              +-------------+              +-------------+
```

### 4.2 Firestore Data Schema

```typescript
// 1. venues
interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address: string;
  igUrl: string;
  mapsUrl: string;
}

// 2. promoters
interface Promoter {
  id: string;
  name: string;
  igUrl: string;
  verified: boolean;
}

// 3. events
interface EventItem {
  id: string;
  title: string;
  artists: string[];
  venueId: string;
  promoterId: string;
  startAt: Timestamp;
  priceText: string;
  genres: string[];
  ticketUrl: string;
  igPostUrl: string;
  posterUrl?: string;
  status: "not_open" | "available" | "low" | "sold_out" | "cancelled";
  statusUpdatedAt: Timestamp;
  statusSource: "admin";
}
```

### 4.3 Thai Status Translations
- `available` -> `"ยังมีบัตร"` (Green)
- `low` -> `"เหลือน้อย"` (Yellow)
- `sold_out` -> `"บัตรหมด"` (Red)
- `not_open` -> `"ยังไม่เปิดขาย"` (Slate/Grey)
- `cancelled` -> `"ยกเลิก"` (Slate/Grey)

---

## 5. Execution Steps

1. **i18n & Localization**:
   - Create `src/i18n/translations.ts` containing bilingual dictionaries (`th` and `en`) for all UI copy, filters, relative time formats, and status labels.
   - Update `src/utils/dateUtils.ts` to support `th` and `en` formatting with `Asia/Bangkok` timezone.
   - Import Google Fonts `Prompt` and `Noto Sans Thai` into `index.html` and `index.css`.
2. **Data Seed**:
   - Update `/data/seed/venues.json` with 3 clearly labeled SAMPLE venues.
   - Update `/data/seed/promoters.json` with 2 SAMPLE promoters.
   - Update `/data/seed/events.json` with 4 SAMPLE events.
3. **Services & Types**:
   - Align `src/types/event.ts` and `src/types/promoter.ts` strictly to the prompt schema.
   - Ensure `src/services/eventService.ts` and `src/services/promoterService.ts` query with limits and date filters.
4. **UI Components Refactor**:
   - `Header.tsx`: Language switcher button (`TH` / `EN`), Admin button. Remove crowd report / organizer buttons.
   - `FilterBar.tsx`: Bilingual filters (All / Today / This week / This month + Tickets available only).
   - `Map.tsx`: Calculate venue status urgency and apply green/yellow/red/grey marker pins.
   - `VenueBottomSheet.tsx`: Display venue info and upcoming events list with localized date, status pill, and relative update time.
   - `EventDetailSheet.tsx`: Event title, artists, promoter with verified badge, localized date/time in Asia/Bangkok, price, genres, status badge with update time, "Buy tickets" button, and "View IG post" button.
   - `AdminPanel.tsx`: Promoter and Event CRUD forms, dropdown selectors for venue/promoter, 1-tap status switch buttons, and database seeding tool.
5. **Firestore Security Rules**:
   - Update `firestore.rules` to allow public read for `venues`, `promoters`, and `events`.
   - Restrict write strictly to `request.auth.token.email == 'wantawachjz@gmail.com' && request.auth.token.email_verified == true`.
   - Validate field types, sizes, and formats.
   - Deploy rules via `deploy_firebase`.
6. **Documentation & Verification**:
   - Update `README.md` with instructions, schema, and admin guide.
   - Run `compile_applet` to ensure zero compilation or lint errors.
