ALTER TABLE "photo_queue_entry" DROP CONSTRAINT "photo_queue_entry_status_check";
--> statement-breakpoint
ALTER TABLE "photo_queue_entry" ADD CONSTRAINT "photo_queue_entry_status_check" CHECK ("photo_queue_entry"."photo_status" in ('WAITING', 'PHOTOGRAPHED', 'ABSENT', 'CANCELLED'));
