# gupaicon (กู้ภัยคอน)

A mobile-first web app map of indie / livehouse concerts and venues in Bangkok and Rangsit/Pathum Thani, Thailand.

Built with **React**, **TypeScript**, **Vite**, **Leaflet** with OpenStreetMap tiles, and **Firebase** (Firestore + Google Authentication). UI Language: English.

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
  - ⚫ **Grey** (`#52525b`): Venue has no upcoming shows or not open.

### 2. Date & Ticket Availability Filter Bar
- Quick segmented filter buttons: **All**, **Today**, **This week**, **This month**.
- Toggle switch: **Tickets only** (filters to shows with `available` or `low` ticket status).
- Map pin colors and counts react in real-time to active filters.

### 3. Venue Bottom Sheet
- Tapping any venue pin slides up a tactile music-poster bottom sheet.
- Direct links: **"Open in Maps"** (`mapsUrl`) and **"Instagram"** (`igUrl`).
- **Upcoming Concerts List**: Shows upcoming events hosted at the venue, sorted by date with past events hidden.
  - Formatted in `Asia/Bangkok` timezone.
  - Status badges: Green (Available), Yellow (Low), Red (Sold out), Grey (Not open / Cancelled).
  - Relative update label: `"updated X min ago"`.

### 4. Event Detail Sheet
- Tapping any concert event row opens full event details:
  - Event title, lineup / artists pills, and genres.
  - **Promoter / Collective**: with verified checkmark (`✓`) if verified, linking directly to promoter Instagram.
  - Date & Time in `Asia/Bangkok` timezone.
  - Ticket price description (`priceText`).
  - Status badge and last verified time.
  - **"Buy tickets"** button (`ticketUrl`, opens in new tab).
  - **"View IG post"** button (`igPostUrl`, opens in new tab as standard link, no embeds).

### 5. Extended Admin Console (`/admin` and `#/admin`)
- Accessible via the top bar shield button or direct `/admin` URL.
- **Google Sign-In**: Strictly restricted to `wantawachjz@gmail.com` with `email_verified == true`.
- **Events Management**:
  - Create, edit, and delete events.
  - Venue and Promoter dropdown selectors.
  - **One-Tap Status Switcher**: Instantly update ticket status (`available`, `low`, `sold_out`, `not_open`, `cancelled`) directly on the event row with instant timestamp updates.
- **Promoters Management**: Add, edit, and delete promoters (name, Instagram URL, verified toggle).
- **Venues Management**: Add, edit, and delete venues with coordinates presets.
- **1-Click Seed Button**: Seeds sample venues, promoters, and events.

### 6. Free-Tier Quota Optimization
- Real-time event queries are constrained with `orderBy('startAt', 'asc')` and `limit(80)` to prevent unbounded document reads.
- Venues and promoters are indexed relationally in client memory, avoiding repetitive roundtrips.
- Past events are filtered out efficiently without exceeding Firestore daily read limits.

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
- **Read**: Public read access for `venues`, `promoters`, and `events`.
- **Write**: Only verified email `wantawachjz@gmail.com` can create, update, or delete records.
- **Validation**: Strict schema checks, string length bounds, allowed fields, and valid status values.

---

## Sample Data & Seeding

Sample data files:
- `data/seed/venues.json`: 3 sample venues (Bangkok Central, Bang Sue, Rangsit).
- `data/seed/promoters.json`: 2 sample promoters (`SAMPLE Loud Wave Collective` [verified], `SAMPLE Rangsit DIY Sounds`).
- `data/seed/events.json`: 4 sample events across sample venues with various statuses (`available`, `low`, `sold_out`, `not_open`).

### How to Seed:
1. **Via Admin UI**: Navigate to `#/admin`, sign in with Google using `wantawachjz@gmail.com`, and click **"Seed All Samples"**.
2. **Via CLI**:
   ```bash
   npx tsx scripts/seed.ts
   ```

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
