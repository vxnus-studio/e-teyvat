CREATE TABLE "teyvat_embeddings" (
	"id" text PRIMARY KEY NOT NULL,
	"chunk_id" text NOT NULL,
	"revision" text NOT NULL,
	"model" text NOT NULL,
	"provider" text NOT NULL,
	"dimensions" integer DEFAULT 768 NOT NULL,
	"content_hash" varchar(64) NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sync_runs" ALTER COLUMN "source" SET DEFAULT 'genshin-data';--> statement-breakpoint
ALTER TABLE "teyvat_embeddings" ADD CONSTRAINT "teyvat_embeddings_chunk_id_teyvat_chunks_id_fk" FOREIGN KEY ("chunk_id") REFERENCES "public"."teyvat_chunks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "teyvat_embeddings_chunk_revision_model_uidx" ON "teyvat_embeddings" USING btree ("chunk_id","revision","model");--> statement-breakpoint
CREATE INDEX "teyvat_embeddings_revision_model_idx" ON "teyvat_embeddings" USING btree ("revision","model");