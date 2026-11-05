INSERT INTO "permission" ("name", "description") VALUES
	('checkin.all-rooms', 'Check-in cho mọi phòng, không giới hạn theo phân phòng')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role" ("code", "name") VALUES
	('CL', 'Trưởng nhóm check-in')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "role_permission" ("role_code", "permission_name") VALUES
	('CL', 'checkin.execute'),
	('CL', 'checkin.all-rooms'),
	('MN', 'checkin.all-rooms')
ON CONFLICT DO NOTHING;
