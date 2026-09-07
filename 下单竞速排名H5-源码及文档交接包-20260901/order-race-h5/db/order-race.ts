import { env } from 'cloudflare:workers';
import {
  PACKAGE_RULES,
  PROVINCES,
  allocatePercentages,
  getHighestCrossedMilestone,
  getPackageRule,
  getProvince,
  getScoreBand,
} from '@/lib/order-race/config';
import type {
  DisplayEvent,
  RankingSnapshot,
  ScoreSubmission,
  ScoreSubmissionItem,
} from '@/lib/order-race/types';
import { validateScoreEntry } from '@/lib/order-race/validation';
import type { ScoreEntryItemInput } from '@/lib/order-race/validation';

type ProvinceAggregateRow = {
  provinceCode: string;
  score: number;
  entryCount: number;
  latestScoreAt: string | null;
};
type PackageAggregateRow = { packageCode: string; score: number; entryCount: number };
type PackageRuleRow = { code: string; points: number; updatedAt: string };
type CursorRow = { cursor: number };
type SubmissionRow = {
  id: string;
  requestId: string;
  provinceCode: string;
  totalPoints: number;
  createdAt: string;
  revokedAt: string | null;
};
type ItemRow = {
  id: string;
  submissionId: string;
  packageCode: string;
  quantity: number;
  unitPoints: number;
  subtotal: number;
};
type DisplayEventRow = {
  cursor: number;
  id: string;
  submissionId: string;
  provinceCode: string;
  packageSummary: string;
  totalPoints: number;
  scoreBefore: number;
  scoreAfter: number;
  rankBefore: number;
  rankAfter: number;
  milestone: number | null;
  createdAt: string;
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
        db.prepare(`CREATE TABLE IF NOT EXISTS score_submissions (
          id TEXT PRIMARY KEY NOT NULL,
          request_id TEXT NOT NULL UNIQUE,
          province_code TEXT NOT NULL,
          total_points INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          revoked_at TEXT
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS score_submission_items (
          id TEXT PRIMARY KEY NOT NULL,
          submission_id TEXT NOT NULL,
          package_code TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_points INTEGER NOT NULL,
          subtotal INTEGER NOT NULL
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS display_events (
          cursor INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
          submission_id TEXT NOT NULL UNIQUE,
          province_code TEXT NOT NULL,
          package_summary TEXT NOT NULL,
          total_points INTEGER NOT NULL,
          score_before INTEGER NOT NULL,
          score_after INTEGER NOT NULL,
          rank_before INTEGER NOT NULL,
          rank_after INTEGER NOT NULL,
          milestone INTEGER,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS package_rules (
          code TEXT PRIMARY KEY NOT NULL,
          points INTEGER NOT NULL,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare(`CREATE TABLE IF NOT EXISTS package_rule_changes (
          id TEXT PRIMARY KEY NOT NULL,
          package_code TEXT NOT NULL,
          old_points INTEGER NOT NULL,
          new_points INTEGER NOT NULL,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`),
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_order_events_request_id ON order_events(request_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_score_submissions_province_created ON score_submissions(province_code, created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_score_submissions_created_at ON score_submissions(created_at)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_score_submission_items_submission ON score_submission_items(submission_id)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_score_submission_items_package ON score_submission_items(package_code)'),
        db.prepare('CREATE INDEX IF NOT EXISTS idx_package_rule_changes_created ON package_rule_changes(created_at)'),
      ]);
      await db.batch([
        ...PACKAGE_RULES.map((rule) => db
          .prepare('INSERT OR IGNORE INTO package_rules (code, points) VALUES (?, ?)')
          .bind(rule.code, rule.points)),
        db.prepare(`INSERT OR IGNORE INTO score_submissions
          (id, request_id, province_code, total_points, created_at, revoked_at)
          SELECT id, request_id, province_code, points, created_at, revoked_at FROM order_events`),
        db.prepare(`INSERT OR IGNORE INTO score_submission_items
          (id, submission_id, package_code, quantity, unit_points, subtotal)
          SELECT 'legacy:' || id, id, package_code, 1, points, points FROM order_events`),
      ]);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  await schemaReady;
}

function toSubmissionItem(row: ItemRow): ScoreSubmissionItem | null {
  const rule = getPackageRule(row.packageCode);
  if (!rule) return null;
  return {
    id: row.id,
    packageCode: rule.code,
    packageTitle: rule.title,
    quantity: Number(row.quantity),
    unitPoints: Number(row.unitPoints),
    subtotal: Number(row.subtotal),
  };
}

function toSubmission(row: SubmissionRow, items: ItemRow[]): ScoreSubmission | null {
  const province = getProvince(row.provinceCode);
  if (!province) return null;
  return {
    id: row.id,
    requestId: row.requestId,
    provinceCode: province.code,
    provinceName: province.name,
    items: items.map(toSubmissionItem).filter((item): item is ScoreSubmissionItem => item !== null),
    totalPoints: Number(row.totalPoints),
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  };
}

function toDisplayEvent(row: DisplayEventRow): DisplayEvent | null {
  const province = getProvince(row.provinceCode);
  if (!province) return null;
  const isBigCustomer = row.packageSummary === '__BIG_CUSTOMER__';
  return {
    cursor: Number(row.cursor),
    id: row.id,
    submissionId: row.submissionId,
    provinceCode: province.code,
    provinceName: isBigCustomer ? '杭州保通科技实业有限公司' : province.name,
    packageSummary: row.packageSummary,
    totalPoints: Number(row.totalPoints),
    scoreBefore: Number(row.scoreBefore),
    scoreAfter: Number(row.scoreAfter),
    rankBefore: Number(row.rankBefore),
    rankAfter: Number(row.rankAfter),
    milestone: row.milestone === null ? null : Number(row.milestone),
    createdAt: row.createdAt,
    eventKind: isBigCustomer ? 'bigCustomer' : 'score',
  };
}

export async function triggerBigCustomerCelebration() {
  await ensureOrderRaceSchema();
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await getD1().prepare(`INSERT INTO display_events
    (id, submission_id, province_code, package_summary, total_points, score_before,
     score_after, rank_before, rank_after, milestone, created_at)
    VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, NULL, ?)`)
    .bind(id, `special:${id}`, '330000', '__BIG_CUSTOMER__', createdAt).run();
  return { id, createdAt };
}

async function getPackageRuleRows() {
  await ensureOrderRaceSchema();
  const result = await getD1()
    .prepare('SELECT code, points, updated_at AS updatedAt FROM package_rules ORDER BY code')
    .all<PackageRuleRow>();
  return result.results;
}

async function getRecentSubmissions(limit = 24) {
  const db = getD1();
  const submissionResult = await db.prepare(`SELECT
    id, request_id AS requestId, province_code AS provinceCode,
    total_points AS totalPoints, created_at AS createdAt, revoked_at AS revokedAt
    FROM score_submissions ORDER BY created_at DESC, id DESC LIMIT ?`).bind(limit).all<SubmissionRow>();
  const rows = submissionResult.results;
  if (!rows.length) return [];
  const placeholders = rows.map(() => '?').join(',');
  const itemResult = await db.prepare(`SELECT
    id, submission_id AS submissionId, package_code AS packageCode,
    quantity, unit_points AS unitPoints, subtotal
    FROM score_submission_items WHERE submission_id IN (${placeholders})
    ORDER BY package_code`).bind(...rows.map((row) => row.id)).all<ItemRow>();
  const itemsBySubmission = new Map<string, ItemRow[]>();
  for (const item of itemResult.results) {
    const items = itemsBySubmission.get(item.submissionId) ?? [];
    items.push(item);
    itemsBySubmission.set(item.submissionId, items);
  }
  return rows
    .map((row) => toSubmission(row, itemsBySubmission.get(row.id) ?? []))
    .filter((submission): submission is ScoreSubmission => submission !== null);
}

function sortProvinces(provinces: RankingSnapshot['provinces']) {
  const provinceOrder = new Map(PROVINCES.map((item, index) => [item.code, index]));
  return [...provinces]
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.latestScoreAt && b.latestScoreAt) return a.latestScoreAt.localeCompare(b.latestScoreAt);
      if (a.latestScoreAt) return -1;
      if (b.latestScoreAt) return 1;
      return (provinceOrder.get(a.code) ?? 0) - (provinceOrder.get(b.code) ?? 0);
    })
    .map((province, index) => ({ ...province, rank: index + 1 }));
}

export async function getRankingSnapshot(): Promise<RankingSnapshot> {
  await ensureOrderRaceSchema();
  const db = getD1();
  const [provinceResult, packageResult, packageRuleRows, recentSubmissions, cursorRow] = await Promise.all([
    db.prepare(`SELECT s.province_code AS provinceCode,
      COALESCE(SUM(i.subtotal), 0) AS score,
      COALESCE(SUM(i.quantity), 0) AS entryCount,
      MAX(s.created_at) AS latestScoreAt
      FROM score_submissions s
      JOIN score_submission_items i ON i.submission_id = s.id
      WHERE s.revoked_at IS NULL GROUP BY s.province_code`).all<ProvinceAggregateRow>(),
    db.prepare(`SELECT i.package_code AS packageCode,
      COALESCE(SUM(i.subtotal), 0) AS score,
      COALESCE(SUM(i.quantity), 0) AS entryCount
      FROM score_submission_items i
      JOIN score_submissions s ON s.id = i.submission_id
      WHERE s.revoked_at IS NULL GROUP BY i.package_code`).all<PackageAggregateRow>(),
    getPackageRuleRows(),
    getRecentSubmissions(),
    db.prepare('SELECT COALESCE(MAX(cursor), 0) AS cursor FROM display_events').first<CursorRow>(),
  ]);

  const aggregateByProvince = new Map(provinceResult.results.map((row) => [row.provinceCode, row]));
  const provinces = sortProvinces(PROVINCES.map((province) => {
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
  }));

  const aggregateByPackage = new Map(packageResult.results.map((row) => [row.packageCode, row]));
  const pointsByPackage = new Map(packageRuleRows.map((row) => [row.code, Number(row.points)]));
  const packageScores = PACKAGE_RULES.map((rule) => Number(aggregateByPackage.get(rule.code)?.score ?? 0));
  const shares = allocatePercentages(packageScores);
  const packages = PACKAGE_RULES.map((rule, index) => ({
    code: rule.code,
    title: rule.title,
    description: rule.description,
    pointsPerEntry: pointsByPackage.get(rule.code) ?? rule.points,
    score: packageScores[index],
    entryCount: Number(aggregateByPackage.get(rule.code)?.entryCount ?? 0),
    share: shares[index],
    tone: rule.tone,
  }));
  const totalScore = packageScores.reduce((sum, score) => sum + score, 0);

  return {
    provinces,
    packages,
    stats: {
      provinceCount: PROVINCES.length,
      activeProvinceCount: provinces.filter((province) => province.score > 0).length,
      totalScore,
      leaderName: totalScore > 0 ? provinces[0]?.name ?? null : null,
    },
    recentSubmissions,
    latestDisplayCursor: Number(cursorRow?.cursor ?? 0),
    updatedAt: new Date().toISOString(),
  };
}

async function findSubmission(where: 'id' | 'request_id', value: string) {
  const row = await getD1().prepare(`SELECT id, request_id AS requestId,
    province_code AS provinceCode, total_points AS totalPoints,
    created_at AS createdAt, revoked_at AS revokedAt
    FROM score_submissions WHERE ${where} = ? LIMIT 1`).bind(value).first<SubmissionRow>();
  if (!row) return null;
  const items = await getD1().prepare(`SELECT id, submission_id AS submissionId,
    package_code AS packageCode, quantity, unit_points AS unitPoints, subtotal
    FROM score_submission_items WHERE submission_id = ? ORDER BY package_code`)
    .bind(row.id).all<ItemRow>();
  return toSubmission(row, items.results);
}

async function findDisplayEventBySubmission(submissionId: string) {
  const row = await getD1().prepare(`SELECT cursor, id, submission_id AS submissionId,
    province_code AS provinceCode, package_summary AS packageSummary, total_points AS totalPoints,
    score_before AS scoreBefore, score_after AS scoreAfter, rank_before AS rankBefore,
    rank_after AS rankAfter, milestone, created_at AS createdAt
    FROM display_events WHERE submission_id = ? LIMIT 1`).bind(submissionId).first<DisplayEventRow>();
  return row ? toDisplayEvent(row) : null;
}

export async function createScoreSubmission(
  requestId: string,
  provinceCode: string,
  inputItems: ScoreEntryItemInput[],
) {
  await ensureOrderRaceSchema();
  const validation = validateScoreEntry(requestId, provinceCode, inputItems);
  if (!validation.ok) return { kind: 'invalid' as const, message: validation.message };
  const existing = await findSubmission('request_id', validation.requestId);
  if (existing) {
    return { kind: 'existing' as const, submission: existing, displayEvent: await findDisplayEventBySubmission(existing.id) };
  }

  const [snapshot, ruleRows] = await Promise.all([getRankingSnapshot(), getPackageRuleRows()]);
  const pointsByPackage = new Map(ruleRows.map((row) => [row.code, Number(row.points)]));
  const items = validation.items.map(({ packageRule, quantity }) => {
    const unitPoints = pointsByPackage.get(packageRule.code) ?? packageRule.points;
    return { packageRule, quantity, unitPoints, subtotal: unitPoints * quantity };
  });
  const totalPoints = items.reduce((sum, item) => sum + item.subtotal, 0);
  const before = snapshot.provinces.find((province) => province.code === validation.province.code);
  if (!before) return { kind: 'invalid' as const, message: '请选择有效省份' };

  const createdAt = new Date().toISOString();
  const scoreAfter = before.score + totalPoints;
  const predicted = sortProvinces(snapshot.provinces.map((province) => province.code === validation.province.code
    ? { ...province, score: scoreAfter, latestScoreAt: createdAt, band: getScoreBand(scoreAfter).id }
    : province));
  const after = predicted.find((province) => province.code === validation.province.code) ?? before;
  const milestone = getHighestCrossedMilestone(before.score, scoreAfter);
  const submissionId = crypto.randomUUID();
  const displayEventId = crypto.randomUUID();
  const packageSummary = items.map((item) => `${item.packageRule.code}×${item.quantity}`).join(' · ');
  const db = getD1();

  try {
    await db.batch([
      db.prepare(`INSERT INTO score_submissions
        (id, request_id, province_code, total_points, created_at)
        VALUES (?, ?, ?, ?, ?)`).bind(
        submissionId,
        validation.requestId,
        validation.province.code,
        totalPoints,
        createdAt,
      ),
      ...items.map((item) => db.prepare(`INSERT INTO score_submission_items
        (id, submission_id, package_code, quantity, unit_points, subtotal)
        VALUES (?, ?, ?, ?, ?, ?)`).bind(
        crypto.randomUUID(),
        submissionId,
        item.packageRule.code,
        item.quantity,
        item.unitPoints,
        item.subtotal,
      )),
      db.prepare(`INSERT INTO display_events
        (id, submission_id, province_code, package_summary, total_points,
         score_before, score_after, rank_before, rank_after, milestone, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
        displayEventId,
        submissionId,
        validation.province.code,
        packageSummary,
        totalPoints,
        before.score,
        scoreAfter,
        before.rank,
        after.rank,
        milestone,
        createdAt,
      ),
    ]);
  } catch (error) {
    const duplicate = await findSubmission('request_id', validation.requestId);
    if (duplicate) {
      return { kind: 'existing' as const, submission: duplicate, displayEvent: await findDisplayEventBySubmission(duplicate.id) };
    }
    throw error;
  }

  const submission = await findSubmission('id', submissionId);
  const displayEvent = await findDisplayEventBySubmission(submissionId);
  if (!submission || !displayEvent) throw new Error('积分录入后无法读取');
  return { kind: 'created' as const, submission, displayEvent };
}

export async function revokeScoreSubmission(id: string) {
  await ensureOrderRaceSchema();
  if (!id) return { kind: 'invalid' as const, message: '缺少需要撤销的记录' };
  const existing = await findSubmission('id', id);
  if (!existing) return { kind: 'missing' as const };
  if (existing.revokedAt) return { kind: 'already_revoked' as const, submission: existing };
  await getD1().prepare(
    'UPDATE score_submissions SET revoked_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL',
  ).bind(id).run();
  const submission = await findSubmission('id', id);
  if (!submission) throw new Error('撤销后无法读取积分流水');
  return { kind: 'revoked' as const, submission };
}

type ExportLineRow = {
  submissionId: string;
  provinceCode: string;
  totalPoints: number;
  createdAt: string;
  revokedAt: string | null;
  packageCode: string;
  quantity: number;
  unitPoints: number;
  subtotal: number;
};

type PackageCountRow = {
  provinceCode: string;
  packageCode: string;
  quantity: number;
};

export async function getScoreExportWorkbook() {
  await ensureOrderRaceSchema();
  const db = getD1();
  const [lineResult, packageCountResult, snapshot] = await Promise.all([
    db.prepare(`SELECT s.id AS submissionId, s.province_code AS provinceCode, s.total_points AS totalPoints,
      s.created_at AS createdAt, s.revoked_at AS revokedAt, i.package_code AS packageCode,
      i.quantity, i.unit_points AS unitPoints, i.subtotal
      FROM score_submissions s
      JOIN score_submission_items i ON i.submission_id = s.id
      ORDER BY s.created_at ASC, s.id ASC, i.package_code ASC`).all<ExportLineRow>(),
    db.prepare(`SELECT s.province_code AS provinceCode, i.package_code AS packageCode,
      COALESCE(SUM(i.quantity), 0) AS quantity
      FROM score_submissions s
      JOIN score_submission_items i ON i.submission_id = s.id
      WHERE s.revoked_at IS NULL
      GROUP BY s.province_code, i.package_code`).all<PackageCountRow>(),
    getRankingSnapshot(),
  ]);

  const packageCounts = new Map<string, Record<'A' | 'B' | 'C', number>>();
  for (const row of packageCountResult.results) {
    const current = packageCounts.get(row.provinceCode) ?? { A: 0, B: 0, C: 0 };
    if (row.packageCode === 'A' || row.packageCode === 'B' || row.packageCode === 'C') {
      current[row.packageCode] = Number(row.quantity);
    }
    packageCounts.set(row.provinceCode, current);
  }

  return {
    details: lineResult.results.flatMap((row) => {
      const province = getProvince(row.provinceCode);
      const rule = getPackageRule(row.packageCode);
      if (!province || !rule) return [];
      return [{
        createdAt: row.createdAt,
        provinceName: province.name,
        packageCode: rule.code,
        packageTitle: rule.title,
        quantity: Number(row.quantity),
        unitPoints: Number(row.unitPoints),
        subtotal: Number(row.subtotal),
        totalPoints: Number(row.totalPoints),
        status: row.revokedAt ? '已撤销' : '有效',
        submissionId: row.submissionId,
      }];
    }),
    summaries: snapshot.provinces.map((province) => {
      const counts = packageCounts.get(province.code) ?? { A: 0, B: 0, C: 0 };
      return {
        rank: province.rank,
        provinceName: province.name,
        entryCount: province.entryCount,
        packageA: counts.A,
        packageB: counts.B,
        packageC: counts.C,
        score: province.score,
        latestScoreAt: province.latestScoreAt,
      };
    }),
    exportedAt: snapshot.updatedAt,
  };
}

export async function getDisplayEvents(after: number, limit = 50) {
  await ensureOrderRaceSchema();
  const safeAfter = Number.isSafeInteger(after) && after >= 0 ? after : 0;
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));
  const result = await getD1().prepare(`SELECT cursor, id, submission_id AS submissionId,
    province_code AS provinceCode, package_summary AS packageSummary, total_points AS totalPoints,
    score_before AS scoreBefore, score_after AS scoreAfter, rank_before AS rankBefore,
    rank_after AS rankAfter, milestone, created_at AS createdAt
    FROM display_events WHERE cursor > ? ORDER BY cursor ASC LIMIT ?`)
    .bind(safeAfter, safeLimit + 1).all<DisplayEventRow>();
  const hasMore = result.results.length > safeLimit;
  const rows = result.results.slice(0, safeLimit);
  const events = rows.map(toDisplayEvent).filter((event): event is DisplayEvent => event !== null);
  return {
    events,
    nextCursor: events.at(-1)?.cursor ?? safeAfter,
    hasMore,
  };
}

export async function updatePackagePoints(packageCode: string, points: number) {
  await ensureOrderRaceSchema();
  const rule = getPackageRule(packageCode);
  if (!rule) return { kind: 'invalid' as const, message: '套餐不存在' };
  if (!Number.isInteger(points) || points < 1 || points > 100000) {
    return { kind: 'invalid' as const, message: '套餐积分必须是1至100000的整数' };
  }
  const current = await getD1().prepare('SELECT points FROM package_rules WHERE code = ?')
    .bind(rule.code).first<{ points: number }>();
  const oldPoints = Number(current?.points ?? rule.points);
  if (oldPoints === points) return { kind: 'unchanged' as const, code: rule.code, points };
  const changedAt = new Date().toISOString();
  const db = getD1();
  await db.batch([
    db.prepare('UPDATE package_rules SET points = ?, updated_at = ? WHERE code = ?')
      .bind(points, changedAt, rule.code),
    db.prepare(`INSERT INTO package_rule_changes
      (id, package_code, old_points, new_points, created_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), rule.code, oldPoints, points, changedAt),
  ]);
  return { kind: 'updated' as const, code: rule.code, oldPoints, points, updatedAt: changedAt };
}
