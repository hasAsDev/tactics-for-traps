CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"username" text,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_stat" (
	"user_id" text NOT NULL,
	"day" date NOT NULL,
	"solved" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"storm_runs" integer DEFAULT 0 NOT NULL,
	"storm_best" integer DEFAULT 0 NOT NULL,
	"racer_runs" integer DEFAULT 0 NOT NULL,
	"racer_best" integer DEFAULT 0 NOT NULL,
	"pstreak_runs" integer DEFAULT 0 NOT NULL,
	"pstreak_best" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_stat_user_id_day_pk" PRIMARY KEY("user_id","day")
);
--> statement-breakpoint
CREATE TABLE "job_lease" (
	"name" text PRIMARY KEY NOT NULL,
	"holder" uuid,
	"until" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_day" (
	"link_id" integer NOT NULL,
	"day" date NOT NULL,
	"storm_runs" integer DEFAULT 0 NOT NULL,
	"storm_best" integer DEFAULT 0 NOT NULL,
	"racer_runs" integer DEFAULT 0 NOT NULL,
	"racer_best" integer DEFAULT 0 NOT NULL,
	"pstreak_runs" integer DEFAULT 0 NOT NULL,
	"pstreak_best" integer DEFAULT 0 NOT NULL,
	"feed_wins" integer DEFAULT 0 NOT NULL,
	"feed_losses" integer DEFAULT 0 NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_day_link_id_day_pk" PRIMARY KEY("link_id","day")
);
--> statement-breakpoint
CREATE TABLE "provider_link" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "provider_link_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"provider" text DEFAULT 'lichess' NOT NULL,
	"external_id" text NOT NULL,
	"external_username" text NOT NULL,
	"access_token_enc" text,
	"token_expires_at" timestamp with time zone,
	"status" text DEFAULT 'active' NOT NULL,
	"floor_ms" bigint NOT NULL,
	"synced_to_ms" bigint,
	"win_since_ms" bigint,
	"win_top_ms" bigint,
	"win_before_ms" bigint,
	"feed_polled_at" timestamp with time zone,
	"profile" jsonb,
	"profile_fetched_at" timestamp with time zone,
	"lock_token" uuid,
	"lock_until" timestamp with time zone,
	"manual_sync_at" timestamp with time zone,
	"last_sync_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"last_error" text,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "provider_link_status_ck" CHECK ("provider_link"."status" in ('active', 'needs_reauth'))
);
--> statement-breakpoint
CREATE TABLE "puzzle_event" (
	"link_id" integer NOT NULL,
	"puzzle_id" text NOT NULL,
	"played_at" timestamp with time zone NOT NULL,
	"win" boolean NOT NULL,
	"rating" smallint,
	"themes" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "puzzle_event_link_id_puzzle_id_pk" PRIMARY KEY("link_id","puzzle_id")
);
--> statement-breakpoint
CREATE TABLE "sync_run" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_run_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"link_id" integer,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"outcome" text,
	"fetched" integer DEFAULT 0 NOT NULL,
	"inserted" integer DEFAULT 0 NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "user_stat" (
	"user_id" text PRIMARY KEY NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"active_days" integer DEFAULT 0 NOT NULL,
	"total_solved" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak_end" date,
	"last_run_len" integer DEFAULT 0 NOT NULL,
	"last_run_end" date,
	"rules_version" integer DEFAULT 1 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_stat" ADD CONSTRAINT "daily_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_day" ADD CONSTRAINT "provider_day_link_id_provider_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."provider_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_link" ADD CONSTRAINT "provider_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "puzzle_event" ADD CONSTRAINT "puzzle_event_link_id_provider_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."provider_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_run" ADD CONSTRAINT "sync_run_link_id_provider_link_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."provider_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_stat" ADD CONSTRAINT "user_stat_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "daily_stat_day_idx" ON "daily_stat" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_link_external_uq" ON "provider_link" USING btree ("provider","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_link_user_uq" ON "provider_link" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "sync_run_started_idx" ON "sync_run" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "sync_run_link_idx" ON "sync_run" USING btree ("link_id","started_at");