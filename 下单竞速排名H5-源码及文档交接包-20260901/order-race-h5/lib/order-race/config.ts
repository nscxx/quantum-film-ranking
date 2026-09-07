export const PACKAGE_RULES = [
  {
    code: 'A',
    title: 'A套餐',
    description: '5卷钻石70，送5卷PPF L领路者',
    points: 130,
    tone: 'cyan',
  },
  {
    code: 'B',
    title: 'B套餐',
    description: '100卷PPF L领路者，送6卷PPF L领路者',
    points: 170,
    tone: 'violet',
  },
  {
    code: 'C',
    title: 'C套餐',
    description: '100卷PPF天穹系列，送6卷天穹Pro',
    points: 100,
    tone: 'gold',
  },
] as const;

export type PackageCode = (typeof PACKAGE_RULES)[number]['code'];

export const PROVINCES = [
  { code: '110000', name: '北京市' },
  { code: '120000', name: '天津市' },
  { code: '130000', name: '河北省' },
  { code: '140000', name: '山西省' },
  { code: '150000', name: '内蒙古自治区' },
  { code: '210000', name: '辽宁省' },
  { code: '220000', name: '吉林省' },
  { code: '230000', name: '黑龙江省' },
  { code: '310000', name: '上海市' },
  { code: '320000', name: '江苏省' },
  { code: '330000', name: '浙江省' },
  { code: '340000', name: '安徽省' },
  { code: '350000', name: '福建省' },
  { code: '360000', name: '江西省' },
  { code: '370000', name: '山东省' },
  { code: '410000', name: '河南省' },
  { code: '420000', name: '湖北省' },
  { code: '430000', name: '湖南省' },
  { code: '440000', name: '广东省' },
  { code: '450000', name: '广西壮族自治区' },
  { code: '460000', name: '海南省' },
  { code: '500000', name: '重庆市' },
  { code: '510000', name: '四川省' },
  { code: '520000', name: '贵州省' },
  { code: '530000', name: '云南省' },
  { code: '540000', name: '西藏自治区' },
  { code: '610000', name: '陕西省' },
  { code: '620000', name: '甘肃省' },
  { code: '630000', name: '青海省' },
  { code: '640000', name: '宁夏回族自治区' },
  { code: '650000', name: '新疆维吾尔自治区' },
] as const;

export type ProvinceCode = (typeof PROVINCES)[number]['code'];

// Keep band IDs stable for ranking/event consumers; visual colors live here.
export const SCORE_COLOR_BANDS = [
  { id: 'cyan', min: 0, max: 99, label: '0-99', color: '#D9E1E7', highlight: '#EEF1F4', shadow: '#C5CFD8' },
  { id: 'purple', min: 100, max: 699, label: '100-699', color: '#65C5F5', highlight: '#A5E5FF', shadow: '#369FE2' },
  { id: 'pink', min: 700, max: 1399, label: '700-1,399', color: '#2857B8', highlight: '#4779E3', shadow: '#2049A4' },
  { id: 'gold', min: 1400, max: Number.POSITIVE_INFINITY, label: '≥ 1,400', color: '#FFC548', highlight: '#FFE58C', shadow: '#ECA323' },
] as const;

export const SCORE_MILESTONES = [100, 700, 1400] as const;

export type ScoreBandId = (typeof SCORE_COLOR_BANDS)[number]['id'];

export function getPackageRule(code: string) {
  return PACKAGE_RULES.find((item) => item.code === code) ?? null;
}

export function getProvince(code: string) {
  return PROVINCES.find((item) => item.code === code) ?? null;
}

export function getScoreBand(score: number) {
  return SCORE_COLOR_BANDS.find((band) => score >= band.min && score <= band.max) ?? SCORE_COLOR_BANDS[0];
}

export function getHighestCrossedMilestone(scoreBefore: number, scoreAfter: number) {
  return [...SCORE_MILESTONES].reverse().find((milestone) => scoreBefore < milestone && scoreAfter >= milestone) ?? null;
}

export function allocatePercentages(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((value) => value / total * 100);
  const result = exact.map(Math.floor);
  const remainder = 100 - result.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) result[order[index].index] += 1;
  return result;
}
