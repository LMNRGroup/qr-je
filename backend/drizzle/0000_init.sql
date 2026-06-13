CREATE TABLE IF NOT EXISTS "users" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "email" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "urls" (
  "id" text NOT NULL,
  "random" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "virtual_card_id" text,
  "target_url" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "urls_pkey" PRIMARY KEY ("id", "random")
);

CREATE INDEX IF NOT EXISTS "urls_user_id_idx" ON "urls" ("user_id");
