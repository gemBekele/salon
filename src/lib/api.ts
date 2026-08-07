const TOKEN_KEY = 'sserp_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function notifySessionExpired() {
  window.dispatchEvent(new Event('auth:expired'));
}

/**
 * Fetch wrapper that attaches the JWT bearer token and, on a 401 response,
 * clears the session and alerts the UI to show the login screen.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(input, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    notifySessionExpired();
  }
  return res;
}