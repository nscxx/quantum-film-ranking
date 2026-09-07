import type { PackageCode, ProvinceCode } from './config';
import type { ApiFailure, DisplayEvent, RankingSnapshot, ScoreSubmission } from './types';

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

export function recordScore(
  requestId: string,
  provinceCode: ProvinceCode,
  items: Array<{ packageCode: PackageCode; quantity: number }>,
) {
  return requestJson<{ ok: true; submission: ScoreSubmission; displayEventId: string | null; idempotent: boolean }>('/api/orders', {
    method: 'POST',
    body: JSON.stringify({ requestId, provinceCode, items }),
  });
}

export function revokeScore(id: string) {
  return requestJson<{ ok: true; submission: ScoreSubmission; idempotent: boolean }>(
    `/api/orders/${encodeURIComponent(id)}/revoke`,
    { method: 'POST' },
  );
}

export function fetchDisplayEvents(after: number, signal?: AbortSignal) {
  return requestJson<{ events: DisplayEvent[]; nextCursor: number; hasMore: boolean }>(
    `/api/display-events?after=${encodeURIComponent(after)}`,
    { signal },
  );
}

export function savePackagePoints(packageCode: PackageCode, points: number) {
  return requestJson<{ ok: true; code: PackageCode; points: number; oldPoints?: number; unchanged: boolean }>(
    `/api/control/packages/${packageCode}`,
    { method: 'PATCH', body: JSON.stringify({ points }) },
  );
}

function fileNameFromDisposition(value: string | null) {
  if (!value) return '量子膜积分导出.xls';
  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8?.[1]) return decodeURIComponent(utf8[1]);
  const ascii = value.match(/filename="([^"]+)"/i);
  return ascii?.[1] ?? '量子膜积分导出.xls';
}

export async function downloadScoreExport() {
  const response = await fetch('/api/control/export', { cache: 'no-store' });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiFailure | null;
    throw new ApiError(response.status, data?.message ?? '导出失败，请稍后重试', data);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileNameFromDisposition(response.headers.get('Content-Disposition'));
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
