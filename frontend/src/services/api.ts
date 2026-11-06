import type { AuthSession, Contractor, ContractorInput, ContractorPatch, FieldErrors, User } from '../types';

const SESSION_KEY = 'contractorfoil.session';
const REQUEST_TIMEOUT_MS = 20_000;
let requestToken: string | null | undefined;
let sessionRevision = 0;

export class ApiError extends Error {
  readonly status: number | null;
  readonly fields?: FieldErrors;
  readonly ambiguous: boolean;

  constructor(message: string, status: number | null = null, fields?: FieldErrors, ambiguous = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.ambiguous = ambiguous;
  }
}

const isUser = (value: unknown): value is User => {
  if (!value || typeof value !== 'object') return false;
  const user = value as Record<string, unknown>;
  return ['_id', 'name', 'email'].every((key) => typeof user[key] === 'string' && user[key] !== '');
};

const getToken = (): string | null => localStorage.getItem('userToken');

export const getSession = (): AuthSession | null => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null');
    if (!isUser(saved) || !('token' in saved) || typeof saved.token !== 'string' || !saved.token || saved.token !== getToken()) return null;
    return { _id: saved._id, name: saved.name, email: saved.email, token: saved.token };
  } catch {
    return null;
  }
};

export const setSession = (session: AuthSession): void => {
  if (getToken() !== session.token) sessionRevision += 1;
  requestToken = session.token;
  localStorage.setItem('userToken', session.token);
  localStorage.setItem('userName', session.name);
  localStorage.setItem(SESSION_KEY, JSON.stringify({ _id: session._id, name: session.name, email: session.email, token: session.token }));
};

/** Invalidate this document without deleting another tab's newer credentials. */
export const invalidateSession = (): void => {
  requestToken = null;
  sessionRevision += 1;
};

export const logoutUser = (): void => {
  invalidateSession();
  localStorage.removeItem('userToken');
  localStorage.removeItem('userName');
  localStorage.removeItem(SESSION_KEY);
};

/** Compatibility name: reads the saved profile, never an unsigned JWT payload. */
export const getUserNameFromToken = (): string | null =>
  getSession()?.name ?? (getToken() ? localStorage.getItem('userName') : null);

const apiBase = (): string =>
  import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '') || (import.meta.env.DEV ? 'http://127.0.0.1:5000' : '');

const fieldErrors = (value: unknown): FieldErrors | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  return entries.length ? Object.fromEntries(entries) : undefined;
};

async function request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const mutation = method !== 'GET';
  const token = getToken();
  const protectedRecord = path.startsWith('/api/contractors');
  const startingRevision = sessionRevision;
  if (protectedRecord && requestToken !== undefined && token !== requestToken) {
    throw new ApiError('Your session changed. Sign in again before continuing.', 401);
  }
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  let timedOut = false;
  const forwardCancellation = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardCancellation();
  else signal?.addEventListener('abort', forwardCancellation, { once: true });
  const timeout = setTimeout(() => {
    if (controller.signal.aborted) return;
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      if (controller.signal.aborted) throw controller.signal.reason;
      response = await fetch(`${apiBase()}${path}`, { method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}), signal: controller.signal });
    } catch (error) {
      if (!mutation && !timedOut) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error;
        if (controller.signal.aborted) throw controller.signal.reason;
      }
      const message = timedOut
        ? (mutation ? 'The request timed out. Check the saved records before trying again.' : 'The request timed out. Please try again.')
        : (mutation ? 'The response was lost. Check the saved records before trying again.' : 'Could not reach the server. Please try again.');
      throw new ApiError(message, null, undefined, mutation);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch (error) {
      if (!mutation && !timedOut) {
        if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') throw error;
        if (controller.signal.aborted) throw controller.signal.reason;
      }
      const message = timedOut
        ? (mutation ? 'The request timed out. Check the saved records before trying again.' : 'The request timed out. Please try again.')
        : (response.ok ? 'The server returned an unreadable response.' : 'The request could not be completed.');
      throw new ApiError(message, response.status, undefined, mutation && (timedOut || response.ok || response.status >= 500));
    }
    if (!response.ok) {
      const error = data && typeof data === 'object' ? data as Record<string, unknown> : {};
      const message = typeof error.message === 'string' && error.message ? error.message.slice(0, 300) : 'The request could not be completed.';
      throw new ApiError(message, response.status, fieldErrors(error.fields), mutation && response.status >= 500);
    }
    if (protectedRecord && (token !== getToken() || startingRevision !== sessionRevision)) {
      throw new ApiError('Your session changed. Sign in again and check saved records before continuing.', 401, undefined, mutation);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', forwardCancellation);
  }
}

async function authenticate(path: string, input: object): Promise<AuthSession> {
  const token = getToken();
  const startingRevision = sessionRevision;
  const session = await request<AuthSession>(path, 'POST', input);
  if (!isUser(session) || typeof session.token !== 'string' || !session.token) {
    throw new ApiError('The server returned an incomplete session. Sign in to check your account.', 200, undefined, true);
  }
  if (token !== getToken() || startingRevision !== sessionRevision) {
    throw new ApiError('Your session changed before sign-in completed. Sign in again to continue.', 401, undefined, path.endsWith('/register'));
  }
  setSession(session);
  return session;
}

export const loginUser = (email: string, password: string): Promise<AuthSession> =>
  authenticate('/api/auth/login', { email, password });

export const registerUser = (name: string, email: string, password: string, captchaToken?: string): Promise<AuthSession> =>
  authenticate('/api/auth/register', { name, email, password, ...(import.meta.env.VITE_USE_RECAPTCHA === 'true' ? { captchaToken } : {}) });

/** Successful /me reads explicitly refresh the profile saved with the current token. */
export const fetchCurrentUser = async (): Promise<User> => {
  const token = getToken();
  const user = await request<User>('/api/auth/me');
  if (!isUser(user)) throw new ApiError('The server returned an incomplete profile.', 200);
  const profile = { _id: user._id, name: user.name, email: user.email };
  if (token && token === getToken()) setSession({ ...profile, token });
  return profile;
};

const recordPath = (id: string): string => {
  if (!id) throw new ApiError('A contractor ID is required.', 400);
  return `/api/contractors/${encodeURIComponent(id)}`;
};

export const fetchContractors = (signal?: AbortSignal): Promise<Contractor[]> =>
  request('/api/contractors', 'GET', undefined, signal);

export const fetchContractorById = async (id: string, signal?: AbortSignal): Promise<Contractor> =>
  request(recordPath(id), 'GET', undefined, signal);

export const addContractor = (input: ContractorInput): Promise<Contractor> =>
  request('/api/contractors', 'POST', input);

export const updateContractor = async (id: string, patch: ContractorPatch): Promise<Contractor> =>
  request(recordPath(id), 'PUT', patch);

export const deleteContractor = async (id: string): Promise<{ message: string }> =>
  request(recordPath(id), 'DELETE');
