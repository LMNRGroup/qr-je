ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "leftie" boolean NOT NULL DEFAULT false;
