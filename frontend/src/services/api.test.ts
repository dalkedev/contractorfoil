import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './api';

const session = { _id: 'user-1', name: 'River User', email: 'river@example.test', token: 'opaque-signed-token' };
const contractor = { _id: 'company-1', name: 'River Reuse', phone: '+48 012 345 678', nip: '0123456789', address: '12 Fictional Road', priceColorless: 0, priceColor: 8.123456, contactDate: '2024-03-31T12:30:00.000Z' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  localStorage.clear();
  vi.stubEnv('VITE_API_URL', '');
  vi.stubEnv('DEV', true);
  vi.stubEnv('VITE_USE_RECAPTCHA', 'false');
});

describe('API transport', () => {
  it('uses the local development API and preserves the list document shape', async () => {
    const fetcher = vi.fn().mockResolvedValue(json([contractor]));
    vi.stubGlobal('fetch', fetcher);
    localStorage.setItem('userToken', session.token);
    const controller = new AbortController();
    expect(await api.fetchContractors(controller.signal)).toEqual([contractor]);
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:5000/api/contractors', expect.objectContaining({ method: 'GET', signal: controller.signal, headers: expect.objectContaining({ Authorization: 'Bearer opaque-signed-token' }) }));
  });

  it('uses a configured origin without duplicate slashes', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.test/');
    const fetcher = vi.fn().mockResolvedValue(json(contractor));
    vi.stubGlobal('fetch', fetcher);
    await api.fetchContractorById('company/1');
    expect(fetcher.mock.calls[0][0]).toBe('https://api.example.test/api/contractors/company%2F1');
  });

  it('uses the same origin in production when no API origin is configured', async () => {
    vi.stubEnv('DEV', false);
    const fetcher = vi.fn().mockResolvedValue(json([]));
    vi.stubGlobal('fetch', fetcher);
    await api.fetchContractors();
    expect(fetcher.mock.calls[0][0]).toBe('/api/contractors');
  });

  it('returns structured validation errors with their HTTP status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Check the submitted fields.', fields: { name: 'Name is required.' } }, 400)));
    await expect(api.addContractor({ name: '', phone: '123', nip: '0123', address: 'Road' })).rejects.toMatchObject({ name: 'ApiError', message: 'Check the submitted fields.', status: 400, fields: { name: 'Name is required.' }, ambiguous: false });
  });

  it('uses a bounded fallback for a non-JSON server error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>private stack trace</html>', { status: 502 })));
    const failure = await api.fetchContractors().catch((error: unknown) => error);
    expect(failure).toMatchObject({ name: 'ApiError', status: 502, ambiguous: false });
    expect((failure as Error).message).not.toContain('private stack trace');
  });

  it('marks a lost create response as ambiguous without sending another request', async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError('Connection lost'));
    vi.stubGlobal('fetch', fetcher);
    await expect(api.addContractor(contractor)).rejects.toMatchObject({ name: 'ApiError', status: null, ambiguous: true });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('marks an unreadable successful mutation response as ambiguous', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{', { status: 201 })));
    await expect(api.addContractor(contractor)).rejects.toMatchObject({ name: 'ApiError', status: 201, ambiguous: true });
  });

  it('marks a server failure during a mutation as ambiguous', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Something went wrong.' }, 500)));
    await expect(api.updateContractor('company-1', { notes: 'Keep draft' })).rejects.toMatchObject({ status: 500, ambiguous: true });
  });

  it('does not mark a failed read as an ambiguous write', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Offline')));
    await expect(api.fetchContractors()).rejects.toMatchObject({ status: null, ambiguous: false });
  });

  it('leaves a cancelled read cancellable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')));
    await expect(api.fetchContractors()).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('sends sparse updates without rounding, filling fields or removing matching echoed IDs', async () => {
    const fetcher = vi.fn().mockResolvedValue(json(contractor));
    vi.stubGlobal('fetch', fetcher);
    await api.updateContractor('company-1', { _id: 'company-1', priceColor: 8.123456, contactDate: null });
    const options = fetcher.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({ _id: 'company-1', priceColor: 8.123456, contactDate: null });
    expect(options.method).toBe('PUT');
  });

  it('retains DELETE 200 JSON compatibility', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ message: 'Contractor removed' })));
    expect(await api.deleteContractor('company-1')).toEqual({ message: 'Contractor removed' });
  });

  it('refuses a missing record ID without making a mutation', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    await expect(api.updateContractor('', { notes: 'Draft' })).rejects.toMatchObject({ status: 400, ambiguous: false });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('session persistence', () => {
  it('persists login across a module reload with the existing storage keys', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(session)));
    expect(await api.loginUser(session.email, 'fictional-password')).toEqual(session);
    expect(localStorage.getItem('userToken')).toBe('opaque-signed-token');
    expect(localStorage.getItem('userName')).toBe('River User');
    vi.resetModules();
    const reloaded = await import('./api');
    expect(reloaded.getSession()).toEqual(session);
  });

  it('establishes a session after registration', async () => {
    const fetcher = vi.fn().mockResolvedValue(json(session, 201));
    vi.stubGlobal('fetch', fetcher);
    expect(await api.registerUser(session.name, session.email, 'fictional-password')).toEqual(session);
    expect(api.getSession()).toEqual(session);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ name: 'River User', email: 'river@example.test', password: 'fictional-password' });
  });

  it('sends CAPTCHA only when explicitly enabled', async () => {
    vi.stubEnv('VITE_USE_RECAPTCHA', 'true');
    const fetcher = vi.fn().mockResolvedValue(json(session, 201));
    vi.stubGlobal('fetch', fetcher);
    await api.registerUser(session.name, session.email, 'fictional-password', 'fictional-captcha');
    expect(JSON.parse(fetcher.mock.calls[0][1].body).captchaToken).toBe('fictional-captcha');
  });

  it('uses the verified current-user response to refresh a legacy token session', async () => {
    localStorage.setItem('userToken', 'legacy-token');
    localStorage.setItem('userName', 'Old name');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ _id: session._id, name: 'Verified name', email: session.email })));
    expect(api.getSession()).toBeNull();
    expect(await api.fetchCurrentUser()).toEqual({ _id: session._id, name: 'Verified name', email: session.email });
    expect(api.getSession()).toEqual({ ...session, name: 'Verified name', token: 'legacy-token' });
  });

  it('does not infer a name from an unsigned token payload', () => {
    localStorage.setItem('userToken', 'header.eyJuYW1lIjoiRm9yZ2VkIG5hbWUifQ.signature');
    expect(api.getUserNameFromToken()).toBeNull();
  });

  it('tolerates corrupt saved data and clears all session keys on logout', () => {
    localStorage.setItem('contractorfoil.session', '{');
    localStorage.setItem('userToken', 'legacy-token');
    localStorage.setItem('userName', 'Legacy name');
    expect(api.getSession()).toBeNull();
    api.setSession(session);
    api.logoutUser();
    expect(api.getSession()).toBeNull();
    expect(localStorage.getItem('userToken')).toBeNull();
    expect(localStorage.getItem('userName')).toBeNull();
    expect(localStorage.getItem('contractorfoil.session')).toBeNull();
  });
});
