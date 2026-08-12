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

/** Typed error carrying the HTTP status and the API's error message. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Extract the human-readable error message from a non-2xx response. */
export async function readApiError(res: Response): Promise<string> {
  let message = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    if (data?.error) message = data.error;
  } catch {
    /* body not JSON; fall back to the generic message */
  }
  return message;
}

/**
 * Resolve a fetch response into a `Response`, throwing an `ApiError` for any
 * non-2xx status so callers can `await` and catch concrete messages.
 */
export async function apiOk(res: Response): Promise<Response> {
  if (res.ok) return res;
  throw new ApiError(res.status, await readApiError(res));
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

  const res = await fetch(input, { ...init, headers, credentials: 'include' });

  if (res.status === 401) {
    clearToken();
    notifySessionExpired();
  }
  return res;
}