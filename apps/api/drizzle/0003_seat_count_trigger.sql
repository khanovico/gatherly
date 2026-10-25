-- registered_count follows the registration rows from here on. Every insert, status change or
-- delete of a seat-holding registration moves the counter, so no code path (an API handler, a
-- cascade from a deleted member, a manual fix) can leave the two out of step.
CREATE OR REPLACE FUNCTION gatherly_seat_delta() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  delta integer := 0;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') AND OLD.status IN ('pending_payment', 'confirmed') THEN
    delta := delta - 1;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.status IN ('pending_payment', 'confirmed') THEN
    delta := delta + 1;
  END IF;
  IF delta <> 0 THEN
    UPDATE "events" SET "registered_count" = "registered_count" + delta
      WHERE "id" = COALESCE(NEW.event_id, OLD.event_id);
  END IF;
  RETURN NULL;
END
$$;--> statement-breakpoint
CREATE TRIGGER "registrations_seat_count"
  AFTER INSERT OR UPDATE OF "status" OR DELETE ON "registrations"
  FOR EACH ROW EXECUTE FUNCTION gatherly_seat_delta();--> statement-breakpoint
-- A registration never moves between events; the trigger relies on that.
CREATE OR REPLACE FUNCTION gatherly_registration_event_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'registrations.event_id is immutable';
END
$$;--> statement-breakpoint
CREATE TRIGGER "registrations_event_immutable"
  BEFORE UPDATE OF "event_id" ON "registrations"
  FOR EACH ROW WHEN (OLD.event_id IS DISTINCT FROM NEW.event_id)
  EXECUTE FUNCTION gatherly_registration_event_immutable();--> statement-breakpoint
-- Bring any counter that drifted before the trigger existed back in line, once.
UPDATE "events" e SET "registered_count" = r.active
  FROM (
    SELECT e2."id", count(r2."id") FILTER (WHERE r2."status" IN ('pending_payment', 'confirmed')) AS active
    FROM "events" e2 LEFT JOIN "registrations" r2 ON r2."event_id" = e2."id"
    GROUP BY e2."id"
  ) r
  WHERE r."id" = e."id" AND e."registered_count" <> r.active;
