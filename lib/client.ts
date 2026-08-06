import { API_BASE } from "./config";
import { clearSession, peekSession } from "./session";

// ─────────────────────────────────────────────────────────────────────────────
// The one place the app talks to the backend.
//
// Every call carries the session as `Authorization: Bearer`. A 401 means the
// 03:30 IST boundary passed (or the token was revoked) — we drop the stored
// token and notify listeners, which sends the UI back to the PIN screen.
// ─────────────────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  /** Seconds to wait, from the login lockout's 429 response. */
  retryAfter?: number;
  body?: unknown;

  constructor(message: string, status: number, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    const ra = (body as { retryAfter?: unknown } | undefined)?.retryAfter;
    if (typeof ra === "number") this.retryAfter = ra;
  }

  get isAuth() {
    return this.status === 401;
  }
  get isLockedOut() {
    return this.status === 429;
  }
}

// Session-expiry subscribers (the root layout listens and shows the PIN gate).
type Listener = () => void;
const expiryListeners = new Set<Listener>();

export function onSessionExpired(fn: Listener): () => void {
  expiryListeners.add(fn);
  return () => expiryListeners.delete(fn);
}

async function handleExpiry() {
  await clearSession();
  expiryListeners.forEach((fn) => fn());
}

function url(path: string, params?: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const query = qs.toString();
  return `${API_BASE}${path}${query ? `?${query}` : ""}`;
}

interface RequestOptions {
  params?: Record<string, unknown>;
  method?: "GET" | "POST";
  body?: unknown;
  /** Skip the bearer header — only the login call needs this. */
  anonymous?: boolean;
  /** Some scans (swing-low, early-entry) legitimately take a long time. */
  timeoutMs?: number;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { params, method = "GET", body, anonymous = false, timeoutMs = 60_000 } = opts;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!anonymous) {
    const token = peekSession();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // RN's fetch has no default timeout; a stalled scan would hang the screen.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      // The backend redirects the OAuth callback to a custom scheme; no API
      // call should ever follow a redirect off-origin.
      redirect: "follow",
    });
  } catch (e) {
    clearTimeout(timer);
    if ((e as Error).name === "AbortError") {
      throw new ApiError("Request timed out — the server took too long.", 0);
    }
    throw new ApiError(`Can't reach the server. Check your connection.`, 0);
  }
  clearTimeout(timer);

  const text = await res.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!res.ok) {
    // 401 on anything but the login attempt itself means the session lapsed.
    if (res.status === 401 && !anonymous) await handleExpiry();
    const message =
      (parsed as { error?: string } | null)?.error ||
      (typeof parsed === "string" && parsed) ||
      `Request failed (${res.status})`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}
