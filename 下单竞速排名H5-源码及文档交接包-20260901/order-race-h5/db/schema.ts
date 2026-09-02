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
