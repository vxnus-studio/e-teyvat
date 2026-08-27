CREATE TABLE "character_build_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_slug" text NOT NULL,
	"character_id" text,
	"role" text NOT NULL,
	"title" text,
	"is_primary" boolean DEFAULT true NOT NULL,
	"playstyle" text,
	"weapon_recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"artifact_recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"main_stats" jsonb DEFAULT '{"sands":[],"goblet":[],"circlet":[]}'::jsonb NOT NULL,
	"substat_priority" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"stat_targets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"talent_priority" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"team_recommendations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"rotation_guide" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"author_notes" text,
	"provenance" jsonb DEFAULT '{"source":"KeqingMains"}'::jsonb NOT NULL,
	"game_version" text DEFAULT '5.4' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "character_build_recommendations" ADD CONSTRAINT "character_build_recommendations_character_id_teyvat_entities_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."teyvat_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "char_build_slug_idx" ON "character_build_recommendations" USING btree ("character_slug");--> statement-breakpoint
CREATE INDEX "char_build_primary_idx" ON "character_build_recommendations" USING btree ("character_slug","is_primary");