import { API_BASE_URL } from './config';
import { getAuthToken } from './tokenStorage';

export interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  auth?: boolean;
  body?: unknown;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const makeUrl = (path: string) => {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
};

const parseResponse = async <T>(response: Response): Promise<ApiEnvelope<T> | null> => {
  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new ApiError('Invalid API response format.', response.status, text);
  }
};

export const apiRequest = async <T>(
  path: string,
  { auth = true, headers, body, ...init }: ApiRequestOptions = {},
): Promise<T> => {
  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`);
    }
  }

  const response = await fetch(makeUrl(path), {
    ...init,
    headers: requestHeaders,
    body: body instanceof FormData || body === undefined ? body : JSON.stringify(body),
  });

  const payload = await parseResponse<T>(response);

  if (!response.ok || payload?.success === false) {
    throw new ApiError(
      payload?.message || response.statusText || 'API request failed.',
      response.status,
      payload,
    );
  }

  return payload?.data as T;
};
