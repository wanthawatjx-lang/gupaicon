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

  // 3. Seed Events
  const eventsPath = path.resolve(process.cwd(), 'data/seed/events.json');
  const events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  console.log(`Seeding ${events.length} events...`);
  for (const event of events) {
    const eventRef = doc(db, 'events', event.id);
    const startDate = new Date(event.startAt);
    const updatedDate = new Date(event.statusUpdatedAt);

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
      statusUpdatedAt: Timestamp.fromDate(updatedDate),
      statusSource: 'admin',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (event.posterUrl) {
      payload.posterUrl = event.posterUrl;
    }
    await setDoc(eventRef, payload);
    console.log(`✓ Seeded Event: ${event.title}`);
  }

  console.log('Done! All sample venues, promoters, and events seeded successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed note:', err);
  process.exit(1);
});
