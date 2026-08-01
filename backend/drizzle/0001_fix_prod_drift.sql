-- Reconcile prod drift with the baseline schema.
-- Idempotent: a fresh DB (where baseline already created everything correctly)
-- runs this as a series of no-ops. A drifted DB (prod, where scans/vcards have
-- uuid columns and missing FKs) gets the actual fixes applied.

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'scans' AND column_name = 'user_id') = 'uuid' THEN
    ALTER TABLE "scans" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.scans') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'scans_user_id_users_id_fk'
          AND conrelid = 'public.scans'::regclass
      ) THEN
    ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vcards' AND column_name = 'id') = 'uuid' THEN
    ALTER TABLE "vcards" ALTER COLUMN "id" TYPE text USING "id"::text;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'vcards' AND column_name = 'user_id') = 'uuid' THEN
    ALTER TABLE "vcards" ALTER COLUMN "user_id" TYPE text USING "user_id"::text;
  END IF;
END $$;--> statement-breakpoint

DO $$ BEGIN
  IF to_regclass('public.vcards') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'vcards_user_id_users_id_fk'
          AND conrelid = 'public.vcards'::regclass
      ) THEN
    ALTER TABLE "vcards" ADD CONSTRAINT "vcards_user_id_users_id_fk"
      FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
  END IF;
END $$;--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "scan_areas_user_id_idx" ON "scan_areas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_areas_area_id_idx" ON "scan_areas" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_areas_user_area_idx" ON "scan_areas" USING btree ("user_id","area_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_area_records_area_id_idx" ON "scan_area_records" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_area_records_user_id_idx" ON "scan_area_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scan_area_records_timestamp_idx" ON "scan_area_records" USING btree ("timestamp");
