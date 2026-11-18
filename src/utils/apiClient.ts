import { User } from 'firebase/auth';
import { auth } from '../firebase';
import { Language, translations } from '../i18n';

export interface ApiErrorPayload {
  error?: string;
  code?: string;
}

export interface ApiRequestOptions {
  user?: User | null;
  lang?: Language;
  requireAuth?: boolean;
}

export class ApiClientError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Shared helper for same-origin /api/* calls.
 * - Always calls a same-origin relative URL (/api/...)
 * - Attaches the Firebase ID token when available/required (never logs or exposes it)
 * - Validates response Content-Type is JSON before parsing so HTML fallbacks
 *   never trigger a raw SyntaxError ("Unexpected token '<'")
 * - Throws ApiClientError containing HTTP status and JSON code
 */
export async function postApiJson<T = any>(
  path: string,
  body: unknown = {},
  options: ApiRequestOptions = {}
): Promise<T> {
  const { user = auth.currentUser, lang = 'th', requireAuth = true } = options;
  const fallbackInvalidResponse = translations[lang].states.serverInvalidResponse;

  if (!path.startsWith('/api/')) {
    throw new ApiClientError(fallbackInvalidResponse, 400, 'INVALID_API_PATH');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const activeUser = user ?? auth.currentUser;
  if (requireAuth && !activeUser) {
    throw new ApiClientError(
      lang === 'th'
        ? 'กรุณาเข้าสู่ระบบก่อนใช้งานฟีเจอร์นี้'
        : 'Please sign in before using this feature.',
      401,
      'UNAUTHORIZED'
    );
  }

  if (activeUser) {
    const idToken = await activeUser.getIdToken();
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new ApiClientError(
      `${fallbackInvalidResponse} (HTTP ${response.status})`,
      response.status,
      'NON_JSON_RESPONSE'
    );
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new ApiClientError(
      `${fallbackInvalidResponse} (HTTP ${response.status})`,
      response.status,
      'INVALID_JSON_RESPONSE'
    );
  }

  if (!response.ok) {
    const serverCode =
      data && typeof data.code === 'string' && data.code.trim()
        ? data.code.trim()
        : `HTTP_${response.status}`;
    const serverMessage =
      data && typeof data.error === 'string' && data.error.trim() ? data.error.trim() : '';

    const prefix =
      lang === 'th'
        ? `ข้อผิดพลาดจากเซิร์ฟเวอร์ ${response.status} ${serverCode}`
        : `Server error ${response.status} ${serverCode}`;
    const message = serverMessage ? `${prefix}: ${serverMessage}` : prefix;
    throw new ApiClientError(message, response.status, serverCode);
  }

  return data as T;
}
