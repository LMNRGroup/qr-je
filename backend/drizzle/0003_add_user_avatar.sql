ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "avatar_type" text,
  ADD COLUMN IF NOT EXISTS "avatar_color" text;
