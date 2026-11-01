import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { Type } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { geminiClient } from './geminiClient.js';

const ADMIN_EMAIL = 'wanthawatjx@gmail.com';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Initialize Firebase Admin SDK
const adminApp = getApps().length === 0
  ? initializeApp({
      projectId: firebaseConfig.projectId,
    })
  : getApps()[0];

const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(adminApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(adminApp);

const adminAuth = getAuth(adminApp);

// Initialize Gemini Client server-side with multi-key rotation and rate-limit resilience
const ai = geminiClient;

let isDiscovering = false;

// Helper to normalize string for matching/fingerprinting
function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^\w\u0E00-\u0E7F]/g, '')
    .trim();
}

// In-memory rate limiting map: ip -> { count: number, resetAt: number }
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const ipRateLimits = new Map<string, RateLimitRecord>();
const ipDiscoverLimits = new Map<string, RateLimitRecord>();

function checkRateLimit(
  map: Map<string, RateLimitRecord>,
  ip: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const record = map.get(ip);
  if (!record || now > record.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) {
    return false;
  }
  record.count++;
  return true;
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimits.entries()) {
    if (now > record.resetAt) ipRateLimits.delete(ip);
  }
  for (const [ip, record] of ipDiscoverLimits.entries()) {
    if (now > record.resetAt) ipDiscoverLimits.delete(ip);
  }
}, 60000);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '100kb' }));

  // GET /healthz - Public health check route
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // General rate limiter for /api/* routes (30 requests per minute per IP)
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ipRateLimits, ip, 30, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    next();
  });

  // Same-origin CORS enforcement for /api/* routes
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      const host = req.headers.host;
      try {
        const originUrl = new URL(origin);
        if (host && originUrl.host !== host) {
          return res.status(403).json({ error: 'Forbidden' });
        }
      } catch {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    next();
  });

  // Middleware to verify Firebase ID token and ensure admin access
  const verifyAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded.email !== ADMIN_EMAIL || decoded.email_verified !== true) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      (req as any).user = decoded;
      next();
    } catch {
      // Do not log token or detailed internal errors
      return res.status(403).json({ error: 'Forbidden' });
    }
  };

  // POST /api/discover - Admin AI event discovery endpoint
  app.post('/api/discover', verifyAdminAuth, async (req, res) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ipDiscoverLimits, ip, 5, 60000)) {
      return res.status(429).json({ error: 'Discovery rate limit exceeded. Please wait a minute.' });
    }

    if (isDiscovering) {
      return res.status(409).json({ error: 'Discovery job already in progress.' });
    }

    if (!ai.hasAvailableKey()) {
      return res.status(500).json({ error: 'Discovery service temporarily unavailable (no Gemini API keys configured).' });
    }

    // Validate body (must be empty or an object)
    if (req.body && typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid request payload.' });
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

      // Fetch existing events and drafts for duplicates & fingerprints
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
          } catch {
            continue;
          }

          if (!Array.isArray(extractedEvents)) continue;

          for (const raw of extractedEvents) {
            totalDiscovered++;
            // Required field validations & sanitizations
            if (!raw.sourceUrl || typeof raw.sourceUrl !== 'string' || !raw.sourceUrl.startsWith('https://')) continue;
            if (!raw.startAt || typeof raw.startAt !== 'string') continue;
            if (!raw.title || typeof raw.title !== 'string') continue;
            if (!raw.venueName || typeof raw.venueName !== 'string') continue;

            const cleanTitle = raw.title.trim().slice(0, 120);
            const cleanVenueName = raw.venueName.trim().slice(0, 100);
            const cleanSourceUrl = raw.sourceUrl.trim().slice(0, 500);

            if (cleanTitle.length === 0 || cleanVenueName.length === 0) continue;

            const startDate = new Date(raw.startAt);
            if (isNaN(startDate.getTime()) || startDate < now || startDate > maxDate) {
              continue;
            }

            // Ticket URL validation (must be https:// if present)
            let cleanTicketUrl: string | null = null;
            if (raw.ticketUrl && typeof raw.ticketUrl === 'string' && raw.ticketUrl.startsWith('https://')) {
              cleanTicketUrl = raw.ticketUrl.trim().slice(0, 500);
            }

            // Artists validation & sanitization
            const cleanArtists = Array.isArray(raw.artists)
              ? raw.artists
                  .map((a: any) => String(a).trim().slice(0, 80))
                  .filter(Boolean)
                  .slice(0, 20)
              : [];
            if (cleanArtists.length === 0) continue;

            // Genres validation & sanitization
            const cleanGenres = Array.isArray(raw.genres)
              ? raw.genres
                  .map((g: any) => String(g).trim().slice(0, 40))
                  .filter(Boolean)
                  .slice(0, 8)
              : [];

            // Match venue by normalized name
            const normVenueName = normalizeStr(cleanVenueName);
            let matchedVenueId: string | null = null;
            for (const v of venues) {
              const normV = normalizeStr(v.name);
              if (normV === normVenueName || normVenueName.includes(normV) || normV.includes(normVenueName)) {
                matchedVenueId = v.id;
                break;
              }
            }

            const dateStr = startDate.toISOString().split('T')[0];
            const fingerprint = `${normalizeStr(cleanTitle)}_${normVenueName}_${dateStr}`.slice(0, 200);

            const existsInDrafts = existingDrafts.some((d: any) => d.fingerprint === fingerprint);
            const existsInEvents = existingEvents.some((e: any) => {
              if (e.venueId !== matchedVenueId) return false;
              const eDate = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt);
              const timeDiff = Math.abs(eDate.getTime() - startDate.getTime());
              const sameTitle = normalizeStr(e.title) === normalizeStr(cleanTitle);
              return sameTitle && timeDiff < 7200000;
            });

            if (existsInDrafts || existsInEvents) continue;

            const confidence = Math.min(Math.max(Number(raw.confidence) || 0.5, 0), 1);
            const warnings: string[] = [];
            if (startDate < now) warnings.push('Past date');
            if (!matchedVenueId) warnings.push('Venue not found (needs manual venue assignment)');
            if (confidence < 0.6) warnings.push('Low confidence (< 0.6)');
            if (!cleanTicketUrl) warnings.push('Missing ticket URL');

            const possibleDuplicate = existingEvents.some((e: any) => {
              const eDate = e.startAt?.toDate ? e.startAt.toDate() : new Date(e.startAt);
              const timeDiff = Math.abs(eDate.getTime() - startDate.getTime());
              return timeDiff < 7200000;
            });
            if (possibleDuplicate) warnings.push('Possible duplicate event time/venue');

            const draftId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const draftDoc = {
              title: cleanTitle,
              artists: cleanArtists,
              venueName: cleanVenueName,
              promoterName: raw.promoterName ? String(raw.promoterName).trim().slice(0, 100) : null,
              startAt: raw.startAt,
              priceText: raw.priceText ? String(raw.priceText).trim().slice(0, 60) : null,
              genres: cleanGenres,
              ticketUrl: cleanTicketUrl,
              sourceUrl: cleanSourceUrl,
              sourceName: String(source.name || 'Web Source').slice(0, 100),
              confidence,
              notes: raw.notes ? String(raw.notes).trim().slice(0, 500) : null,
              warnings,
              matchedVenueId,
              fingerprint,
              reviewStatus: 'pending',
              createdAt: FieldValue.serverTimestamp(),
            };

            await db.collection('eventDrafts').doc(draftId).set(draftDoc);
            existingDrafts.push(draftDoc);
            totalSaved++;
          }
        } catch {
          // Log only generic notice, no secrets
          console.warn(`Could not process source: ${source.id}`);
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
      if (err?.code === 'ALL_KEYS_RATE_LIMITED' || err?.status === 429) {
        return res.status(429).json({
          error: 'All configured Gemini API keys have reached rate limits (429). Please wait a few minutes or add more keys in .env.',
          code: 'ALL_KEYS_RATE_LIMITED',
        });
      }
      return res.status(500).json({ error: 'Discovery operation failed' });
    }
  });

  // In-memory cache for event previews (2 hours TTL)
  const previewCache = new Map<string, { data: any; expiresAt: number }>();

  // POST /api/event-preview - AI-Powered Event & Venue Vibe Breakdown using geminiClient
  app.post('/api/event-preview', async (req, res) => {
    const cleanLang: 'en' | 'th' = req.body?.lang === 'en' ? 'en' : 'th';
    try {
      const { title, artists, venueName, genres, startAt } = req.body || {};

      if (!title || typeof title !== 'string') {
        return res.status(400).json({ error: 'Event title is required.' });
      }

      if (!ai.hasAvailableKey()) {
        return res.status(503).json({ error: 'AI preview service is currently unavailable.' });
      }

      const cleanTitle = String(title).slice(0, 150).trim();
      const cleanVenue = String(venueName || 'Bangkok Livehouse').slice(0, 100).trim();
      const cleanArtists = Array.isArray(artists)
        ? artists.slice(0, 10).map((a) => String(a).slice(0, 80)).join(', ')
        : '';
      const cleanGenres = Array.isArray(genres)
        ? genres.slice(0, 5).map((g) => String(g).slice(0, 40)).join(', ')
        : 'Indie';

      const cacheKey = `${cleanTitle}_${cleanVenue}_${cleanLang}`.toLowerCase().replace(/\s+/g, '_');
      const cached = previewCache.get(cacheKey);
      if (cached && Date.now() < cached.expiresAt) {
        return res.json({ success: true, preview: cached.data, cached: true });
      }

      const prompt = `You are a Bangkok indie music scene curator and gig expert for the 'gupaicon (กูไปคอน)' app.
Generate an engaging, concise concert vibe preview for this show:
- Event: "${cleanTitle}"
- Artists: ${cleanArtists || 'Various Indie Artists'}
- Venue: ${cleanVenue}
- Genres: ${cleanGenres}
- Date/Time: ${startAt || 'Upcoming'}

Language: ${cleanLang === 'th' ? 'Thai (ภาษาไทย, โทนคอดนตรีอินดี้ ชวนตื่นเต้น เป็นกันเอง สั้นกระชับ)' : 'English (authentic indie gig guide style, punchy & concise)'}.
Provide:
1. vibeSummary: A captivating 1-2 sentence description of the musical atmosphere and energy.
2. lineupHighlights: 2 to 3 short bullet points highlighting the sound or key standout traits of the performing acts.
3. crowdAtmosphere: A short phrase describing the crowd vibe (e.g. shoegaze sway, energetic mosh, intimate acoustic listeners).
4. practicalTip: 1 practical insider tip for attendees (transport, arrival time, or venue advice).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              vibeSummary: { type: Type.STRING, description: '1-2 sentence atmosphere summary' },
              lineupHighlights: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '2-3 artist/lineup highlights',
              },
              crowdAtmosphere: { type: Type.STRING, description: 'Crowd vibe description' },
              practicalTip: { type: Type.STRING, description: '1 practical attendee tip' },
            },
            required: ['vibeSummary', 'lineupHighlights', 'crowdAtmosphere', 'practicalTip'],
          },
        },
      });

      const text = response.text ? response.text.trim() : '{}';
      let previewData: any;
      try {
        previewData = JSON.parse(text);
      } catch {
        previewData = {
          vibeSummary:
            cleanLang === 'th'
              ? 'การแสดงดนตรีสดสุดพิเศษในบรรยากาศไลฟ์เฮาส์สุดเข้มข้น'
              : 'An authentic live indie music night in Bangkok.',
          lineupHighlights: [cleanArtists || cleanTitle],
          crowdAtmosphere:
            cleanLang === 'th'
              ? 'แฟนเพลงอินดี้และคนรักดนตรีสดตัวจริง'
              : 'Indie music lovers and gig-goers',
          practicalTip:
            cleanLang === 'th'
              ? 'แนะนำมาถึงก่อนเวลาเพื่อจับจองที่หน้าเวที'
              : 'Arrive early for a great view near the stage',
        };
      }

      previewCache.set(cacheKey, { data: previewData, expiresAt: Date.now() + 7200000 });
      return res.json({ success: true, preview: previewData });
    } catch (err: any) {
      console.warn('[EventPreview] Generation error handled:', err?.message || 'Error');
      if (err?.code === 'ALL_KEYS_RATE_LIMITED' || err?.status === 429) {
        return res.status(429).json({
          error:
            cleanLang === 'en'
              ? 'All Gemini API keys are currently rate-limited (HTTP 429). Please wait a moment before retrying.'
              : 'โควตา Gemini API กำลังติด Rate Limit (429) ทุกคีย์ กรุณารอสักครู่แล้วกดลองใหม่',
          code: 'ALL_KEYS_RATE_LIMITED',
        });
      }
      return res.status(500).json({
        error:
          cleanLang === 'en'
            ? 'Failed to generate event preview. Please try again.'
            : 'ไม่สามารถสร้างพรีวิวได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง',
      });
    }
  });

  // Client Serving: Production static files or Vite dev middleware
  const distPath = path.join(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html'));

  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
