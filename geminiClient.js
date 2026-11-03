/**
 * geminiClient.js
 * 
 * Simplified server-side Gemini API client.
 * Uses a single server-side GEMINI_API_KEY environment variable.
 * Strict security:
 * - Server-only execution guard
 * - NEVER prints or logs any API key (not even masked)
 * - 429 rate-limit handling with friendly TH/EN error message
 */

import { GoogleGenAI } from '@google/genai';

// Guard against accidental client-side execution
if (typeof window !== 'undefined') {
  throw new Error('[GeminiClient] Security Violation: geminiClient is server-only and must never be loaded in browser/client-side code.');
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
 * Sanitize error messages and strings to prevent accidental leakage of sensitive query parameters.
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

export class GeminiClient {
  constructor(options = {}) {
    this.userAgent = options.userAgent || 'aistudio-build';
    this.timeoutMs = options.timeoutMs ?? 15000;
    this._client = null;

    // Drop-in compatible models interface
    this.models = {
      generateContent: (params) => this.generateContent(params),
      generateContentStream: (params) => this.generateContentStream(params),
    };
  }

  /**
   * Returns whether a valid GEMINI_API_KEY is configured.
   * @returns {boolean}
   */
  hasAvailableKey() {
    const key = process.env.GEMINI_API_KEY;
    return typeof key === 'string' && key.trim().length > 0;
  }

  /**
   * Internal lazy initializer for GoogleGenAI instance.
   * @private
   */
  _getClient() {
    if (this._client) return this._client;

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('[GeminiClient] GEMINI_API_KEY is not set in environment variables.');
    }

    this._client = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': this.userAgent,
        },
      },
    });

    return this._client;
  }

  /**
   * Execute call with timeout and friendly 429 rate-limit error mapping.
   * @template T
   * @param {(client: GoogleGenAI) => Promise<T>} operation
   * @returns {Promise<T>}
   */
  async execute(operation) {
    if (!this.hasAvailableKey()) {
      throw new Error('[GeminiClient] GEMINI_API_KEY is not set in environment variables.');
    }

    const client = this._getClient();

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
      if (isRateLimitError(err)) {
        const rateLimitErr = new Error(
          'Gemini API rate limit exceeded (HTTP 429). Please wait a moment before retrying. / โควตาการใช้งานชั่วคราวเต็ม (429) กรุณารอสักครู่แล้วลองใหม่อีกครั้ง'
        );
        rateLimitErr.status = 429;
        rateLimitErr.code = 'RATE_LIMITED';
        throw rateLimitErr;
      }

      const safeMsg = sanitizeError(err);
      console.error('[GeminiClient] Request error:', safeMsg);
      throw new Error(safeMsg);
    }
  }

  /**
   * Drop-in replacement for ai.models.generateContent
   * @param {any} params 
   * @returns {Promise<any>}
   */
  async generateContent(params) {
    return this.execute((client) => client.models.generateContent(params));
  }

  /**
   * Drop-in replacement for ai.models.generateContentStream
   * @param {any} params 
   * @returns {Promise<any>}
   */
  async generateContentStream(params) {
    return this.execute((client) => client.models.generateContentStream(params));
  }
}

export const geminiClient = new GeminiClient();
export default geminiClient;
