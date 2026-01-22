import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  username: text('username'),
  timezone: text('timezone'),
  language: text('language'),
  theme: text('theme'),
  avatarType: text('avatar_type'),
  avatarColor: text('avatar_color'),
  leftie: boolean('leftie').notNull().default(false),
  usernameChangedAt: timestamp('username_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
})

export const urls = pgTable(
  'urls',
  {
    id: text('id').notNull(),
    random: text('random').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    virtualCardId: text('virtual_card_id'),
    targetUrl: text('target_url').notNull(),
    name: text('name'),
    kind: text('kind'),
    options: jsonb('options').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.random] }),
    userIdIdx: index('urls_user_id_idx').on(table.userId)
  })
)

export const scans = pgTable(
  'scans',
  {
    id: text('id').primaryKey(),
    urlId: text('url_id').notNull(),
    urlRandom: text('url_random').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    ip: text('ip'),
    userAgent: text('user_agent'),
    responseMs: integer('response_ms'),
    scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    urlIdx: index('scans_url_idx').on(table.urlId, table.urlRandom),
    userIdx: index('scans_user_idx').on(table.userId)
  })
)
