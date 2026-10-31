import express from 'express';
import { createServer as createViteServer } from 'vite';
import admin from 'firebase-admin';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Admin SDK
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = (admin as any).firestore();
const adminAuth = (admin as any).auth();

// Initialize Gemini Client server-side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

let isDiscovering = false;

// Helper to normalize string for matching/fingerprinting
function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\u0E00-\u0E7F]/g, '')
    .trim();
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // Middleware to verify admin token
  const verifyAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ error: 'Unauthorized: missing authorization token' });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded.email !== 'wanthawatjx@gmail.com' || decoded.email_verified !== true) {
        return res.status(403).json({ error: 'Forbidden: admin access required for wanthawatjx@gmail.com' });
      }
      (req as any).user = decoded;
      next();
    } catch (err: any) {
      console.error('Token verification error:', err);
      return res.status(403).json({ error: 'Unauthorized: invalid token' });
    }
  };

  // POST /api/discover endpoint
  app.post('/api/discover', verifyAdminAuth, async (req, res) => {
    if (isDiscovering) {
      return res.status(409).json({ error: 'Discovery job already in progress.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY environment secret is not configured.' });
    }

    isDiscovering = true;
    try {
      // 1. Fetch active sources
      const sourcesSnapshot = await db.collection('sources').where('active', '==', true).get();
      const sources = sourcesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

      if (sources.length === 0) {
        isDiscovering = false;
        return res.json({ success: true, message: 'No active sources found.', discoveredCount: 0, savedCount: 0 });
      }

      // Limit at most 15 Gemini calls per run
      const sourcesToRun = sources.slice(0, 15);

      // Fetch existing venues for matching
      const venuesSnapshot = await db.collection('venues').get();
      const venues = venuesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

      // Fetch existing events and existing drafts to check duplicates & fingerprints
      const eventsSnapshot = await db.collection('events').get();
      const existingEvents = eventsSnapshot.docs.map((d: any) => d.data());

      const draftsSnapshot = await db.collection('eventDrafts').get();
      const existingDrafts = draftsSnapshot.docs.map((d: any) => d.data());

      let totalDiscovered = 0;
      let totalSaved = 0;
      const now = new Date();
      const maxDate = new Date(now.getTime() + 90 * 86400000); // 90 days ahead

      for (const source of sourcesToRun) {
        try {
          const prompt = `Search for upcoming indie and live music concerts, gigs, and livehouse events in Bangkok and Pathum Thani (Thailand) based on this source: "${source.name}" (${source.value}). 
Only include events with start dates from today (${now.toISOString().split('T')[0]}) up to 90 days ahead. 
Rules: Never invent any field, use null when unknown, never guess coordinates, skip events without a clear date, only use public web pages, do not use or imitate Instagram scraping, do not bypass logins or paywalls. Return a JSON array of events.`;

          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }, { urlContext: {} }],
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: 'Event title' },
                    artists: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Artists performing' },
                    venueName: { type: Type.STRING, description: 'Name of venue in Bangkok or Pathum Thani' },
                    promoterName: { type: Type.STRING, description: 'Promoter or organizer name if known' },
                    startAt: { type: Type.STRING, description: 'Start date and time in ISO format with +07:00' },
                    priceText: { type: Type.STRING, description: 'Ticket price text e.g. 350 THB' },
                    genres: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Musical genres' },
                    ticketUrl: { type: Type.STRING, description: 'Official ticket booking URL' },
                    sourceUrl: { type: Type.STRING, description: 'Required public source page URL' },
                    confidence: { type: Type.NUMBER, description: 'Confidence score between 0 and 1' },
                    notes: { type: Type.STRING, description: 'Additional details or ticket status notes' },
                  },
                  required: ['title', 'artists', 'venueName', 'startAt', 'genres', 'sourceUrl', 'confidence'],
                },
              },
            },
          });

          const jsonText = response.text ? response.text.trim() : '[]';
          let extractedEvents: any[] = [];
          try {
            extractedEvents = JSON.parse(jsonText);
          } catch (parseErr) {
            console.error('Failed to parse Gemini response JSON for source:', source.name, parseErr);
            continue;
          }

          if (!Array.isArray(extractedEvents)) continue;

          for (const raw of extractedEvents) {
            totalDiscovered++;
            if (!raw.sourceUrl || !raw.startAt || !raw.title || !raw.venueName) continue;

            const startDate = new Date(raw.startAt);
            if (isNaN(startDate.getTime()) || startDate < now || startDate > maxDate) {
              continue;
            }

            // Match venue by normalized name
            const normVenueName = normalizeStr(raw.venueName);
            let matchedVenueId: string | null = null;
            for (const v of venues) {
              if (normalizeStr(v.name) === normVenueName || normVenueName.includes(normalizeStr(v.name)) || normalizeStr(v.name).includes(normVenueName)) {
                matchedVenueId = v.id;
                break;
              }
            }

            const dateStr = startDate.toISOString().split('T')[0];
            const fingerprint = `${normalizeStr(raw.title)}_${normVenueName}_${dateStr}`;

            const existsInDrafts = existingDrafts.some((d: any) => d.fingerprint === fingerprint);
            const existsInEvents = existingEvents.some((e: any) => {
              if (e.venueId !== matchedVenueId) return false;
              const eDate = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt);
              const timeDiff = Math.abs(eDate.getTime() - startDate.getTime());
              const sameTitle = normalizeStr(e.title) === normalizeStr(raw.title);
              return sameTitle && timeDiff < 7200000;
            });

            if (existsInDrafts || existsInEvents) continue;

            const warnings: string[] = [];
            if (startDate < now) warnings.push('Past date');
            if (!matchedVenueId) warnings.push('Venue not found (needs manual venue assignment)');
            if (Number(raw.confidence) < 0.6) warnings.push('Low confidence (< 0.6)');
            if (!raw.ticketUrl) warnings.push('Missing ticket URL');

            const possibleDuplicate = existingEvents.some((e: any) => {
              const eDate = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt);
              const timeDiff = Math.abs(eDate.getTime() - startDate.getTime());
              return timeDiff < 7200000;
            });
            if (possibleDuplicate) warnings.push('Possible duplicate event time/venue');

            const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const draftDoc = {
              title: String(raw.title).trim(),
              artists: Array.isArray(raw.artists) ? raw.artists.map(String) : [],
              venueName: String(raw.venueName).trim(),
              promoterName: raw.promoterName ? String(raw.promoterName).trim() : null,
              startAt: raw.startAt,
              priceText: raw.priceText ? String(raw.priceText).trim() : null,
              genres: Array.isArray(raw.genres) ? raw.genres.map(String) : [],
              ticketUrl: raw.ticketUrl ? String(raw.ticketUrl).trim() : null,
              sourceUrl: String(raw.sourceUrl).trim(),
              sourceName: source.name,
              confidence: Number(raw.confidence ?? 0.5),
              notes: raw.notes ? String(raw.notes).trim() : null,
              warnings,
              matchedVenueId,
              fingerprint,
              reviewStatus: 'pending',
              createdAt: (admin as any).firestore.FieldValue.serverTimestamp(),
            };

            await db.collection('eventDrafts').doc(draftId).set(draftDoc);
            existingDrafts.push(draftDoc);
            totalSaved++;
          }
        } catch (sourceErr) {
          console.error(`Error processing source ${source.name}:`, sourceErr);
        }
      }

      isDiscovering = false;
      return res.json({
        success: true,
        discoveredCount: totalDiscovered,
        savedCount: totalSaved,
      });
    } catch (err: any) {
      isDiscovering = false;
      console.error('Discovery error:', err);
      return res.status(500).json({ error: err?.message || 'Discovery process failed.' });
    }
  });

  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
