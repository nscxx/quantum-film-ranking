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

export type ScoreEvent = {
  id: string;
  requestId: string;
  provinceCode: ProvinceCode;
  provinceName: string;
  packageCode: PackageCode;
  packageTitle: string;
  points: number;
  createdAt: string;
  revokedAt: string | null;
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
  recentEvents: ScoreEvent[];
  updatedAt: string;
};

export type ApiFailure = {
  ok: false;
  code: string;
  message: string;
};

export type ApiSuccess<T> = T & { ok: true };
