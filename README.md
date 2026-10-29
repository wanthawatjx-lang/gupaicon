# gupaicon (กู้ภัยคอน)

A mobile-first web app map of indie / livehouse concerts and venues in Bangkok and Rangsit/Pathum Thani, Thailand.

Built with **React**, **TypeScript**, **Vite**, **Leaflet** with OpenStreetMap tiles, and **Firebase** (Firestore + Google Authentication). Free-tier friendly (Spark Plan, no Cloud Functions, no Firebase Storage). Bilingual UI: Thai & English (Admin console in English).

---

## Features

### 1. Full-Screen Interactive Map
- Centered on Bangkok (`13.80, 100.55`), zoom `11`.
- Restricted boundaries strictly enclosing Bangkok and Rangsit / Pathum Thani (`13.40, 100.20` to `14.30, 100.95`).
- Dark, minimal music-poster theme with CartoDB Dark Matter tiles powered by OpenStreetMap data.
- Visible attribution: `"© OpenStreetMap contributors © CARTO"`.
- Custom neon vinyl pins optimized for 390px mobile screens with 44px+ touch targets.
- **Dynamic Urgency Pin Coloring**:
  - 🟢 **Green** (`#22c55e`): Tickets available for upcoming show(s).
  - 🟡 **Yellow** (`#eab308`): Tickets running low (`low`).
  - 🔴 **Red** (`#ef4444`): Sold out shows.
  - ⚪ **Grey** (`#52525b`): Venue has no upcoming shows or not open / cancelled.

### 2. Bilingual Experience (Thai & English)
- **Language Switcher**: `TH | EN` toggle button in header with active highlight.
- **Auto-Detection**: Defaults to Thai if `navigator.language` starts with `th`, otherwise English.
- **Persistent Choice**: Saved in `localStorage` under `gupaicon_lang`.
- **Typography**: Google Fonts **Prompt** and **Noto Sans Thai** for crisp Thai typography.
- **Status Labels in Thai**:
  - Available = `"ยังมีบัตร"`
  - Low = `"เหลือน้อย"`
  - Sold out = `"บัตรหมด"`
  - Not open = `"ยังไม่เปิดขาย"`
  - Cancelled = `"ยกเลิก"`
- **Localized Dates**: All concert dates formatted in `Asia/Bangkok` timezone (`UTC+7`).
- Entity names (venues, events, artists) remain untouched as entered by admins.
- Admin console remains in English.

### 3. Date & Ticket Availability Filter Bar
- Quick segmented filter buttons: **All** (`ทั้งหมด`), **Today** (`วันนี้`), **This week** (`สัปดาห์นี้`), **This month** (`เดือนนี้`).
- Toggle switch: **Tickets available only** (`เฉพาะที่มีบัตร`).
- Map pin colors and counts react in real-time to active filters.

### 4. Venue Bottom Sheet
- Tapping any venue pin slides up a tactile music-poster bottom sheet.
- Direct links: **"Open in Maps"** (`mapsUrl`) and **"Instagram"** (`igUrl`).
- **Upcoming Concerts List**: Shows upcoming events hosted at the venue, sorted chronologically with past shows filtered out.
  - Date & time in `Asia/Bangkok` timezone.
  - Status badges: Green (Available / ยังมีบัตร), Yellow (Low / เหลือน้อย), Red (Sold out / บัตรหมด), Grey (Not open / Cancelled).
  - Relative update label: `"updated X min ago"` / `"อัปเดต X นาทีที่แล้ว"`.

### 5. Event Detail Sheet
- Tapping any concert event row opens full event details:
  - Event title, lineup / artists tags, and genres.
  - **Promoter / Collective**: with verified checkmark (`✓`) linking directly to their Instagram profile.
  - Date & Time in `Asia/Bangkok` timezone.
  - Ticket price description (`priceText`).
  - Live status badge with relative update timestamp.
  - **"Buy tickets"** button (`ticketUrl`, opens in new tab).
  - **"View IG post"** button (`igPostUrl`, opens in new tab as standard link, no embeds).

### 6. Admin Console (`/admin` and `#/admin`)
- Accessible via the top bar shield button or direct `/admin` URL.
- **Google Sign-In**: Admin access strictly restricted to `wantawachjz@gmail.com` with `email_verified == true`.
- **Management Tabs**:
  - **Events**: Create, edit, delete, and one-tap status updates. Venue and promoter fields are dropdown selectors.
  - **Venues**: Add, edit, and delete venues with coordinates, address, Maps link, and Instagram URL.
  - **Promoters**: Add, edit, and delete promoters (with verified toggle).
- **1-Click Seed Button**: Seeds sample venues, promoters, and events.

---

## Firestore Schema & Collections

### 1. `/venues/{venueId}`
- `name`: string (2..100)
- `lat`: number
- `lng`: number
- `address`: string (2..250)
- `igUrl`: string (0..300)
- `mapsUrl`: string (0..500)
- `createdAt`, `updatedAt`: timestamp

### 2. `/promoters/{promoterId}`
- `name`: string (2..100)
- `igUrl`: string (0..300)
- `verified`: boolean
- `createdAt`, `updatedAt`: timestamp

### 3. `/events/{eventId}`
- `title`: string (2..150)
- `artists`: array of strings
- `venueId`: string (references `/venues/{venueId}`)
- `promoterId`: string (references `/promoters/{promoterId}`)
- `startAt`: timestamp
- `priceText`: string (0..80)
- `genres`: array of strings
- `ticketUrl`: string (0..500)
- `igPostUrl`: string (0..500)
- `posterUrl`: string (optional, 0..1000)
- `status`: `"not_open"` | `"available"` | `"low"` | `"sold_out"` | `"cancelled"`
- `statusUpdatedAt`: timestamp
- `statusSource`: `"admin"`
- `createdAt`, `updatedAt`: timestamp

---

## Firestore Security Rules

Deployed in `firestore.rules`:
- **Venues**:
  - `read`: Public.
  - `write`: Admin only (`wantawachjz@gmail.com` with `email_verified == true`).
- **Promoters**:
  - `read`: Public.
  - `write`: Admin only (`wantawachjz@gmail.com` with `email_verified == true`).
- **Events**:
  - `read`: Public.
  - `write`: Admin only (`wantawachjz@gmail.com` with `email_verified == true`).

---

## Free-Tier Spark Quota Optimization
- Realtime queries order by `startAt` and are strictly bounded with `limit(80)`.
- Past events are filtered out client-side to minimize document reads.
- Zero Cloud Functions or Firebase Storage dependencies.

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Build for production
npm run build
```
Open [http://localhost:3000](http://localhost:3000) in your browser.
