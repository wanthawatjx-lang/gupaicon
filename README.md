# gupaicon (กู้ภัยคอน)

A mobile-first web app map of indie / livehouse concerts and venues in Bangkok and Rangsit/Pathum Thani, Thailand.

Built with **React**, **TypeScript**, **Vite**, **Leaflet** with OpenStreetMap tiles, and **Firebase** (Firestore + Google Authentication). Free-tier friendly (Spark Plan, no Cloud Functions, no Firebase Storage). UI Language: English.

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
- Toggle switch: **Tickets available only** (filters to shows with `available` or `low` ticket status).
- Map pin colors and counts react in real-time to active filters.

### 3. Venue Bottom Sheet
- Tapping any venue pin slides up a tactile music-poster bottom sheet.
- Direct links: **"Open in Maps"** (`mapsUrl`) and **"Instagram"** (`igUrl`).
- **Upcoming Concerts List**: Shows upcoming events hosted at the venue, sorted by date with past events hidden.
  - Formatted in `Asia/Bangkok` timezone.
  - Status badges: Green (Available), Yellow (Low), Red (Sold out), Grey (Not open / Cancelled).
  - Relative update label: `"updated X min ago"`.

### 4. Event Detail Sheet & Crowd-Reported Ticket Status
- Tapping any concert event row opens full event details:
  - Event title, lineup / artists pills, and genres.
  - **Promoter / Collective**: with verified checkmark (`✓`) linking directly to the Promoter Page (`#/promoter/{id}`) and Instagram.
  - Date & Time in `Asia/Bangkok` timezone.
  - Ticket price description (`priceText`).
  - Computed live status badge (Admin Verified, Verified by organizer, Crowd Confirmed, or Unconfirmed).
  - Secondary status note when crowd reports are newer: `"Organizer says: X (updated N min ago)"`.
  - **"Buy tickets"** button (`ticketUrl`, opens in new tab).
  - **"View IG post"** button (`igPostUrl`, opens in new tab as standard link, no embeds).
- **Crowd Reporting Section**:
  - Regular user Google Sign-in: anyone can sign in to submit reports.
  - 3 large tactile buttons: **Available**, **Low**, **Sold Out**.
  - Shows feedback: `"Thanks, you reported: X"` and allows changing it anytime.
  - Document ID equals user's `uid` (one report per user per event, new reports overwrite old ones).

### 5. Verified Organizer Accounts & Workflow
- **Application (`For Organizers`)**:
  - Signed-in users click "For organizers" to submit a verification request with:
    - Promoter / Collective Name
    - Official Instagram URL
    - Contact email
    - Short verification note (e.g., DM sent from official IG or link to official site)
  - Stored in `organizerRequests/{uid}` (doc ID = user `uid`). Users can check their status anytime (Pending / Approved / Rejected).
- **Admin Approval (`/admin` -> Organizers Tab)**:
  - Lists pending requests with applicant details and notes.
  - Admin approves by linking to an existing promoter or creating a new verified one (`verified: true`).
  - Writes to `organizers/{uid}` with `{ promoterId, email, approvedAt }`.
  - Admin can reject requests (`status: "rejected"`) or revoke active organizers (deletes `organizers/{uid}`).
- **Organizer Dashboard (`#/organizer`)**:
  - Dedicated console for approved organizers.
  - Displays only events belonging to their assigned `promoterId`.
  - Create, edit, and delete their own concert listings (promoterId is permanently locked).
  - **One-Tap Status Buttons**: Instantly update ticket availability (`Available`, `Low`, `Sold Out`, `Not Open`, `Cancelled`), updating `statusUpdatedAt` to server time and `statusSource` to `"organizer"`.

### 6. Promoter Profile Page (`#/promoter/{id}`)
- Accessible from any event detail sheet.
- Displays promoter name, verified organizer badge, official Instagram link, and complete list of upcoming & past concerts.

### 7. Client-Side Displayed Status Consensus Logic
Computed via `computeDisplayedStatus` in `src/utils/crowdStatusLogic.ts` (constants: `CROWD_AGREEMENT_THRESHOLD = 3`, `CROWD_REPORT_WINDOW_MS = 90 min`):
1. **Verified Priority**: Both `admin` and `organizer` count as verified. If a verified status was updated more recently than the newest crowd report:
   - For organizer: displays `"Verified by organizer • updated X min ago"` with blue shield.
   - For admin: displays `"Admin Verified • updated X min ago"` with green shield.
2. **Crowd Consensus**: If crowd reports are newer than the verified update, reports from the last 90 minutes are evaluated:
   - If ≥ 3 distinct users agree on the same status (`available`, `low`, or `sold_out`), that status is shown with `"Confirmed by N people • updated X min ago"`.
   - In addition, a secondary note is displayed underneath: `"Organizer says: X (updated N min ago)"`.
3. **Unconfirmed Fallback**: If fewer than 3 users agree, an `"Unconfirmed"` neutral badge is displayed with the latest report time and the secondary organizer note.

### 8. Extended Admin Console (`/admin` and `#/admin`)
- Accessible via the top bar shield button or direct `/admin` URL.
- **Google Sign-In**: Admin access strictly restricted to `wantawachjz@gmail.com` with `email_verified == true`.
- **4 Management Tabs**:
  - **Events**: Create, edit, delete, one-tap status updates, and 90m crowd report counts with spam cleanup.
  - **Venues**: Add, edit, and delete venues with coordinates.
  - **Promoters**: Add, edit, and delete promoters (with verified toggle).
  - **Organizers**: Review pending applications, approve (link existing or create new verified promoter), reject, or revoke organizer access.
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
- `statusSource`: `"admin"` | `"organizer"`
- `createdAt`, `updatedAt`: timestamp

### 4. `/events/{eventId}/reports/{uid}`
- `status`: string (`"available"` | `"low"` | `"sold_out"`)
- `createdAt`: timestamp

### 5. `/organizerRequests/{uid}`
- Document ID equals user's `uid`.
- `promoterName`: string (2..100)
- `igUrl`: string (0..300)
- `contactEmail`: string (0..150)
- `note`: string (0..1000)
- `status`: `"pending"` | `"approved"` | `"rejected"`
- `createdAt`: timestamp

### 6. `/organizers/{uid}`
- Document ID equals user's `uid`.
- `promoterId`: string (references `/promoters/{promoterId}`)
- `email`: string
- `approvedAt`: timestamp

---

## Firestore Security Rules

Deployed in `firestore.rules`:
- **Venues & Promoters**:
  - `read`: Public.
  - `write`: Admin only (`wantawachjz@gmail.com`).
- **Events**:
  - `read`: Public.
  - `create`: Admin OR verified organizer matching `promoterId` with `statusSource == 'organizer'`.
  - `update`: Admin OR verified organizer where `incoming().promoterId == existing().promoterId` and `statusSource == 'organizer'`.
  - `delete`: Admin OR verified organizer for that event's `promoterId`.
- **Reports Subcollection (`/events/{eventId}/reports/{uid}`)**:
  - `read`: Public.
  - `create`, `update`: Signed-in user where `request.auth.uid == uid`, valid status, `createdAt == request.time`.
  - `delete`: Report owner or admin.
- **Organizer Requests (`/organizerRequests/{uid}`)**:
  - `get`: User (`request.auth.uid == uid`) or Admin.
  - `list`: Admin only.
  - `create`: Signed-in user for their own UID with status `"pending"`.
  - `update`: Admin only.
  - `delete`: Owner or Admin.
- **Organizers (`/organizers/{uid}`)**:
  - `get`: User (`request.auth.uid == uid`) or Admin.
  - `list`: Admin only.
  - `write`: Admin only.

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
