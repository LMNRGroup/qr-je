CREATE TABLE "scan_area_records" (
	"id" text PRIMARY KEY NOT NULL,
	"area_id" text NOT NULL,
	"user_id" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"ip" text,
	"city" text,
	"region" text,
	"country_code" text,
	"device" text,
	"browser" text,
	"response_ms" integer
);
--> statement-breakpoint
CREATE TABLE "scan_areas" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"area_id" text NOT NULL,
	"label" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"lat" double precision,
	"lon" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" text PRIMARY KEY NOT NULL,
	"url_id" text NOT NULL,
	"url_random" text NOT NULL,
	"user_id" text NOT NULL,
	"ip" text,
	"user_agent" text,
	"response_ms" integer,
	"scanned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "urls" (
	"id" text NOT NULL,
	"random" text NOT NULL,
	"user_id" text NOT NULL,
	"virtual_card_id" text,
	"target_url" text NOT NULL,
	"name" text,
	"kind" text,
	"options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "urls_pkey" PRIMARY KEY("id","random")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"username" text,
	"timezone" text,
	"language" text,
	"theme" text,
	"avatar_type" text,
	"avatar_color" text,
	"leftie" boolean DEFAULT false NOT NULL,
	"username_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vcards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"slug" text NOT NULL,
	"public_url" text NOT NULL,
	"short_id" text NOT NULL,
	"short_random" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scan_area_records" ADD CONSTRAINT "scan_area_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_areas" ADD CONSTRAINT "scan_areas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "urls" ADD CONSTRAINT "urls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vcards" ADD CONSTRAINT "vcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scan_area_records_area_id_idx" ON "scan_area_records" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "scan_area_records_user_id_idx" ON "scan_area_records" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scan_area_records_timestamp_idx" ON "scan_area_records" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "scan_areas_user_id_idx" ON "scan_areas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scan_areas_area_id_idx" ON "scan_areas" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "scan_areas_user_area_idx" ON "scan_areas" USING btree ("user_id","area_id");--> statement-breakpoint
CREATE INDEX "scans_url_idx" ON "scans" USING btree ("url_id","url_random");--> statement-breakpoint
CREATE INDEX "scans_user_idx" ON "scans" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "urls_user_id_idx" ON "urls" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vcards_user_id_idx" ON "vcards" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vcards_user_slug_idx" ON "vcards" USING btree ("user_id","slug");
