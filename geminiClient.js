/**
 * geminiClient.js
 * 
 * Server-side Gemini API client with automatic multi-key rotation on HTTP 429 (Rate Limit).
 * Designed for public repositories:
 * - Collects multiple keys from process.env (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
 * - Automatically rotates to the next available key upon 429 / RESOURCE_EXHAUSTED errors
 * - Strict security: Raw API keys are masked and NEVER printed to logs or exposed to client-side
 * - Hard server-only guard prevents accidental client-side bundling
 */

import { GoogleGenAI } from '@google/genai';

// Guard against accidental client-side execution
if (typeof window !== 'undefined') {
  throw new Error('[GeminiClient] Security Violation: geminiClient is server-only and must never be loaded in browser/client-side code.');
}

/**
 * Mask an API key to safely identify it in logs without revealing the secret.
 * Example: "AIzaSyD...9xyz"
 * @param {string} key 
 * @returns {string}
 */
export function maskKey(key) {
  if (!key || typeof key !== 'string') return '[empty-key]';
  const trimmed = key.trim();
  if (trimmed.length <= 8) return '****';
  return `${trimmed.slice(0, 7)}...${trimmed.slice(-4)}`;
}

/**
 * Sanitize error messages and strings to prevent accidental leakage of API keys.
 * @param {any} err 
 * @returns {string}
 */
export function sanitizeError(err) {
  if (!err) return 'Unknown error';
  const msg = typeof err === 'string' ? err : (err.message || String(err));
  return msg
    .replace(/(key|apiKey|api_key|token)=([^\s&]+)/gi, '$1=[REDACTED]')
    .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
}

/**
 * Determine if an error is an HTTP 429 / Rate limit / Quota exhausted error.
 * @param {any} err 
 * @returns {boolean}
 */
export function isRateLimitError(err) {
  if (!err) return false;
  if (err.status === 429 || err.statusCode === 429 || err.response?.status === 429) {
    return true;
  }
  const str = (err.message || err.toString() || '').toUpperCase();
  return (
    str.includes('429') ||
    str.includes('RESOURCE_EXHAUSTED') ||
    str.includes('RATE_LIMIT') ||
    str.includes('RATE LIMIT') ||
    str.includes('QUOTA EXCEEDED') ||
    str.includes('QUOTA_EXCEEDED')
  );
}

/**
 * Multi-Key Gemini Client Manager
 */
export class GeminiMultiKeyClient {
  /**
   * @param {Object} [options]
   * @param {string[]} [options.apiKeys] - Explicit list of keys (optional)
   * @param {number} [options.cooldownMs] - Cooldown duration for exhausted keys (default: 60000ms)
   * @param {string} [options.userAgent] - User agent header (default: 'aistudio-build')
   */
  constructor(options = {}) {
    this.cooldownMs = options.cooldownMs ?? 60000;
    this.timeoutMs = options.timeoutMs ?? 10000;
    this.userAgent = options.userAgent || 'aistudio-build';
    
    // Discover keys from environment or options
    this.keys = this._loadKeys(options.apiKeys);
    this.currentIndex = 0;
    
    // Track key exhaustion cooldowns: keyIndex -> cooldownUntilTimestamp
    this.exhaustedUntil = new Map();
    
    // Cache initialized GoogleGenAI instances per key index
    this._clientCache = new Map();

    // Nested models proxy for standard @google/genai drop-in compatibility
    this.models = {
      generateContent: (params) => this.generateContent(params),
      generateContentStream: (params) => this.generateContentStream(params),
    };

    if (this.keys.length > 0) {
      console.log(`[GeminiClient] Initialized with ${this.keys.length} API key(s) in rotation pool.`);
    } else {
      console.warn('[GeminiClient] Warning: No Gemini API keys found. Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, or GEMINI_API_KEY.');
    }
  }

  /**
   * Discovers and normalizes API keys from environment variables.
   * Priority:
   * 1. Explicit keys passed to constructor
   * 2. GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
   * 3. GEMINI_API_KEY (single / default key)
   * 4. GEMINI_API_KEYS (comma-delimited list)
   * @private
   */
  _loadKeys(explicitKeys) {
    const discovered = [];

    if (Array.isArray(explicitKeys) && explicitKeys.length > 0) {
      discovered.push(...explicitKeys);
    }

    // Scan GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.
    const numberedKeyNames = Object.keys(process.env)
      .filter((k) => /^GEMINI_API_KEY_\d+$/i.test(k))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10);
        const numB = parseInt(b.replace(/\D/g, ''), 10);
        return numA - numB;
      });

    for (const keyName of numberedKeyNames) {
      const val = process.env[keyName];
      if (val && val.trim().length > 0) {
        discovered.push(val.trim());
      }
    }

    // Check GEMINI_API_KEY
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0) {
      discovered.push(process.env.GEMINI_API_KEY.trim());
    }

    // Check GEMINI_API_KEYS (comma separated)
    if (process.env.GEMINI_API_KEYS) {
      const splitKeys = process.env.GEMINI_API_KEYS.split(',').map((k) => k.trim()).filter(Boolean);
      discovered.push(...splitKeys);
    }

    // Deduplicate and filter out placeholders like "MY_GEMINI_API_KEY"
    const uniqueKeys = [];
    const seen = new Set();
    for (const k of discovered) {
      if (
        k &&
        k.length > 0 &&
        !seen.has(k) &&
        k !== 'MY_GEMINI_API_KEY' &&
        !k.includes('YourFirstGeminiApiKey')
      ) {
        seen.add(k);
        uniqueKeys.push(k);
      }
    }

    return uniqueKeys;
  }

  /**
   * Check if any API keys are loaded and ready.
   * @returns {boolean}
   */
  hasAvailableKey() {
    return this.keys.length > 0;
  }

  /**
   * Total number of configured keys.
   * @returns {number}
   */
  getKeyCount() {
    return this.keys.length;
  }

  /**
   * Get safe metadata about the keys in rotation without revealing raw values.
   * @returns {Object}
   */
  getStatus() {
    const now = Date.now();
    return {
      totalKeys: this.keys.length,
      currentActiveIndex: this.currentIndex,
      keys: this.keys.map((k, idx) => ({
        index: idx,
        masked: maskKey(k),
        isCurrent: idx === this.currentIndex,
        isRateLimited: (this.exhaustedUntil.get(idx) || 0) > now,
        cooldownRemainingMs: Math.max(0, (this.exhaustedUntil.get(idx) || 0) - now),
      })),
    };
  }

  /**
   * Find next eligible key index (skipping keys currently in cooldown if others exist).
   * @private
   */
  _pickNextIndex() {
    if (this.keys.length <= 1) return 0;
    const now = Date.now();
    
    // Check if subsequent keys are free of cooldown
    for (let offset = 1; offset <= this.keys.length; offset++) {
      const nextIdx = (this.currentIndex + offset) % this.keys.length;
      const cooldown = this.exhaustedUntil.get(nextIdx) || 0;
      if (now > cooldown) {
        return nextIdx;
      }
    }

    // If all are in cooldown, pick the one with earliest cooldown expiry
    let earliestIdx = (this.currentIndex + 1) % this.keys.length;
    let earliestTime = Infinity;
    for (let i = 0; i < this.keys.length; i++) {
      const cd = this.exhaustedUntil.get(i) || 0;
      if (cd < earliestTime) {
        earliestTime = cd;
        earliestIdx = i;
      }
    }
    return earliestIdx;
  }

  /**
   * Rotate active key to next in rotation pool.
   * @param {string} [reason]
   * @returns {number} New key index
   */
  rotateKey(reason = 'manual') {
    if (this.keys.length <= 1) return this.currentIndex;
    const oldIdx = this.currentIndex;
    this.currentIndex = this._pickNextIndex();
    console.log(
      `[GeminiClient] Rotated active API key from Key #${oldIdx + 1} (${maskKey(this.keys[oldIdx])}) to Key #${this.currentIndex + 1} (${maskKey(this.keys[this.currentIndex])}) [reason: ${reason}]`
    );
    return this.currentIndex;
  }

  /**
   * Retrieve GoogleGenAI SDK instance for a given key index.
   * @private
   */
  _getClientForIndex(index) {
    if (this._clientCache.has(index)) {
      return this._clientCache.get(index);
    }
    const key = this.keys[index];
    const client = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': this.userAgent,
        },
      },
    });
    this._clientCache.set(index, client);
    return client;
  }

  /**
   * Returns current active GoogleGenAI instance.
   * @returns {GoogleGenAI}
   */
  getActiveClient() {
    if (this.keys.length === 0) {
      throw new Error('[GeminiClient] No API keys available. Set GEMINI_API_KEY_1 or GEMINI_API_KEY.');
    }
    return this._getClientForIndex(this.currentIndex);
  }

  /**
   * Execute an operation with automatic retry & key rotation upon HTTP 429.
   * @template T
   * @param {(client: GoogleGenAI) => Promise<T>} operation
   * @returns {Promise<T>}
   */
  async executeWithRotation(operation) {
    if (this.keys.length === 0) {
      throw new Error('[GeminiClient] No Gemini API keys configured. Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, or GEMINI_API_KEY in environment variables.');
    }

    const attemptsMax = this.keys.length;
    let attempts = 0;
    let lastError = null;

    while (attempts < attemptsMax) {
      const activeIdx = this.currentIndex;
      const activeKeyMasked = maskKey(this.keys[activeIdx]);
      const client = this._getClientForIndex(activeIdx);

      try {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
          timer = setTimeout(() => {
            const tErr = new Error(`Gemini request timed out after ${this.timeoutMs}ms`);
            tErr.name = 'TimeoutError';
            reject(tErr);
          }, this.timeoutMs);
        });

        const result = await Promise.race([
          operation(client),
          timeoutPromise,
        ]).finally(() => clearTimeout(timer));

        return result;
      } catch (err) {
        lastError = err;

        if (isRateLimitError(err)) {
          // Mark key as exhausted with cooldown
          this.exhaustedUntil.set(activeIdx, Date.now() + this.cooldownMs);
          attempts++;

          if (attempts < attemptsMax) {
            console.warn(
              `[GeminiClient] HTTP 429 (Rate Limit) on Key #${activeIdx + 1} (${activeKeyMasked}). Rotating to next key (attempt ${attempts}/${attemptsMax})...`
            );
            this.rotateKey('HTTP 429 Rate Limit');
            // Small pause (150ms) before retrying on next key
            await new Promise((resolve) => setTimeout(resolve, 150));
            continue;
          } else {
            console.error(
              `[GeminiClient] All ${this.keys.length} configured API keys have encountered rate limits (HTTP 429).`
            );
            break;
          }
        }

        // Non-429 error: sanitize message and rethrow immediately
        const safeMsg = sanitizeError(err);
        console.error(`[GeminiClient] Request error on Key #${activeIdx + 1} (${activeKeyMasked}): ${safeMsg}`);
        throw new Error(safeMsg);
      }
    }

    // If loop exhausted with 429
    const exhaustedErr = new Error(
      `All ${this.keys.length} configured Gemini API keys hit rate limits (HTTP 429). Please wait a moment before retrying.`
    );
    exhaustedErr.code = 'ALL_KEYS_RATE_LIMITED';
    exhaustedErr.status = 429;
    exhaustedErr.totalKeys = this.keys.length;
    throw exhaustedErr;
  }

  /**
   * Drop-in replacement for ai.models.generateContent with automatic rotation.
   * @param {any} params 
   * @returns {Promise<any>}
   */
  async generateContent(params) {
    return this.executeWithRotation((client) => client.models.generateContent(params));
  }

  /**
   * Drop-in replacement for ai.models.generateContentStream with automatic rotation.
   * @param {any} params 
   * @returns {Promise<any>}
   */
  async generateContentStream(params) {
    return this.executeWithRotation((client) => client.models.generateContentStream(params));
  }
}

// Export default singleton instance
export const geminiClient = new GeminiMultiKeyClient();
export default geminiClient;
