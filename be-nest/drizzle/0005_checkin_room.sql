CREATE TABLE "user_checkin_room" (
	"user_id" text NOT NULL,
	"room" varchar(50) NOT NULL,
	CONSTRAINT "user_checkin_room_user_id_room_pk" PRIMARY KEY("user_id","room")
);
--> statement-breakpoint
ALTER TABLE "bachelor" ADD COLUMN "checkin_room" varchar(50);--> statement-breakpoint
ALTER TABLE "user_checkin_room" ADD CONSTRAINT "user_checkin_room_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bachelor_checkin_room_normalized_idx" ON "bachelor" USING btree (lower("checkin_room"));