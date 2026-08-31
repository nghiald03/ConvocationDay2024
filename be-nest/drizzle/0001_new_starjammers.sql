CREATE TABLE "migration_checkpoint" (
	"phase" text PRIMARY KEY NOT NULL,
	"source_fingerprint" text NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
