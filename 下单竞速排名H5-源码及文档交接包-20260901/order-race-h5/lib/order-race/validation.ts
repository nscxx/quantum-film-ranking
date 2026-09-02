import { getPackageRule, getProvince } from './config';

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9-]{8,80}$/;

export function validateScoreEntry(requestId: string, provinceCode: string, packageCode: string) {
  const normalizedRequestId = requestId.trim();
  if (!REQUEST_ID_PATTERN.test(normalizedRequestId)) {
    return { ok: false as const, message: '提交标识无效，请刷新后重试' };
  }
  const province = getProvince(provinceCode);
  if (!province) return { ok: false as const, message: '请选择有效省份' };
  const packageRule = getPackageRule(packageCode);
  if (!packageRule) return { ok: false as const, message: '请选择有效套餐' };
  return { ok: true as const, requestId: normalizedRequestId, province, packageRule };
}
