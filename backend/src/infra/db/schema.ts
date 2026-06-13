import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email"),
  username: text("username"),
  timezone: text("timezone"),
  language: text("language"),
  theme: text("theme"),
  avatarType: text("avatar_type"),
  avatarColor: text("avatar_color"),
  leftie: boolean("leftie").notNull().default(false),
  usernameChangedAt: timestamp("username_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const billingRecords = pgTable(
  'billing_records',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    billingPlan: text('billing_plan').notNull().default('free'),
    billingStatus: text('billing_status'),
    billingPriceId: text('billing_price_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    stripeCustomerIdx: uniqueIndex('billing_records_stripe_customer_idx').on(table.stripeCustomerId),
    subscriptionIdx: index('billing_records_subscription_idx').on(table.stripeSubscriptionId)
  })
)

export const urls = pgTable(
  "urls",
  {
    id: text("id").notNull(),
    random: text("random").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    virtualCardId: text("virtual_card_id"),
    targetUrl: text("target_url").notNull(),
    name: text("name"),
    kind: text("kind"),
    options: jsonb("options").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.random] }),
    userIdIdx: index("urls_user_id_idx").on(table.userId),
  }),
);

export const vcards = pgTable(
  'vcards',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    publicUrl: text('public_url').notNull(),
    shortId: text('short_id').notNull(),
    shortRandom: text('short_random').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdIdx: index('vcards_user_id_idx').on(table.userId),
    userSlugIdx: uniqueIndex('vcards_user_slug_idx').on(table.userId, table.slug)
  })
)

export const scans = pgTable(
  "scans",
  {
    id: text("id").primaryKey(),
    urlId: text("url_id").notNull(),
    urlRandom: text("url_random").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ip: text("ip"),
    userAgent: text("user_agent"),
    responseMs: integer("response_ms"),
    scannedAt: timestamp("scanned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    urlIdx: index("scans_url_idx").on(table.urlId, table.urlRandom),
    userIdx: index("scans_user_idx").on(table.userId),
  }),
);

export const scanAreas = pgTable(
  "scan_areas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    areaId: text("area_id").notNull(),
    label: text("label").notNull(),
    count: integer("count").notNull().default(1),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull(),
    lat: doublePrecision("lat"),
    lon: doublePrecision("lon"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("scan_areas_user_id_idx").on(table.userId),
    areaIdIdx: index("scan_areas_area_id_idx").on(table.areaId),
    userAreaIdx: index("scan_areas_user_area_idx").on(
      table.userId,
      table.areaId,
    ),
  }),
);

export const scanAreaRecords = pgTable(
  "scan_area_records",
  {
    id: text("id").primaryKey(),
    areaId: text("area_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    ip: text("ip"),
    city: text("city"),
    region: text("region"),
    countryCode: text("country_code"),
    device: text("device"),
    browser: text("browser"),
    responseMs: integer("response_ms"),
  },
  (table) => ({
    areaIdIdx: index("scan_area_records_area_id_idx").on(table.areaId),
    userIdIdx: index("scan_area_records_user_id_idx").on(table.userId),
    timestampIdx: index("scan_area_records_timestamp_idx").on(table.timestamp),
  }),
);
