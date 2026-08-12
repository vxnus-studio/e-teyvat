CREATE TABLE "banner_character_statistics" (
	"character_id" integer PRIMARY KEY NOT NULL,
	"appearance_count" integer DEFAULT 0 NOT NULL,
	"completed_interval_count" integer DEFAULT 0 NOT NULL,
	"current_wait" integer DEFAULT 0 NOT NULL,
	"mean_interval" double precision,
	"median_interval" double precision,
	"minimum_interval" integer,
	"maximum_interval" integer,
	"mode_intervals" jsonb,
	"intervals" jsonb,
	"appearance_phase_indices" jsonb,
	"current_wait_percentile" double precision,
	"pressure_score" integer,
	"pressure_level" text,
	"confidence_score" integer,
	"confidence_level" text,
	"reasons" jsonb,
	"calculated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"model_version" text DEFAULT 'rerun-pressure-v1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banner_phase_characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"phase_id" integer NOT NULL,
	"character_id" integer,
	"character_name" text NOT NULL,
	"rarity" integer NOT NULL,
	"featured" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banner_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"game" text DEFAULT 'genshin' NOT NULL,
	"version" text NOT NULL,
	"phase_number" integer NOT NULL,
	"phase_key" text NOT NULL,
	"sequence_index" integer NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"status" text DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "banner_phases_phase_key_unique" UNIQUE("phase_key"),
	CONSTRAINT "banner_phases_sequence_index_unique" UNIQUE("sequence_index")
);
--> statement-breakpoint
CREATE TABLE "banner_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"repository_url" text NOT NULL,
	"file_path" text NOT NULL,
	"commit_sha" text NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now(),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "banner_character_statistics" ADD CONSTRAINT "banner_character_statistics_character_id_entities_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_phase_characters" ADD CONSTRAINT "banner_phase_characters_phase_id_banner_phases_id_fk" FOREIGN KEY ("phase_id") REFERENCES "public"."banner_phases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banner_phase_characters" ADD CONSTRAINT "banner_phase_characters_character_id_entities_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."entities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "banner_phase_chars_phase_char_uidx" ON "banner_phase_characters" USING btree ("phase_id","character_id");--> statement-breakpoint
CREATE UNIQUE INDEX "banner_phase_chars_phase_name_uidx" ON "banner_phase_characters" USING btree ("phase_id","character_name");