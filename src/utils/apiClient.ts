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

/**
 * Shared helper for same-origin /api/* calls.
 * - Always calls a same-origin relative URL (/api/...)
 * - Attaches the Firebase ID token when available/required
 * - Validates response Content-Type is JSON before parsing so HTML fallbacks
 *   never trigger a raw SyntaxError ("Unexpected token '<'")
 */
export async function postApiJson<T = any>(
  path: string,
  body: unknown = {},
  options: ApiRequestOptions = {}
): Promise<T> {
  const { user = auth.currentUser, lang = 'th', requireAuth = true } = options;
  const fallbackInvalidResponse = translations[lang].states.serverInvalidResponse;

  if (!path.startsWith('/api/')) {
    throw new Error(fallbackInvalidResponse);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const activeUser = user ?? auth.currentUser;
  if (requireAuth && !activeUser) {
    throw new Error(
      lang === 'th'
        ? 'กรุณาเข้าสู่ระบบก่อนใช้งานฟีเจอร์นี้'
        : 'Please sign in before using this feature.'
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
    throw new Error(`${fallbackInvalidResponse} (HTTP ${response.status})`);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${fallbackInvalidResponse} (HTTP ${response.status})`);
  }

  if (!response.ok) {
    const serverCode =
      data && typeof data.code === 'string' && data.code.trim() ? data.code.trim() : '';
    const serverMessage =
      data && typeof data.error === 'string' && data.error.trim() ? data.error.trim() : '';

    const statusTag = serverCode ? `${response.status} ${serverCode}` : `${response.status}`;
    const prefix =
      lang === 'th' ? `ข้อผิดพลาดจากเซิร์ฟเวอร์ ${statusTag}` : `Server error ${statusTag}`;
    throw new Error(serverMessage ? `${prefix}: ${serverMessage}` : prefix);
  }

  return data as T;
}
