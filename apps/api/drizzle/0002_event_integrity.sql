-- Events cancelled before cancelling released seats: cancel their remaining registrations.
UPDATE "registrations" SET "status" = 'cancelled', "cancelled_at" = now() WHERE "status" IN ('pending_payment', 'confirmed') AND "event_id" IN (SELECT "id" FROM "events" WHERE "status" = 'cancelled');--> statement-breakpoint
UPDATE "events" SET "registered_count" = 0 WHERE "status" = 'cancelled' AND "registered_count" <> 0;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_capacity_positive" CHECK ("events"."capacity" > 0);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_ends_after_starts" CHECK ("events"."ends_at" > "events"."starts_at");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_price_non_negative" CHECK ("events"."price_cents" >= 0);