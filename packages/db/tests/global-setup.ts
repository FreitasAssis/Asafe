import postgres from "postgres";
import { db, closeDb } from "../src/client";
import { seedSlotTemplates } from "../src/seed/slot-templates";
import { seedGlobalTags } from "../src/seed/global-tags";

export async function setup() {
  await seedSlotTemplates(db);
  await seedGlobalTags(db);
  await closeDb();
}

/**
 * Limpa TUDO que os testes criaram (usuários `@asafe.test` e seus dados), em ordem
 * FK-safe. Preserva o seed (slot_template, tags globais) e usuários reais (ex.: admin
 * `@outlook.com`). As FKs para `user` são NO ACTION, então deletamos os filhos primeiro.
 */
export async function teardown() {
  const TU = `(select id from public."user" where email like '%@asafe.test')`;
  const TR = `(select id from public.repertoire where owner_id in ${TU})`;
  const TS = `(select id from public.song where owner_id in ${TU})`;
  const TG = `(select id from public."group" where owner_id in ${TU})`;

  const stmts = [
    `delete from public.repertoire_item where repertoire_id in ${TR} or song_id in ${TS};`,
    `delete from public.repertoire_theme where repertoire_id in ${TR};`,
    `delete from public.share_link where repertoire_id in ${TR};`,
    `delete from public.song_tag where song_id in ${TS};`,
    `delete from public.moderation_event where moderator_id in ${TU} or target_id in ${TS} or target_id in ${TR};`,
    `delete from public.authorized_source where created_by in ${TU};`,
    `delete from public.user_song_tag_override where user_id in ${TU} or song_id in ${TS};`,
    `delete from public.membership where user_id in ${TU} or group_id in ${TG};`,
    `delete from public.group_invite where group_id in ${TG};`,
    `delete from public.join_request where user_id in ${TU} or group_id in ${TG};`,
    `delete from public.repertoire where owner_id in ${TU};`,
    `delete from public.song where owner_id in ${TU};`,
    `delete from public.tag where owner_id in ${TU};`,
    `delete from public."group" where owner_id in ${TU};`,
    `delete from auth.users where email like '%@asafe.test';`,
  ];

  const client = postgres(process.env.DATABASE_URL!);
  try {
    await client.unsafe(stmts.join("\n"));
  } finally {
    await client.end();
  }
}
