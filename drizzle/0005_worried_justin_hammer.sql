CREATE TABLE "teyvat_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"revision" text NOT NULL,
	"ordinal" integer NOT NULL,
	"content" text NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teyvat_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"license" text NOT NULL,
	"uri" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "teyvat_documents" ADD COLUMN "source_id" text DEFAULT 'gi-data' NOT NULL;--> statement-breakpoint
ALTER TABLE "teyvat_documents" ADD COLUMN "revision" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "teyvat_documents" ADD COLUMN "content_hash" varchar(64) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "teyvat_chunks" ADD CONSTRAINT "teyvat_chunks_document_id_teyvat_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."teyvat_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "teyvat_chunks_document_ordinal_idx" ON "teyvat_chunks" USING btree ("document_id","ordinal");--> statement-breakpoint
CREATE INDEX "teyvat_chunks_revision_idx" ON "teyvat_chunks" USING btree ("revision");