import { env } from 'cloudflare:workers';
import {
  PACKAGE_RULES,
  PROVINCES,
  allocatePercentages,
  getPackageRule,
  getProvince,
  getScoreBand,
} from '@/lib/order-race/config';
import type { RankingSnapshot, ScoreEvent } from '@/lib/order-race/types';
import { validateScoreEntry } from '@/lib/order-race/validation';

type ProvinceAggregateRow = {
  provinceCode: string;
  score: number;
  entryCount: number;
  latestScoreAt: string | null;
};

type PackageAggregateRow = {
  packageCode: string;
  score: number;
  entryCount: number;
};

type EventRow = {
  id: string;
  requestId: string;
  provinceCode: string;
  packageCode: string;
  points: number;
  createdAt: string;
  revokedAt: string | null;
};

let schemaReady: Promise<void> | null = null;

function getD1() {
  if (!env.DB) throw new Error('D1 binding DB 不可用');
  return env.DB;
}

export async function ensureOrderRaceSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const db = getD1();
      await db.batch([
        db.prepare(`CREATE TABLE IF NOT EXISTS order_events (
          id TEXT PRIMARY KEY NOT NULL,
          request_id TEXT NOT NULL,
          province_code TEXT NOT NULL,
          package_code TEXT NOT NULL,
          points INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          revoked_at TEXT
        )`),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_order_events_request_id ON order_events(request_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_order_events_province_created ON order_events(province_code, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_order_events_package_created ON order_events(package_code, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_order_events_created_at ON order_events(created_at)'),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function toScoreEvent(row: EventRow): ScoreEvent | null {
  const province = getProvince(row.provinceCode);
  const packageRule = getPackageRule(row.packageCode);
  if (!province || !packageRule) return null;
  return {
    id: row.id,
    requestId: row.requestId,
    provinceCode: province.code,
    provinceName: province.name,
    packageCode: packageRule.code,
    packageTitle: packageRule.title,
    points: Number(row.points),
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  };
}

export async function getRankingSnapshot(): Promise<RankingSnapshot> {
  await ensureOrderRaceSchema();
  const db = getD1();
  const [provinceResult, packageResult, recentResult] = await Promise.all([
    db.prepare(`SELECT
      province_code AS provinceCode,
      COALESCE(SUM(points), 0) AS score,
      COUNT(*) AS entryCount,
      MAX(created_at) AS latestScoreAt
    FROM order_events
    WHERE revoked_at IS NULL
    GROUP BY province_code`).all<ProvinceAggregateRow>(),
    db.prepare(`SELECT
      package_code AS packageCode,
      COALESCE(SUM(points), 0) AS score,
      COUNT(*) AS entryCount
    FROM order_events
    WHERE revoked_at IS NULL
    GROUP BY package_code`).all<PackageAggregateRow>(),
    db.prepare(`SELECT
      id,
      request_id AS requestId,
      province_code AS provinceCode,
      package_code AS packageCode,
      points,
      created_at AS createdAt,
      revoked_at AS revokedAt
    FROM order_events
    ORDER BY created_at DESC, id DESC
    LIMIT 24`).all<EventRow>(),
  ]);

  const aggregateByProvince = new Map(provinceResult.results.map((row) => [row.provinceCode, row]));
  const provinceOrder = new Map(PROVINCES.map((item, index) => [item.code, index]));
  const provinces = PROVINCES.map((province) => {
    const aggregate = aggregateByProvince.get(province.code);
    const score = Number(aggregate?.score ?? 0);
    return {
      code: province.code,
      name: province.name,
      score,
      entryCount: Number(aggregate?.entryCount ?? 0),
      latestScoreAt: aggregate?.latestScoreAt ?? null,
      rank: 0,
      band: getScoreBand(score).id,
    };
  })
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.latestScoreAt && b.latestScoreAt) return a.latestScoreAt.localeCompare(b.latestScoreAt);
      if (a.latestScoreAt) return -1;
      if (b.latestScoreAt) return 1;
      return (provinceOrder.get(a.code) ?? 0) - (provinceOrder.get(b.code) ?? 0);
    })
    .map((province, index) => ({ ...province, rank: index + 1 }));

  const aggregateByPackage = new Map(packageResult.results.map((row) => [row.packageCode, row]));
  const packageScores = PACKAGE_RULES.map((packageRule) => Number(aggregateByPackage.get(packageRule.code)?.score ?? 0));
  const shares = allocatePercentages(packageScores);
  const packages = PACKAGE_RULES.map((packageRule, index) => ({
    code: packageRule.code,
    title: packageRule.title,
    description: packageRule.description,
    pointsPerEntry: packageRule.points,
    score: packageScores[index],
    entryCount: Number(aggregateByPackage.get(packageRule.code)?.entryCount ?? 0),
    share: shares[index],
    tone: packageRule.tone,
  }));
  const totalScore = packageScores.reduce((sum, score) => sum + score, 0);
  const recentEvents = recentResult.results.map(toScoreEvent).filter((event): event is ScoreEvent => event !== null);

  return {
    provinces,
    packages,
    stats: {
      provinceCount: PROVINCES.length,
      activeProvinceCount: provinces.filter((province) => province.score > 0).length,
      totalScore,
      leaderName: totalScore > 0 ? provinces[0]?.name ?? null : null,
    },
    recentEvents,
    updatedAt: new Date().toISOString(),
  };
}

async function findEventByRequestId(requestId: string) {
  const row = await getD1()
    .prepare(`SELECT
      id,
      request_id AS requestId,
      province_code AS provinceCode,
      package_code AS packageCode,
      points,
      created_at AS createdAt,
      revoked_at AS revokedAt
    FROM order_events
    WHERE request_id = ?
    LIMIT 1`)
    .bind(requestId)
    .first<EventRow>();
  return row ? toScoreEvent(row) : null;
}

async function findEventById(id: string) {
  const row = await getD1()
    .prepare(`SELECT
      id,
      request_id AS requestId,
      province_code AS provinceCode,
      package_code AS packageCode,
      points,
      created_at AS createdAt,
      revoked_at AS revokedAt
    FROM order_events
    WHERE id = ?
    LIMIT 1`)
    .bind(id)
    .first<EventRow>();
  return row ? toScoreEvent(row) : null;
}

export async function createScoreEntry(requestId: string, provinceCode: string, packageCode: string) {
  await ensureOrderRaceSchema();
  const validation = validateScoreEntry(requestId, provinceCode, packageCode);
  if (!validation.ok) return { kind: 'invalid' as const, message: validation.message };
  const existing = await findEventByRequestId(validation.requestId);
  if (existing) return { kind: 'existing' as const, event: existing };

  const id = crypto.randomUUID();
  try {
    await getD1()
      .prepare(`INSERT INTO order_events
        (id, request_id, province_code, package_code, points)
        VALUES (?, ?, ?, ?, ?)`)
      .bind(
        id,
        validation.requestId,
        validation.province.code,
        validation.packageRule.code,
        validation.packageRule.points,
      )
      .run();
  } catch (error) {
    const duplicate = await findEventByRequestId(validation.requestId);
    if (duplicate) return { kind: 'existing' as const, event: duplicate };
    throw error;
  }

  const event = await findEventById(id);
  if (!event) throw new Error('积分流水写入后无法读取');
  return { kind: 'created' as const, event };
}

export async function revokeScoreEvent(id: string) {
  await ensureOrderRaceSchema();
  if (!id) return { kind: 'invalid' as const, message: '缺少需要撤销的记录' };
  const existing = await findEventById(id);
  if (!existing) return { kind: 'missing' as const };
  if (existing.revokedAt) return { kind: 'already_revoked' as const, event: existing };
  await getD1()
    .prepare('UPDATE order_events SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL')
    .bind(id)
    .run();
  const event = await findEventById(id);
  if (!event) throw new Error('撤销后无法读取积分流水');
  return { kind: 'revoked' as const, event };
}
