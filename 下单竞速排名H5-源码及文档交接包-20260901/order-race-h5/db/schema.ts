import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const orderEvents = sqliteTable(
  'order_events',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    provinceCode: text('province_code').notNull(),
    packageCode: text('package_code').notNull(),
    points: integer('points').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: text('revoked_at'),
  },
  (table) => [
    uniqueIndex('idx_order_events_request_id').on(table.requestId),
    index('idx_order_events_province_created').on(table.provinceCode, table.createdAt),
    index('idx_order_events_package_created').on(table.packageCode, table.createdAt),
    index('idx_order_events_created_at').on(table.createdAt),
  ],
);

export const scoreSubmissions = sqliteTable(
  'score_submissions',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').notNull(),
    provinceCode: text('province_code').notNull(),
    totalPoints: integer('total_points').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
    revokedAt: text('revoked_at'),
  },
  (table) => [
    uniqueIndex('idx_score_submissions_request_id').on(table.requestId),
    index('idx_score_submissions_province_created').on(table.provinceCode, table.createdAt),
    index('idx_score_submissions_created_at').on(table.createdAt),
  ],
);

export const scoreSubmissionItems = sqliteTable(
  'score_submission_items',
  {
    id: text('id').primaryKey(),
    submissionId: text('submission_id').notNull(),
    packageCode: text('package_code').notNull(),
    quantity: integer('quantity').notNull(),
    unitPoints: integer('unit_points').notNull(),
    subtotal: integer('subtotal').notNull(),
  },
  (table) => [
    index('idx_score_submission_items_submission').on(table.submissionId),
    index('idx_score_submission_items_package').on(table.packageCode),
  ],
);

export const displayEvents = sqliteTable(
  'display_events',
  {
    cursor: integer('cursor').primaryKey({ autoIncrement: true }),
    id: text('id').notNull(),
    submissionId: text('submission_id').notNull(),
    provinceCode: text('province_code').notNull(),
    packageSummary: text('package_summary').notNull(),
    totalPoints: integer('total_points').notNull(),
    scoreBefore: integer('score_before').notNull(),
    scoreAfter: integer('score_after').notNull(),
    rankBefore: integer('rank_before').notNull(),
    rankAfter: integer('rank_after').notNull(),
    milestone: integer('milestone'),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    uniqueIndex('idx_display_events_id').on(table.id),
    uniqueIndex('idx_display_events_submission').on(table.submissionId),
  ],
);

export const packageRules = sqliteTable('package_rules', {
  code: text('code').primaryKey(),
  points: integer('points').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const packageRuleChanges = sqliteTable(
  'package_rule_changes',
  {
    id: text('id').primaryKey(),
    packageCode: text('package_code').notNull(),
    oldPoints: integer('old_points').notNull(),
    newPoints: integer('new_points').notNull(),
    createdAt: text('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index('idx_package_rule_changes_created').on(table.createdAt)],
);
