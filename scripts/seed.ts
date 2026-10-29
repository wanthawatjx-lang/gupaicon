/**
 * Seed script for gupaicon venues
 * Run with: npx tsx scripts/seed.ts
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

  const seedPath = path.resolve(process.cwd(), 'data/seed/venues.json');
  const venues = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));

  console.log(`Seeding ${venues.length} venues to collection 'venues'...`);

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
    console.log(`✓ Seeded: ${venue.name} (${venue.lat}, ${venue.lng})`);
  }

  console.log('Done! Venues seeded successfully.');
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
