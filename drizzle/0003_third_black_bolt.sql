CREATE TABLE "teyvat_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"alias" text NOT NULL,
	"normalized_alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teyvat_dataset_revisions" (
	"revision" text PRIMARY KEY NOT NULL,
	"projection_version" text NOT NULL,
	"source_checksums" jsonb NOT NULL,
	"entity_count" integer NOT NULL,
	"alias_count" integer NOT NULL,
	"relation_count" integer NOT NULL,
	"document_count" integer NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teyvat_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"entity_id" text NOT NULL,
	"content" text NOT NULL,
	"provenance" jsonb,
	"category" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"parent_source_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teyvat_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"namespace" text NOT NULL,
	"kind" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"data" jsonb NOT NULL,
	"provenance" jsonb,
	"temporal" jsonb
);
--> statement-breakpoint
CREATE TABLE "teyvat_relations" (
	"id" text PRIMARY KEY NOT NULL,
	"subject_id" text NOT NULL,
	"predicate" text NOT NULL,
	"object_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"provenance" jsonb,
	"temporal" jsonb
);
--> statement-breakpoint
ALTER TABLE "teyvat_aliases" ADD CONSTRAINT "teyvat_aliases_entity_id_teyvat_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."teyvat_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teyvat_documents" ADD CONSTRAINT "teyvat_documents_entity_id_teyvat_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."teyvat_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teyvat_relations" ADD CONSTRAINT "teyvat_relations_subject_id_teyvat_entities_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."teyvat_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teyvat_relations" ADD CONSTRAINT "teyvat_relations_object_id_teyvat_entities_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."teyvat_entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teyvat_aliases_entity_alias_uidx" ON "teyvat_aliases" USING btree ("entity_id","normalized_alias");--> statement-breakpoint
CREATE INDEX "teyvat_aliases_normalized_idx" ON "teyvat_aliases" USING btree ("normalized_alias");--> statement-breakpoint
CREATE INDEX "teyvat_documents_entity_idx" ON "teyvat_documents" USING btree ("entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teyvat_entities_kind_slug_uidx" ON "teyvat_entities" USING btree ("kind","slug");--> statement-breakpoint
CREATE INDEX "teyvat_entities_kind_name_idx" ON "teyvat_entities" USING btree ("kind","name");--> statement-breakpoint
CREATE INDEX "teyvat_relations_subject_predicate_idx" ON "teyvat_relations" USING btree ("subject_id","predicate");--> statement-breakpoint
CREATE INDEX "teyvat_relations_object_predicate_idx" ON "teyvat_relations" USING btree ("object_id","predicate");