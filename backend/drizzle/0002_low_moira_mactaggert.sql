CREATE TABLE "billing_records" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"billing_plan" text DEFAULT 'free' NOT NULL,
	"billing_status" text,
	"billing_price_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_records" ADD CONSTRAINT "billing_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "billing_records_stripe_customer_idx" ON "billing_records" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "billing_records_subscription_idx" ON "billing_records" USING btree ("stripe_subscription_id");