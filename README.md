# gupaicon (กู้ภัยคอน)

A mobile-first web app map of indie / livehouse concert venues in Bangkok and Rangsit/Pathum Thani, Thailand.

Built with **React**, **TypeScript**, **Vite**, **Leaflet** with OpenStreetMap tiles, and **Firebase** (Firestore + Google Authentication).

---

## Features (Prompt 1)

1. **Full-Screen Interactive Map**:
   - Centered on Bangkok (`13.80, 100.55`), zoom `11`.
   - Restricted boundaries to Bangkok and Rangsit / Pathum Thani (`13.40, 100.20` to `14.30, 100.95`).
   - Dark, minimal music-poster theme with CartoDB Dark Matter tiles powered by OpenStreetMap.
   - Visible attribution: `"© OpenStreetMap contributors © CARTO"`.
   - Custom vinyl/soundwave neon pins optimized for 390px mobile screens with 44px+ touch targets.

2. **Venue Details & Bottom Sheet**:
   - Real-time synchronization from Firestore collection `venues`.
   - Tapping any pin highlights the venue and opens a bottom sheet displaying:
     - Venue Name
     - Address / District
     - Lat/Lng coordinates
     - **"Open in Maps"** button (`mapsUrl`)
     - **"Instagram"** button (`igUrl`)

3. **Sample Venues & Seed Script**:
   - `data/seed/venues.json` contains 3 clearly labeled sample venues starting with `"SAMPLE"`:
     1. `SAMPLE Venue Alpha - Bangkok Central` (13.7563, 100.5018)
     2. `SAMPLE Livehouse Beta - Chatuchak / Bang Sue` (13.8050, 100.5500)
     3. `SAMPLE Underground Space Gamma - Rangsit` (13.9890, 100.6170)
   - Seedable with 1-click in the Admin Console or via CLI: `npx tsx scripts/seed.ts`.

4. **Admin Console (`/admin`)**:
   - Dedicated admin route accessed via `#/admin` or the top bar shield button.
   - "Sign in with Google" via Firebase Auth.
   - Authorization check: only `wantawachjz@gmail.com` (and development developer email) can add, edit, or delete venues.
   - Form with coordinate presets (Bangkok Center, Bang Sue, Rangsit) and validation.

5. **Hardened Firestore Security Rules**:
   - Anyone can read (`allow read: if true;`) from `/venues/{venueId}`.
   - Only verified admin email (`wantawachjz@gmail.com`) can write, update, or delete venues.
   - Validates required fields (`name`, `lat`, `lng`, `address`, `igUrl`, `mapsUrl`), string lengths, and numeric coordinate types.

---

## Project Structure

```
├── data/
│   └── seed/
│       └── venues.json         # 3 sample venues with Bangkok & Rangsit coordinates
├── scripts/
│   └── seed.ts                 # CLI seed script for populating Firestore venues
├── src/
│   ├── components/
│   │   ├── AdminPanel.tsx      # Google Sign-in and Venue Add/Edit/Delete form
│   │   ├── Header.tsx          # Branding and quick toggles
│   │   ├── Map.tsx             # Leaflet fullscreen map with custom pins & bounds
│   │   ├── VenueBottomSheet.tsx# Bottom sheet modal with Maps & Instagram buttons
│   │   └── VenueListDrawer.tsx # Mobile drawer to browse all venues by name
│   ├── services/
│   │   └── venueService.ts     # Firestore CRUD and real-time subscription
│   ├── types/
│   │   └── venue.ts            # TypeScript interfaces for Venue
│   ├── App.tsx                 # Root application component
│   ├── firebase.ts             # Firebase SDK initialization and error handler
│   ├── index.css               # Dark music-poster theme & Leaflet overrides
│   └── main.tsx                # App entry point
├── firebase-applet-config.json # Generated Firebase connection settings
├── firebase-blueprint.json     # Schema blueprint for Firestore
├── firestore.rules             # Deployed Firestore security rules
├── .env.example                # Example environment variables
└── README.md
```

---

## How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Firebase

In AI Studio, Firebase is automatically provisioned and configured in `firebase-applet-config.json`.

If running locally outside AI Studio:
1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** in test or production mode.
3. Enable **Authentication** and add **Google** as a Sign-in Provider.
4. Copy your web app configuration into `firebase-applet-config.json` in the root directory:
   ```json
   {
     "projectId": "your-project-id",
     "appId": "1:123456789:web:abcdef",
     "apiKey": "AIzaSy...",
     "authDomain": "your-project-id.firebaseapp.com",
     "firestoreDatabaseId": "(default)",
     "storageBucket": "your-project-id.firebasestorage.app",
     "messagingSenderId": "123456789"
   }
   ```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Seed Sample Venues

You can seed the sample venues in two ways:
- **Option A (Admin UI)**: Navigate to `#/admin`, sign in with Google using `wantawachjz@gmail.com`, and click **"Seed Sample Venues"**.
- **Option B (Terminal)**:
  ```bash
  npx tsx scripts/seed.ts
  ```

---

## Firebase Console Configuration Checklist

1. **Authentication -> Sign-in method**:
   - Ensure **Google** is enabled under Sign-in providers.
2. **Authentication -> Settings -> Authorized domains**:
   - Verify `localhost` and your deployment domain (e.g., `*.run.app`) are listed in Authorized Domains.
3. **Firestore Database -> Rules**:
   - Confirm rules are deployed from `firestore.rules`.
