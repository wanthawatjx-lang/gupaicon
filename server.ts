import express from 'express';
import { createServer as createViteServer } from 'vite';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
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

// Initialize Gemini Client server-side (single GEMINI_API_KEY)
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
const userPreviewLimits = new Map<string, RateLimitRecord>();

// Server-wide daily Gemini preview calls tracker (max 200/day)
let serverDailyPreviewCalls = 0;
let serverDailyPreviewDay = new Date().toISOString().slice(0, 10);

function getDailyPreviewCalls(): number {
  const currentDay = new Date().toISOString().slice(0, 10);
  if (serverDailyPreviewDay !== currentDay) {
    serverDailyPreviewDay = currentDay;
    serverDailyPreviewCalls = 0;
  }
  return serverDailyPreviewCalls;
}

function incrementDailyPreviewCalls(): void {
  getDailyPreviewCalls();
  serverDailyPreviewCalls++;
}

// In-memory cache for event previews (24 hours TTL)
const previewCache = new Map<string, { data: any; expiresAt: number }>();

// Accepts startAt only if ISO 8601 with an explicit offset; if no offset, treats as Asia/Bangkok (+07:00)
function parseAndNormalizeDiscoverDate(rawStartAt: any): { date: Date; isoBangkok: string } | null {
  if (!rawStartAt || typeof rawStartAt !== 'string') return null;
  const s = rawStartAt.trim();
  if (!s) return null;

  // Date-only: treat as 20:00:00 in Asia/Bangkok (+07:00)
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const calCheck = new Date(Date.UTC(year, month - 1, day));
    if (
      calCheck.getUTCFullYear() !== year ||
      calCheck.getUTCMonth() !== month - 1 ||
      calCheck.getUTCDate() !== day
    ) {
      return null;
    }
    const isoBangkok = `${s}T20:00:00+07:00`;
    const date = new Date(isoBangkok);
    return isNaN(date.getTime()) ? null : { date, isoBangkok };
  }

  // Date-time with optional seconds, fractional seconds, and optional offset
  const dtMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,9})?)?(Z|[+-]\d{2}(?::?\d{2})?)?$/i.exec(
    s
  );
  if (!dtMatch) return null;

  const year = Number(dtMatch[1]);
  const month = Number(dtMatch[2]);
  const day = Number(dtMatch[3]);
  const hour = Number(dtMatch[4]);
  const minute = Number(dtMatch[5]);
  const second = dtMatch[6] !== undefined ? Number(dtMatch[6]) : 0;
  const frac = dtMatch[7] || '';
  const rawOffset = dtMatch[8];

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  const calCheck = new Date(Date.UTC(year, month - 1, day));
  if (
    calCheck.getUTCFullYear() !== year ||
    calCheck.getUTCMonth() !== month - 1 ||
    calCheck.getUTCDate() !== day
  ) {
    return null;
  }

  let normalizedOffset = '+07:00';
  if (rawOffset) {
    if (rawOffset.toUpperCase() === 'Z') {
      normalizedOffset = 'Z';
    } else {
      const sign = rawOffset[0];
      const digits = rawOffset.slice(1).replace(':', '');
      const offHour = Number(digits.slice(0, 2));
      const offMin = digits.length >= 4 ? Number(digits.slice(2, 4)) : 0;
      if (offHour > 23 || offMin > 59) return null;
      normalizedOffset = `${sign}${String(offHour).padStart(2, '0')}:${String(offMin).padStart(2, '0')}`;
    }
  }

  const isoInput = `${dtMatch[1]}-${dtMatch[2]}-${dtMatch[3]}T${dtMatch[4]}:${dtMatch[5]}:${String(second).padStart(2, '0')}${frac}${normalizedOffset}`;
  const date = new Date(isoInput);
  if (isNaN(date.getTime())) return null;

  const bkkMs = date.getTime() + 7 * 60 * 60 * 1000;
  const isoBangkok = new Date(bkkMs).toISOString().slice(0, 19) + '+07:00';
  return { date, isoBangkok };
}

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

// Clean up old rate limit and cache records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of ipRateLimits.entries()) {
    if (now > record.resetAt) ipRateLimits.delete(ip);
  }
  for (const [ip, record] of ipDiscoverLimits.entries()) {
    if (now > record.resetAt) ipDiscoverLimits.delete(ip);
  }
  for (const [userId, record] of userPreviewLimits.entries()) {
    if (now > record.resetAt) userPreviewLimits.delete(userId);
  }
  for (const [cacheKey, entry] of previewCache.entries()) {
    if (now >= entry.expiresAt) previewCache.delete(cacheKey);
  }
}, 60000);

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);

  const distPath = path.join(__dirname, 'dist');
  const isProduction = process.env.NODE_ENV === 'production';

  // Security Headers Middleware (production only, so development preview iframe embedding is never blocked)
  if (isProduction) {
    app.use((req, res, next) => {
      const csp = [
        "default-src 'self'",
        "script-src 'self' https://apis.google.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com",
        "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://www.googleapis.com wss://*.firebaseio.com",
        "frame-src 'self' https://*.firebaseapp.com https://accounts.google.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; ');

      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      next();
    });
  }

  app.use(express.json({ limit: '20kb' }));

  // Handle malformed or oversized JSON payloads cleanly without stack traces
  app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({ error: 'Request payload too large.', code: 'PAYLOAD_TOO_LARGE' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON payload.', code: 'INVALID_JSON' });
    }
    next(err);
  });

  // GET /healthz - Public health check route
  app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // General rate limiter for /api/* routes (30 requests per minute per IP)
  app.use('/api', (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(ipRateLimits, ip, 30, 60000)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' });
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
          return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
        }
      } catch {
        return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
    }
    next();
  });

  // Middleware to verify Firebase ID token and ensure admin access
  const verifyAdminAuth = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (decoded.email !== ADMIN_EMAIL || decoded.email_verified !== true) {
        return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
      }
      (req as any).user = decoded;
      next();
    } catch {
      // Do not log token or detailed internal errors
      return res.status(403).json({ error: 'Forbidden', code: 'FORBIDDEN' });
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
      return res.status(500).json({ error: 'Discovery service temporarily unavailable (GEMINI_API_KEY is not configured).' });
    }

    // Validate body (must be empty or a plain object)
    if (req.body && (typeof req.body !== 'object' || Array.isArray(req.body))) {
      return res.status(400).json({ error: 'Invalid request payload.' });
    }

    isDiscovering = true;
    try {
      // 1. Fetch active sources (bounded)
      const sourcesSnapshot = await db.collection('sources').where('active', '==', true).limit(50).get();
      const sources = sourcesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

      if (sources.length === 0) {
        isDiscovering = false;
        return res.json({ success: true, message: 'No active sources found.', discoveredCount: 0, savedCount: 0 });
      }

      // Limit at most 15 Gemini calls per run
      const sourcesToRun = sources.slice(0, 15);

      // Fetch existing venues, events, and drafts (bounded)
      const venuesSnapshot = await db.collection('venues').limit(200).get();
      const venues = venuesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })) as any[];

      const eventsSnapshot = await db.collection('events').limit(300).get();
      const existingEvents = eventsSnapshot.docs.map((d: any) => d.data());

      const draftsSnapshot = await db.collection('eventDrafts').limit(300).get();
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

            const parsedDate = parseAndNormalizeDiscoverDate(raw.startAt);
            if (!parsedDate) continue;
            const startDate = parsedDate.date;
            if (startDate < now || startDate > maxDate) {
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
              startAt: parsedDate.isoBangkok,
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
      if (err?.code === 'RATE_LIMITED' || err?.code === 'ALL_KEYS_RATE_LIMITED' || err?.status === 429) {
        return res.status(429).json({
          error: 'Gemini API rate limit exceeded (429). Please wait a few minutes and try again. / โควตา Gemini API เต็มชั่วคราว (429) กรุณารอสักครู่แล้วลองใหม่',
          code: 'RATE_LIMITED',
        });
      }
      return res.status(500).json({ error: 'Discovery operation failed' });
    }
  });

  // POST /api/event-preview - AI-Powered Event & Venue Vibe Breakdown using geminiClient
  app.post('/api/event-preview', async (req, res) => {
    // 1. Require a signed-in user via Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Sign in required' });
    }
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Sign in required' });
    }

    let decodedUser: DecodedIdToken;
    try {
      decodedUser = await adminAuth.verifyIdToken(token);
    } catch {
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // 2. Client sends only { eventId, lang }
    const { eventId, lang } = req.body || {};
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      return res.status(400).json({ error: 'Invalid eventId' });
    }
    if (lang !== 'th' && lang !== 'en') {
      return res.status(400).json({ error: 'Language must be "th" or "en"' });
    }
    const cleanLang: 'th' | 'en' = lang;
    const cleanEventId = eventId.trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(cleanEventId)) {
      return res.status(400).json({ error: 'Invalid eventId format' });
    }

    // 3. User limit: 10 previews per hour
    const userId = decodedUser.uid;
    if (!checkRateLimit(userPreviewLimits, userId, 10, 3600000)) {
      return res.status(429).json({
        error:
          cleanLang === 'en'
            ? 'You have reached your limit of 10 AI previews per hour. Please try again later.'
            : 'คุณใช้งานพรีวิวครบโควตา 10 ครั้งต่อชั่วโมงแล้ว กรุณาลองใหม่อีกครั้งในภายหลัง',
        code: 'USER_HOURLY_LIMIT_EXCEEDED',
      });
    }

    // 4. Cache check: 24 hours TTL by eventId + lang
    const cacheKey = `${cleanEventId}_${cleanLang}`;
    const cached = previewCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ success: true, preview: cached.data, cached: true });
    }

    try {
      // 5. Read event and its venue name from Firestore itself
      const eventDoc = await db.collection('events').doc(cleanEventId).get();
      if (!eventDoc.exists) {
        return res.status(404).json({
          error: cleanLang === 'en' ? 'Event not found' : 'ไม่พบข้อมูลคอนเสิร์ตนี้',
        });
      }
      const eventData = eventDoc.data() as any;

      let startMs: number | null = null;
      if (eventData.startAt?.toMillis) {
        startMs = eventData.startAt.toMillis();
      } else if (eventData.startAt?.toDate) {
        startMs = eventData.startAt.toDate().getTime();
      } else if (typeof eventData.startAt === 'string') {
        startMs = parseAndNormalizeDiscoverDate(eventData.startAt)?.date.getTime() ?? null;
      }

      if (!startMs || isNaN(startMs) || startMs < Date.now()) {
        return res.status(404).json({
          error:
            cleanLang === 'en'
              ? 'Event is in the past or not found'
              : 'คอนเสิร์ตนี้ผ่านไปแล้วหรือไม่พบข้อมูล',
        });
      }

      let venueName = 'Bangkok Livehouse';
      if (eventData.venueId) {
        try {
          const venueDoc = await db.collection('venues').doc(eventData.venueId).get();
          if (venueDoc.exists && venueDoc.data()?.name) {
            venueName = venueDoc.data()!.name;
          }
        } catch {
          // ignore
        }
      }

      // 6. Check server daily limit: 200 Gemini preview calls per day
      if (getDailyPreviewCalls() >= 200) {
        return res.status(429).json({
          error:
            cleanLang === 'en'
              ? 'Daily server limit for AI previews has been reached (200 calls/day). Please try again tomorrow.'
              : 'โควตาพรีวิวคอนเสิร์ตประจำวันของระบบเต็มแล้ว (200 ครั้ง/วัน) กรุณาลองใหม่พรุ่งนี้',
          code: 'DAILY_SERVER_LIMIT_EXCEEDED',
        });
      }

      if (!ai.hasAvailableKey()) {
        return res.status(503).json({
          error:
            cleanLang === 'en'
              ? 'AI preview service is currently unavailable.'
              : 'บริการ AI preview ยังไม่พร้อมใช้งาน',
        });
      }

      incrementDailyPreviewCalls();

      // Build prompt ONLY from stored fields (ignore any text supplied by client)
      const cleanTitle = String(eventData.title || '').trim().slice(0, 150);
      const cleanArtists = Array.isArray(eventData.artists)
        ? eventData.artists.slice(0, 10).map((a: any) => String(a).slice(0, 80)).join(', ')
        : '';
      const cleanGenres = Array.isArray(eventData.genres)
        ? eventData.genres.slice(0, 5).map((g: any) => String(g).slice(0, 40)).join(', ')
        : 'Indie';
      const formattedDate = new Date(startMs).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

      const prompt = `You are a Bangkok indie music scene curator and gig expert for the 'gupaicon (กูไปคอน)' app.
Generate an engaging, concise concert vibe preview for this show:
- Event: "${cleanTitle}"
- Artists: ${cleanArtists || 'Various Indie Artists'}
- Venue: ${venueName}
- Genres: ${cleanGenres}
- Date/Time: ${formattedDate}

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

      // Cache 24 hours
      previewCache.set(cacheKey, { data: previewData, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
      return res.json({ success: true, preview: previewData });
    } catch (err: any) {
      if (err?.code === 'RATE_LIMITED' || err?.code === 'ALL_KEYS_RATE_LIMITED' || err?.status === 429) {
        return res.status(429).json({
          error:
            cleanLang === 'en'
              ? 'Gemini API rate limit exceeded (HTTP 429). Please wait a moment before retrying.'
              : 'โควตา Gemini API เต็มชั่วคราว (429) กรุณารอสักครู่แล้วกดลองใหม่',
          code: 'RATE_LIMITED',
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

  // API-only 404 handler: any unmatched /api or /api/* route returns JSON, never HTML
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
  });

  // Client Serving: Production static files or Vite dev middleware (after all /api routes)
  if (isProduction) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found', code: 'NOT_FOUND' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Final Express error handler: always return JSON { error, code }, never HTML
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (res.headersSent) {
      return;
    }
    if (err?.type === 'entity.too.large' || err?.status === 413) {
      return res.status(413).json({ error: 'Request payload too large.', code: 'PAYLOAD_TOO_LARGE' });
    }
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ error: 'Invalid JSON payload.', code: 'INVALID_JSON' });
    }
    const status =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
    const code = typeof err?.code === 'string' && err.code ? err.code : 'INTERNAL_ERROR';
    return res.status(status).json({
      error: status === 500 ? 'Internal server error' : err?.message || 'Request failed',
      code,
    });
  });

  const PORT = isProduction ? Number(process.env.PORT) || 3000 : 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer();
