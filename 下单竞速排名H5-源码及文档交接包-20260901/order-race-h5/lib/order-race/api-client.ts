import type { PackageCode, ProvinceCode } from './config';
import type { ApiFailure, RankingSnapshot, ScoreEvent } from './types';

export class ApiError extends Error {
  status: number;
  detail: ApiFailure | null;

  constructor(status: number, message: string, detail: ApiFailure | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (init?.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(input, { ...init, headers, cache: 'no-store' });
  const data = (await response.json().catch(() => null)) as T | ApiFailure | null;
  if (!response.ok) {
    const detail = data as ApiFailure | null;
    throw new ApiError(response.status, detail?.message ?? '请求失败，请稍后重试', detail);
  }
  return data as T;
}

export function fetchRanking(signal?: AbortSignal) {
  return requestJson<RankingSnapshot>('/api/ranking', { signal });
}

export function fetchControlSession() {
  return requestJson<{ ok: true; authenticated: boolean }>('/api/control/session');
}

export function loginControl(password: string) {
  return requestJson<{ ok: true }>('/api/control/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logoutControl() {
  return requestJson<{ ok: true }>('/api/control/logout', { method: 'POST' });
}

export function recordScore(requestId: string, provinceCode: ProvinceCode, packageCode: PackageCode) {
  return requestJson<{ ok: true; event: ScoreEvent; idempotent: boolean }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ requestId, provinceCode, packageCode }),
  });
}

export function revokeScore(id: string) {
  return requestJson<{ ok: true; event: ScoreEvent; idempotent: boolean }>(
    `/api/orders/${encodeURIComponent(id)}/revoke`,
    { method: 'POST' },
  );
}
