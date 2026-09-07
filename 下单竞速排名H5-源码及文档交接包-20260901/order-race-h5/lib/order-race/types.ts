import type { PackageCode, ProvinceCode, ScoreBandId } from './config';

export type ProvinceScore = {
  code: ProvinceCode;
  name: string;
  score: number;
  entryCount: number;
  rank: number;
  band: ScoreBandId;
  latestScoreAt: string | null;
};

export type PackageScore = {
  code: PackageCode;
  title: string;
  description: string;
  pointsPerEntry: number;
  score: number;
  entryCount: number;
  share: number;
  tone: string;
};

export type ScoreSubmissionItem = {
  id: string;
  packageCode: PackageCode;
  packageTitle: string;
  quantity: number;
  unitPoints: number;
  subtotal: number;
};

export type ScoreSubmission = {
  id: string;
  requestId: string;
  provinceCode: ProvinceCode;
  provinceName: string;
  items: ScoreSubmissionItem[];
  totalPoints: number;
  createdAt: string;
  revokedAt: string | null;
};

export type DisplayEvent = {
  cursor: number;
  id: string;
  submissionId: string;
  provinceCode: ProvinceCode;
  provinceName: string;
  packageSummary: string;
  totalPoints: number;
  scoreBefore: number;
  scoreAfter: number;
  rankBefore: number;
  rankAfter: number;
  milestone: number | null;
  createdAt: string;
};

export type CelebrationType = 'score' | 'milestone' | 'top3' | 'champion';

export type CelebrationEvent = DisplayEvent & {
  celebrationId: string;
  type: CelebrationType;
  durationMs: number;
};

export type RankingSnapshot = {
  provinces: ProvinceScore[];
  packages: PackageScore[];
  stats: {
    provinceCount: number;
    activeProvinceCount: number;
    totalScore: number;
    leaderName: string | null;
  };
  recentSubmissions: ScoreSubmission[];
  latestDisplayCursor: number;
  updatedAt: string;
};

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ApiSuccess<T> = T & { ok: true };
