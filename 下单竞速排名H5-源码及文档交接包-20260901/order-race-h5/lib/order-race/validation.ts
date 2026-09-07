import { getPackageRule, getProvince } from './config';
import type { PackageCode } from './config';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

export type ScoreEntryItemInput = { packageCode?: unknown; quantity?: unknown };

export function validateScoreEntry(requestId: string, provinceCode: string, items: ScoreEntryItemInput[]) {
  const normalizedRequestId = requestId.trim();
  if (!REQUEST_ID_PATTERN.test(normalizedRequestId)) {
    return { ok: false as const, message: '提交标识无效，请刷新后重试' };
  }
  const province = getProvince(provinceCode);
  if (!province) return { ok: false as const, message: '请选择有效省份' };
  if (!Array.isArray(items) || items.length < 1 || items.length > 3) {
    return { ok: false as const, message: '请选择1至3种套餐' };
  }
  const seen = new Set<PackageCode>();
  const normalizedItems = [];
  for (const item of items) {
    const packageRule = getPackageRule(typeof item.packageCode === 'string' ? item.packageCode : '');
    if (!packageRule) return { ok: false as const, message: '请选择有效套餐' };
    if (seen.has(packageRule.code)) return { ok: false as const, message: '同一套餐不能重复选择' };
    if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 999) {
      return { ok: false as const, message: '套餐件数必须是1至999的整数' };
    }
    seen.add(packageRule.code);
    normalizedItems.push({ packageRule, quantity: Number(item.quantity) });
  }
  return { ok: true as const, requestId: normalizedRequestId, province, items: normalizedItems };
}
