DROP INDEX "teyvat_entities_kind_slug_uidx";--> statement-breakpoint
CREATE INDEX "teyvat_entities_kind_slug_idx" ON "teyvat_entities" USING btree ("kind","slug");