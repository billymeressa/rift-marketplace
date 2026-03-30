import { apiRequest, setUnauthorizedHandler } from '../lib/api';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../lib/auth', () => ({
  getToken: jest.fn(),
  removeToken: jest.fn(),
  removeUser: jest.fn(),
}));

import { getToken, removeToken, removeUser } from '../lib/auth';

const mockGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockRemoveToken = removeToken as jest.MockedFunction<typeof removeToken>;
const mockRemoveUser = removeUser as jest.MockedFunction<typeof removeUser>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  mockGetToken.mockResolvedValue(null);
  mockRemoveToken.mockResolvedValue();
  mockRemoveUser.mockResolvedValue();
});

afterEach(() => {
  jest.runAllTimers();
  jest.useRealTimers();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('apiRequest', () => {
  it('returns parsed JSON on success', async () => {
    mockFetch(200, { id: 1, name: 'Teff' });
    const result = await apiRequest('/listings/1');
    expect(result).toEqual({ id: 1, name: 'Teff' });
  });

  it('includes Authorization header when a token is stored', async () => {
    mockGetToken.mockResolvedValue('test-jwt-token');
    mockFetch(200, {});
    await apiRequest('/listings');
    const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders['Authorization']).toBe('Bearer test-jwt-token');
  });

  it('omits Authorization header when no token is stored', async () => {
    mockGetToken.mockResolvedValue(null);
    mockFetch(200, {});
    await apiRequest('/listings');
    const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders['Authorization']).toBeUndefined();
  });

  it('always sends Content-Type: application/json', async () => {
    mockFetch(200, {});
    await apiRequest('/listings');
    const callHeaders = (global.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders['Content-Type']).toBe('application/json');
  });

  it('throws an error with the server error message on non-ok response', async () => {
    mockFetch(404, { error: 'Listing not found' });
    await expect(apiRequest('/listings/999')).rejects.toThrow('Listing not found');
  });

  it('throws a fallback error when response body has no error field', async () => {
    mockFetch(500, {});
    await expect(apiRequest('/listings')).rejects.toThrow('HTTP 500');
  });

  it('calls the unauthorized handler and clears storage on 401', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    mockGetToken.mockResolvedValue('expired-token');
    mockFetch(401, { error: 'Unauthorized' });

    await expect(apiRequest('/orders')).rejects.toThrow();

    expect(mockRemoveToken).toHaveBeenCalled();
    expect(mockRemoveUser).toHaveBeenCalled();
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('does not call the unauthorized handler for other error codes', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    mockFetch(403, { error: 'Forbidden' });
    await expect(apiRequest('/admin')).rejects.toThrow();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('passes through custom request options (method, body)', async () => {
    mockFetch(201, { id: 'new-order' });
    await apiRequest('/orders', { method: 'POST', body: JSON.stringify({ qty: 10 }) });

    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(options.method).toBe('POST');
    expect(options.body).toBe(JSON.stringify({ qty: 10 }));
  });
});

describe('setUnauthorizedHandler', () => {
  it('replaces the previous handler', async () => {
    const first = jest.fn();
    const second = jest.fn();

    setUnauthorizedHandler(first);
    setUnauthorizedHandler(second);

    mockGetToken.mockResolvedValue('token');
    mockFetch(401, { error: 'Unauthorized' });

    await expect(apiRequest('/orders')).rejects.toThrow();

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
  });
});
