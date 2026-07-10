export const SESSION_STORAGE_KEY = 'balancing_carbon_session';

export function getStoredSession(): any | null {
  const savedSession = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!savedSession) return null;
  try {
    return JSON.parse(savedSession);
  } catch {
    return null;
  }
}

export function saveSession(session: any) {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

async function refreshStoredSession() {
  const session = getStoredSession();
  const refreshToken = session?.refreshToken ?? session?.refresh_token;
  if (!refreshToken) return session;
  const response = await fetch('/api/auth/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }) });
  if (!response.ok) { clearSession(); return null; }
  const refreshed = await response.json();
  saveSession({ ...session, ...refreshed });
  return getStoredSession();
}

export async function ensureFreshSession() {
  const session = getStoredSession();
  const expiresAt = Number(session?.expiresAt ?? session?.expires_at ?? 0);
  if (!expiresAt || expiresAt * 1000 > Date.now() + 30_000) return session;
  return refreshStoredSession();
}

export function getAuthenticatedHeaders(headers?: HeadersInit): Record<string, string> {
  const normalizedHeaders = { ...(headers || {}) } as Record<string, string>;
  const session = getStoredSession();
  const token = session?.token ?? session?.accessToken;
  if (token) normalizedHeaders.Authorization = `Bearer ${token}`;
  return normalizedHeaders;
}

export async function parseJsonResponse(response: Response, fallback: any): Promise<any> {
  if (!response.ok) {
    console.error(`Request failed for ${response.url}: status ${response.status}`);
    return fallback;
  }
  try {
    const text = await response.text();
    if (!text || text.trim() === '' || text.trim() === 'undefined') return fallback;
    return JSON.parse(text);
  } catch (error) {
    console.error(`Error parsing JSON for ${response.url}:`, error);
    return fallback;
  }
}

/** Existing UI mutation contract: return a fallback rather than throw on request failure. */
export async function safeFetchJson(url: string, options?: RequestInit, fallback: any = null): Promise<any> {
  try {
    await ensureFreshSession();
    const headers = {
      ...getAuthenticatedHeaders(options?.headers),
      'Content-Type': 'application/json',
    };
    const response = await fetch(url, { ...options, headers });
    return await parseJsonResponse(response, fallback);
  } catch (error) {
    console.error(`Error in safeFetchJson for ${url}:`, error);
    return fallback;
  }
}
