-- Hand-written: trigram search and the immutable wrapper the generated "events"."search" column needs
-- (array_to_string is only STABLE, so it cannot appear in a generated column directly).
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE FUNCTION gatherly_tags_text(tags text[]) RETURNS text
	LANGUAGE sql IMMUTABLE PARALLEL SAFE
	RETURN array_to_string(tags, ' ');--> statement-breakpoint
CREATE TYPE "public"."interaction_type" AS ENUM('impression', 'click', 'view', 'save', 'unsave', 'hide', 'register', 'cancel');--> statement-breakpoint
CREATE TABLE "event_hides" (
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_hides_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "event_saves" (
	"user_id" uuid NOT NULL,
	"event_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_saves_user_id_event_id_pk" PRIMARY KEY("user_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "interactions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" uuid,
	"anonymous_id" uuid,
	"event_id" uuid NOT NULL,
	"type" "interaction_type" NOT NULL,
	"surface" text NOT NULL,
	"position" integer,
	"query" text,
	"ranker_version" text,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interactions_actor" CHECK ("interactions"."user_id" is not null or "interactions"."anonymous_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"interests" "category"[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"neighborhood" text,
	"home_lat" double precision,
	"home_lng" double precision,
	"radius_km" integer DEFAULT 10 NOT NULL,
	"formats" text[] DEFAULT '{"in_person","online"}' NOT NULL,
	"time_slots" text[] DEFAULT '{"weekday_daytime","weeknights","weekends"}' NOT NULL,
	"onboarded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "neighborhood" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', "title"), 'A') || setweight(to_tsvector('english', gatherly_tags_text("tags")), 'B') || setweight(to_tsvector('english', "summary"), 'C') || setweight(to_tsvector('english', "description"), 'D')) STORED;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bio" text;--> statement-breakpoint
ALTER TABLE "event_hides" ADD CONSTRAINT "event_hides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_hides" ADD CONSTRAINT "event_hides_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_saves" ADD CONSTRAINT "event_saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_saves" ADD CONSTRAINT "event_saves_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interactions" ADD CONSTRAINT "interactions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_hides_event_id_idx" ON "event_hides" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_saves_event_id_idx" ON "event_saves" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "interactions_user_id_created_at_idx" ON "interactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "interactions_event_id_idx" ON "interactions" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "events_search_idx" ON "events" USING gin ("search");--> statement-breakpoint
CREATE INDEX "events_title_trgm_idx" ON "events" USING gin ("title" gin_trgm_ops);