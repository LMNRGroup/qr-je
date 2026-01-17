import { index, jsonb, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email'),
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
