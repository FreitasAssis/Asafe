CREATE INDEX "song_owner_id_idx" ON "song" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "song_tag_tag_id_idx" ON "song_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "repertoire_owner_id_idx" ON "repertoire" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "repertoire_group_id_idx" ON "repertoire" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "repertoire_community_status_idx" ON "repertoire" USING btree ("community_status") WHERE "repertoire"."community_status" <> 'none';--> statement-breakpoint
CREATE INDEX "repertoire_item_repertoire_id_idx" ON "repertoire_item" USING btree ("repertoire_id");--> statement-breakpoint
CREATE INDEX "repertoire_item_song_id_idx" ON "repertoire_item" USING btree ("song_id");