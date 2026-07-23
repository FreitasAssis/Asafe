-- Excluir uma música passa a remover automaticamente as relações que são DELA:
-- os vínculos de tag (song_tag) e os overrides pessoais de tag
-- (user_song_tag_override). Antes essas FKs eram NO ACTION e bloqueavam a exclusão
-- sem sentido (a relação só existe por causa da música).
--
-- repertoire_item NÃO cascateia de propósito: uma música em uso num repertório
-- deve BLOQUEAR a exclusão (senão corromperia o repertório); a UI mostra o porquê.

alter table "song_tag" drop constraint "song_tag_song_id_song_id_fk";--> statement-breakpoint
alter table "song_tag" add constraint "song_tag_song_id_song_id_fk"
  foreign key ("song_id") references "public"."song"("id") on delete cascade on update no action;--> statement-breakpoint

alter table "user_song_tag_override" drop constraint "user_song_tag_override_song_id_song_id_fk";--> statement-breakpoint
alter table "user_song_tag_override" add constraint "user_song_tag_override_song_id_song_id_fk"
  foreign key ("song_id") references "public"."song"("id") on delete cascade on update no action;