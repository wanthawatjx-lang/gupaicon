/**
 * Seed script for gupaicon venues, promoters, and events
 * Run with: npx tsx scripts/seed.ts
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

async function runSeed() {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    console.error('Error: firebase-applet-config.json not found.');
    process.exit(1);
  }

  const rawConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const app = initializeApp(rawConfig);
  const db = getFirestore(app, rawConfig.firestoreDatabaseId);

  // 1. Seed Venues
  const venuesPath = path.resolve(process.cwd(), 'data/seed/venues.json');
  const venues = JSON.parse(fs.readFileSync(venuesPath, 'utf-8'));
  console.log(`Seeding ${venues.length} venues...`);
  for (const venue of venues) {
    const venueRef = doc(db, 'venues', venue.id);
    await setDoc(venueRef, {
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      address: venue.address,
      igUrl: venue.igUrl,
      mapsUrl: venue.mapsUrl,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`✓ Seeded Venue: ${venue.name}`);
  }

  // 2. Seed Promoters
  const promotersPath = path.resolve(process.cwd(), 'data/seed/promoters.json');
  const promoters = JSON.parse(fs.readFileSync(promotersPath, 'utf-8'));
  console.log(`Seeding ${promoters.length} promoters...`);
  for (const promoter of promoters) {
    const promoterRef = doc(db, 'promoters', promoter.id);
    await setDoc(promoterRef, {
      name: promoter.name,
      igUrl: promoter.igUrl,
      verified: promoter.verified,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`✓ Seeded Promoter: ${promoter.name}`);
  }

  // 3. Seed Events (relative to today: +3, +5, +8, +12, +20 days at 19:00 Asia/Bangkok)
  const sampleDayOffsets = [3, 5, 8, 12, 20];
  const baseNowMs = Date.now();
  const getRelativeSampleStartDate = (index: number): Date => {
    const offsetDays = sampleDayOffsets[index] ?? 3 + index * 4;
    const bkkNow = new Date(baseNowMs + 7 * 60 * 60 * 1000);
    const targetBkk = new Date(
      Date.UTC(bkkNow.getUTCFullYear(), bkkNow.getUTCMonth(), bkkNow.getUTCDate() + offsetDays)
    );
    const yyyy = targetBkk.getUTCFullYear();
    const mm = String(targetBkk.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(targetBkk.getUTCDate()).padStart(2, '0');
    return new Date(`${yyyy}-${mm}-${dd}T19:00:00+07:00`);
  };

  const eventsPath = path.resolve(process.cwd(), 'data/seed/events.json');
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  console.log(`Seeding ${events.length} events...`);
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const eventRef = doc(db, 'events', event.id);
    const startDate = getRelativeSampleStartDate(i);

    const payload: any = {
      title: event.title,
      artists: event.artists,
      venueId: event.venueId,
      promoterId: event.promoterId,
      startAt: Timestamp.fromDate(startDate),
      priceText: event.priceText,
      genres: event.genres,
      ticketUrl: event.ticketUrl,
      igPostUrl: event.igPostUrl,
      status: event.status,
      statusUpdatedAt: serverTimestamp(),
      statusSource: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (event.posterUrl) {
      payload.posterUrl = event.posterUrl;
    }
    await setDoc(eventRef, payload);
    console.log(`✓ Seeded Event: ${event.title} (${startDate.toISOString()})`);
  }

  console.log('Done! All sample venues, promoters, and events seeded successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed note:', err);
  process.exit(1);
});
