import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../src/client";

const url = process.env.SUPABASE_URL!;
const anon = process.env.SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Cliente service role: contorna RLS, usado para semear dados de referência/catálogo. */
const service = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function signUp(email: string) {
  const c = createClient(url, anon);
  const { data, error } = await c.auth.signUp({
    email,
    password: "pw-123456",
  });
  if (error) throw error;
  return { client: c, userId: data.user!.id };
}

const uniq = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/** Ids de dados globais (owner_id null) criados pelos testes, limpos no afterAll. */
const createdGlobalSongIds: string[] = [];
const createdGlobalTagIds: string[] = [];

/** Insere uma tag global via service role e registra o id para limpeza. */
async function seedGlobalTag(name: string, category: string) {
  const { data, error } = await service
    .from("tag")
    .insert({ name, category, owner_id: null })
    .select()
    .single();
  if (error) throw error;
  createdGlobalTagIds.push(data!.id as string);
  return data!;
}

/** Apaga (service role) os dados globais criados pelos testes, dependentes primeiro. */
afterAll(async () => {
  if (createdGlobalSongIds.length) {
    await service.from("song_tag").delete().in("song_id", createdGlobalSongIds);
    await service
      .from("user_song_tag_override")
      .delete()
      .in("song_id", createdGlobalSongIds);
    await service
      .from("repertoire_item")
      .delete()
      .in("song_id", createdGlobalSongIds);
    await service.from("song").delete().in("id", createdGlobalSongIds);
  }
  if (createdGlobalTagIds.length) {
    await service.from("song_tag").delete().in("tag_id", createdGlobalTagIds);
    await service
      .from("user_song_tag_override")
      .delete()
      .in("tag_id", createdGlobalTagIds);
    await service
      .from("repertoire_theme")
      .delete()
      .in("tag_id", createdGlobalTagIds);
    await service.from("tag").delete().in("id", createdGlobalTagIds);
  }
});

/** Semeia uma song global (owner_id null) via service role. */
async function seedGlobalSong(title: string) {
  const { data, error } = await service
    .from("song")
    .insert({ title, owner_id: null })
    .select()
    .single();
  if (error) throw error;
  createdGlobalSongIds.push(data!.id as string);
  return data!.id as string;
}

/** Dono A cria um grupo e adiciona `memberId` como membro. Retorna group id. */
async function createGroupWithMember(
  owner: Awaited<ReturnType<typeof signUp>>,
  memberId: string,
) {
  const { data: g, error: gErr } = await owner.client
    .from("group")
    .insert({ name: `Grupo ${uniq()}`, owner_id: owner.userId })
    .select()
    .single();
  if (gErr) throw gErr;
  const { error: mErr } = await owner.client.from("membership").insert({
    user_id: memberId,
    group_id: g!.id,
    role: "viewer",
  });
  if (mErr) throw mErr;
  return g!.id as string;
}

/** Dono A cria um grupo (sem membros) e retorna o group id. */
async function createGroup(owner: Awaited<ReturnType<typeof signUp>>) {
  const { data: g, error: gErr } = await owner.client
    .from("group")
    .insert({ name: `Grupo ${uniq()}`, owner_id: owner.userId })
    .select()
    .single();
  if (gErr) throw gErr;
  return g!.id as string;
}

/** Dono adiciona `memberId` ao grupo com o papel informado. */
async function addMember(
  owner: Awaited<ReturnType<typeof signUp>>,
  groupId: string,
  memberId: string,
  role: "owner" | "editor" | "viewer",
) {
  const { error } = await owner.client
    .from("membership")
    .insert({ user_id: memberId, group_id: groupId, role });
  if (error) throw error;
}

/** Cliente autenticado, como o inferido por signUp (evita o `never` de ReturnType<typeof createClient>). */
type TestClient = Awaited<ReturnType<typeof signUp>>["client"];

/** Cria um repertório e o vincula a um grupo (#79: compartilhamento agora é N-para-N). */
async function insertGroupRep(
  client: TestClient,
  fields: { title: string; type: string; owner_id: string },
  groupId: string,
) {
  const res = await client
    .from("repertoire")
    .insert({ ...fields, visibility: "group" })
    .select()
    .single();
  if (res.data) {
    await client
      .from("repertoire_group")
      .insert({ repertoire_id: (res.data as { id: string }).id, group_id: groupId });
  }
  return res;
}

describe("repertoire (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("repertório privado de A é visível para A e invisível para B", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const { data: rep, error: insErr } = await a.client
      .from("repertoire")
      .insert({
        title: "Privado de A",
        type: "Missa",
        owner_id: a.userId,
        visibility: "private",
      })
      .select()
      .single();
    expect(insErr).toBeNull();
    expect(rep!.owner_id).toBe(a.userId);

    const { data: aSel, error: aErr } = await a.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(aErr).toBeNull();
    expect(aSel).toHaveLength(1);

    const { data: bSel, error: bErr } = await b.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(0);
  });

  // A visibilidade 'public' sozinha NÃO expõe (isso era um vazamento). Tornar público é via
  // moderação (community_status='approved') — ver comunidade.test.ts.
  it("visibility='public' NÃO expõe o repertório de A para B", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const { data: rep, error: insErr } = await a.client
      .from("repertoire")
      .insert({
        title: "Público de A",
        type: "Missa",
        owner_id: a.userId,
        visibility: "public",
      })
      .select()
      .single();
    expect(insErr).toBeNull();

    const { data: bSel, error: bErr } = await b.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(bErr).toBeNull();
    expect(bSel ?? []).toHaveLength(0);
  });

  it("repertório de grupo: membro B vê, não-membro C não vê", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);
    const c = await signUp(`c_${uniq()}@asafe.test`);

    const groupId = await createGroupWithMember(a, b.userId);

    const { data: rep, error: insErr } = await insertGroupRep(
      a.client,
      { title: "De grupo", type: "Missa", owner_id: a.userId },
      groupId,
    );
    expect(insErr).toBeNull();

    const { data: bSel, error: bErr } = await b.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(1);

    const { data: cSel, error: cErr } = await c.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(cErr).toBeNull();
    expect(cSel).toHaveLength(0);
  });
});

describe("repertoire_item (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("item segue a visibilidade do pai: membro B vê, não-membro C não", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);
    const c = await signUp(`c_${uniq()}@asafe.test`);

    const groupId = await createGroupWithMember(a, b.userId);
    const songId = await seedGlobalSong(`Song ${uniq()}`);

    const { data: rep, error: repErr } = await a.client
      .from("repertoire")
      .insert({ title: "Com itens", type: "Missa", owner_id: a.userId, visibility: "group" })
      .select()
      .single();
    if (rep) await a.client.from("repertoire_group").insert({ repertoire_id: (rep as { id: string }).id, group_id: groupId });
    expect(repErr).toBeNull();

    const { data: item, error: itemErr } = await a.client
      .from("repertoire_item")
      .insert({
        repertoire_id: rep!.id,
        song_id: songId,
        order: 1,
      })
      .select()
      .single();
    expect(itemErr).toBeNull();

    const { data: bSel, error: bErr } = await b.client
      .from("repertoire_item")
      .select("*")
      .eq("id", item!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(1);

    const { data: cSel, error: cErr } = await c.client
      .from("repertoire_item")
      .select("*")
      .eq("id", item!.id);
    expect(cErr).toBeNull();
    expect(cSel).toHaveLength(0);
  });

  it("apenas o dono do pai escreve item: B (membro) não insere nem altera", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const groupId = await createGroupWithMember(a, b.userId);
    const songId = await seedGlobalSong(`Song ${uniq()}`);

    const { data: rep } = await a.client
      .from("repertoire")
      .insert({ title: "Protegido", type: "Missa", owner_id: a.userId, visibility: "group" })
      .select()
      .single();
    if (rep) await a.client.from("repertoire_group").insert({ repertoire_id: (rep as { id: string }).id, group_id: groupId });

    // B (membro) tenta inserir item -> withCheck do dono bloqueia.
    const { data: bIns, error: bInsErr } = await b.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 1 })
      .select();
    expect(bInsErr).not.toBeNull();
    expect(bIns).toBeNull();

    // A insere um item legítimo.
    const { data: item, error: aInsErr } = await a.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 1 })
      .select()
      .single();
    expect(aInsErr).toBeNull();

    // B tenta alterar -> using do dono filtra a linha (0 afetadas).
    const { data: bUpd } = await b.client
      .from("repertoire_item")
      .update({ order: 99 })
      .eq("id", item!.id)
      .select();
    expect(bUpd).toEqual([]);
  });
});

describe("repertoire_theme (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("tema segue a visibilidade do pai e só o dono escreve", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);
    const b = await signUp(`b_${uniq()}@asafe.test`);

    const groupId = await createGroupWithMember(a, b.userId);

    // tag global via service role
    const tag = await seedGlobalTag(`Tema ${uniq()}`, "tema");

    const { data: rep } = await a.client
      .from("repertoire")
      .insert({ title: "Com tema", type: "Adoracao", owner_id: a.userId, visibility: "group" })
      .select()
      .single();
    if (rep) await a.client.from("repertoire_group").insert({ repertoire_id: (rep as { id: string }).id, group_id: groupId });

    const { error: themeErr } = await a.client
      .from("repertoire_theme")
      .insert({ repertoire_id: rep!.id, tag_id: tag!.id });
    expect(themeErr).toBeNull();

    // membro B vê o tema
    const { data: bSel, error: bErr } = await b.client
      .from("repertoire_theme")
      .select("*")
      .eq("repertoire_id", rep!.id);
    expect(bErr).toBeNull();
    expect(bSel).toHaveLength(1);

    // B (membro) NÃO escreve tema
    const { data: bIns, error: bInsErr } = await b.client
      .from("repertoire_theme")
      .insert({ repertoire_id: rep!.id, tag_id: tag!.id })
      .select();
    expect(bInsErr).not.toBeNull();
    expect(bIns).toBeNull();
  });
});

describe("repertoire co-edição por editores do grupo (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("editor B escreve item; viewer C lê mas não escreve; não-membro D nem lê nem escreve", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`); // dono
    const b = await signUp(`b_${uniq()}@asafe.test`); // editor
    const c = await signUp(`c_${uniq()}@asafe.test`); // viewer
    const d = await signUp(`d_${uniq()}@asafe.test`); // não-membro

    const groupId = await createGroup(a);
    await addMember(a, groupId, b.userId, "editor");
    await addMember(a, groupId, c.userId, "viewer");

    const songId = await seedGlobalSong(`Song ${uniq()}`);

    const { data: rep, error: repErr } = await a.client
      .from("repertoire")
      .insert({ title: "Co-editável", type: "Missa", owner_id: a.userId, visibility: "group" })
      .select()
      .single();
    if (rep) await a.client.from("repertoire_group").insert({ repertoire_id: (rep as { id: string }).id, group_id: groupId });
    expect(repErr).toBeNull();

    // A (dono) cria um item base.
    const { data: baseItem, error: baseErr } = await a.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 1 })
      .select()
      .single();
    expect(baseErr).toBeNull();

    // (1) Editor B PODE inserir um novo item.
    const { data: bIns, error: bInsErr } = await b.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 2 })
      .select()
      .single();
    expect(bInsErr).toBeNull();
    expect(bIns).not.toBeNull();

    // Editor B PODE atualizar um item (o que A criou).
    const { data: bUpd, error: bUpdErr } = await b.client
      .from("repertoire_item")
      .update({ order: 99 })
      .eq("id", baseItem!.id)
      .select();
    expect(bUpdErr).toBeNull();
    expect(bUpd).toHaveLength(1);

    // Editor B PODE remover um item (o que ele próprio inseriu).
    const { data: bDel, error: bDelErr } = await b.client
      .from("repertoire_item")
      .delete()
      .eq("id", bIns!.id)
      .select();
    expect(bDelErr).toBeNull();
    expect(bDel).toHaveLength(1);

    // (2) Viewer C LÊ o repertório e os itens.
    const { data: cRep, error: cRepErr } = await c.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(cRepErr).toBeNull();
    expect(cRep).toHaveLength(1);

    const { data: cItems, error: cItemsErr } = await c.client
      .from("repertoire_item")
      .select("*")
      .eq("repertoire_id", rep!.id);
    expect(cItemsErr).toBeNull();
    expect(cItems!.length).toBeGreaterThanOrEqual(1);

    // Viewer C NÃO insere item (withCheck bloqueia).
    const { data: cIns, error: cInsErr } = await c.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 3 })
      .select();
    expect(cInsErr).not.toBeNull();
    expect(cIns).toBeNull();

    // Viewer C NÃO atualiza item (using filtra -> 0 linhas).
    const { data: cUpd, error: cUpdErr } = await c.client
      .from("repertoire_item")
      .update({ order: 7 })
      .eq("id", baseItem!.id)
      .select();
    expect(cUpdErr).toBeNull();
    expect(cUpd).toEqual([]);

    // (3) Não-membro D NÃO lê nem escreve.
    const { data: dRep, error: dRepErr } = await d.client
      .from("repertoire")
      .select("*")
      .eq("id", rep!.id);
    expect(dRepErr).toBeNull();
    expect(dRep).toHaveLength(0);

    const { data: dIns, error: dInsErr } = await d.client
      .from("repertoire_item")
      .insert({ repertoire_id: rep!.id, song_id: songId, order: 4 })
      .select();
    expect(dInsErr).not.toBeNull();
    expect(dIns).toBeNull();

    const { data: dUpd } = await d.client
      .from("repertoire_item")
      .update({ order: 8 })
      .eq("id", baseItem!.id)
      .select();
    expect(dUpd).toEqual([]);

    // (4) Editor B NÃO altera a linha `repertoire` em si (co-edição é só do conteúdo).
    const { data: bRepUpd, error: bRepUpdErr } = await b.client
      .from("repertoire")
      .update({ title: "Renomeado pelo editor" })
      .eq("id", rep!.id)
      .select();
    expect(bRepUpdErr).toBeNull();
    expect(bRepUpd).toEqual([]);
  });

  it("editor B escreve tema; viewer C lê mas não escreve", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`); // dono
    const b = await signUp(`b_${uniq()}@asafe.test`); // editor
    const c = await signUp(`c_${uniq()}@asafe.test`); // viewer

    const groupId = await createGroup(a);
    await addMember(a, groupId, b.userId, "editor");
    await addMember(a, groupId, c.userId, "viewer");

    const tag = await seedGlobalTag(`Tema ${uniq()}`, "tema");
    const tag2 = await seedGlobalTag(`Tema ${uniq()}`, "tema");

    const { data: rep, error: repErr } = await a.client
      .from("repertoire")
      .insert({ title: "Tema co-editável", type: "Adoracao", owner_id: a.userId, visibility: "group" })
      .select()
      .single();
    if (rep) await a.client.from("repertoire_group").insert({ repertoire_id: (rep as { id: string }).id, group_id: groupId });
    expect(repErr).toBeNull();

    // (1) Editor B PODE inserir um tema.
    const { data: bIns, error: bInsErr } = await b.client
      .from("repertoire_theme")
      .insert({ repertoire_id: rep!.id, tag_id: tag!.id })
      .select();
    expect(bInsErr).toBeNull();
    expect(bIns).toHaveLength(1);

    // Editor B PODE remover o tema.
    const { data: bDel, error: bDelErr } = await b.client
      .from("repertoire_theme")
      .delete()
      .eq("repertoire_id", rep!.id)
      .eq("tag_id", tag!.id)
      .select();
    expect(bDelErr).toBeNull();
    expect(bDel).toHaveLength(1);

    // (2) Viewer C LÊ os temas (A insere um base).
    const { error: aThemeErr } = await a.client
      .from("repertoire_theme")
      .insert({ repertoire_id: rep!.id, tag_id: tag2!.id });
    expect(aThemeErr).toBeNull();

    const { data: cSel, error: cErr } = await c.client
      .from("repertoire_theme")
      .select("*")
      .eq("repertoire_id", rep!.id);
    expect(cErr).toBeNull();
    expect(cSel).toHaveLength(1);

    // Viewer C NÃO escreve tema.
    const { data: cIns, error: cInsErr } = await c.client
      .from("repertoire_theme")
      .insert({ repertoire_id: rep!.id, tag_id: tag!.id })
      .select();
    expect(cInsErr).not.toBeNull();
    expect(cIns).toBeNull();
  });

  it("#79: compartilhado com VÁRIOS grupos — membro de qualquer um vê; desvincular revoga", async () => {
    const a = await signUp(`o_${uniq()}@asafe.test`);
    const m1 = await signUp(`m1_${uniq()}@asafe.test`);
    const m2 = await signUp(`m2_${uniq()}@asafe.test`);
    const g1 = await createGroup(a);
    const g2 = await createGroup(a);
    await addMember(a, g1, m1.userId, "viewer");
    await addMember(a, g2, m2.userId, "editor");

    const { data: rep } = await a.client
      .from("repertoire")
      .insert({ title: "Dois grupos", type: "Missa", owner_id: a.userId, visibility: "group" })
      .select("id")
      .single();
    const repId = (rep as { id: string }).id;
    await a.client.from("repertoire_group").insert([
      { repertoire_id: repId, group_id: g1 },
      { repertoire_id: repId, group_id: g2 },
    ]);

    const sees = async (u: Awaited<ReturnType<typeof signUp>>) =>
      (await u.client.from("repertoire").select("id").eq("id", repId).maybeSingle()).data !== null;

    // membro de QUALQUER grupo vinculado vê
    expect(await sees(m1)).toBe(true);
    expect(await sees(m2)).toBe(true);

    // desvincula g2 → m2 perde acesso, m1 continua vendo
    await a.client.from("repertoire_group").delete().eq("repertoire_id", repId).eq("group_id", g2);
    expect(await sees(m2)).toBe(false);
    expect(await sees(m1)).toBe(true);
  });
});

describe("slot_template (RLS)", () => {
  afterAll(async () => {
    await closeDb();
  });

  it("slot_template é legível por qualquer logado (sem permission denied)", async () => {
    const a = await signUp(`a_${uniq()}@asafe.test`);

    // O template "Missa" já vem do seed canônico (globalSetup). Aqui só provamos
    // que um usuário logado consegue lê-lo (sem permission denied), sem sobrescrevê-lo.
    const { data, error } = await a.client
      .from("slot_template")
      .select("*")
      .eq("type", "Missa");
    expect(error).toBeNull();
    expect(data!.length).toBeGreaterThanOrEqual(1);
  });
});
