CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "aliases" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"language" text DEFAULT 'English' NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_key" text NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"canonical_data" jsonb NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"game_version" text,
	"source_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_seen_sync_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_id" integer NOT NULL,
	"section" text NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"embedding" vector(768),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"subject_id" integer NOT NULL,
	"predicate" text NOT NULL,
	"object_id" integer NOT NULL,
	"source_path" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_seen_sync_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"source" text DEFAULT 'genshin-db-api-v5' NOT NULL,
	"source_revision" text,
	"content_digest" varchar(64),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"entity_count" integer DEFAULT 0 NOT NULL,
	"relation_count" integer DEFAULT 0 NOT NULL,
	"unresolved_relation_count" integer DEFAULT 0 NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text
);
--> statement-breakpoint
ALTER TABLE "aliases" ADD CONSTRAINT "aliases_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_last_seen_sync_id_sync_runs_id_fk" FOREIGN KEY ("last_seen_sync_id") REFERENCES "public"."sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_subject_id_entities_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_object_id_entities_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relations" ADD CONSTRAINT "relations_last_seen_sync_id_sync_runs_id_fk" FOREIGN KEY ("last_seen_sync_id") REFERENCES "public"."sync_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "aliases_entity_language_alias_uidx" ON "aliases" USING btree ("entity_id","language","normalized_alias");--> statement-breakpoint
CREATE INDEX "aliases_normalized_idx" ON "aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_source_key_uidx" ON "entities" USING btree ("source_key");--> statement-breakpoint
CREATE UNIQUE INDEX "entities_kind_slug_uidx" ON "entities" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "entities_kind_active_name_idx" ON "entities" USING btree ("kind","is_active","name");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_documents_entity_section_uidx" ON "knowledge_documents" USING btree ("entity_id","section");--> statement-breakpoint
CREATE INDEX "knowledge_documents_entity_idx" ON "knowledge_documents" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "knowledge_documents_fts_idx" ON "knowledge_documents" USING gin (to_tsvector('english', "content"));--> statement-breakpoint
CREATE UNIQUE INDEX "relations_identity_uidx" ON "relations" USING btree ("subject_id","predicate","object_id","source_path");--> statement-breakpoint
CREATE INDEX "relations_subject_predicate_idx" ON "relations" USING btree ("subject_id","predicate");--> statement-breakpoint
CREATE INDEX "relations_object_predicate_idx" ON "relations" USING btree ("object_id","predicate");--> statement-breakpoint
CREATE INDEX "sync_runs_status_started_idx" ON "sync_runs" USING btree ("status","started_at");
