ALTER TABLE "photo_queue_entry" DROP CONSTRAINT "photo_queue_entry_status_check";
--> statement-breakpoint
DROP INDEX "photo_queue_entry_bachelor_photo_session_uidx";
--> statement-breakpoint
ALTER TABLE "photo_queue_entry" ADD CONSTRAINT "photo_queue_entry_status_check" CHECK ("photo_queue_entry"."photo_status" in ('WAITING', 'PHOTOGRAPHED', 'CANCELLED'));
--> statement-breakpoint
CREATE UNIQUE INDEX "photo_queue_entry_bachelor_photo_session_uidx" ON "photo_queue_entry" USING btree ("bachelor_id","photo_session_id") WHERE "photo_status" <> 'CANCELLED';
