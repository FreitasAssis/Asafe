-- #79: um repertório pode ser compartilhado com VÁRIOS grupos.
-- Troca o `repertoire.group_id` (1-para-1) por uma tabela N-para-N `repertoire_group`.
-- Migração expand→contract numa passada: cria a tabela, faz o backfill, reescreve TODA a RLS/
-- funções que usavam `r.group_id` para usar a nova tabela, e por fim DROPA a coluna. A ordem
-- importa: objetos SQL (policies e a função `repertoires_mine`) têm dependência RÍGIDA da coluna,
-- então precisam ser reescritos ANTES do DROP.

-- 1) Tabela de vínculo + índices (subconsultas de RLS filtram por repertoire_id e por group_id).
create table if not exists public.repertoire_group (
  repertoire_id uuid not null references public.repertoire(id) on delete cascade,
  group_id uuid not null references public."group"(id) on delete cascade,
  primary key (repertoire_id, group_id)
);
--> statement-breakpoint
create index if not exists repertoire_group_repertoire_idx on public.repertoire_group (repertoire_id);--> statement-breakpoint
create index if not exists repertoire_group_group_idx on public.repertoire_group (group_id);--> statement-breakpoint
alter table public.repertoire_group enable row level security;--> statement-breakpoint

-- 2) Backfill: cada repertório que já tinha um grupo vira uma linha.
insert into public.repertoire_group (repertoire_id, group_id)
  select id, group_id from public.repertoire where group_id is not null
  on conflict do nothing;
--> statement-breakpoint

-- 3) Helpers (SECURITY DEFINER, sem recursão): acesso via ALGUM grupo vinculado.
create or replace function public.in_repertoire_group(p_rep uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.repertoire_group rg
    join public.membership m on m.group_id = rg.group_id
    where rg.repertoire_id = p_rep and m.user_id = auth.uid()
  );
$$;--> statement-breakpoint
grant execute on function public.in_repertoire_group(uuid) to authenticated;--> statement-breakpoint

create or replace function public.edits_repertoire_group(p_rep uuid)
returns boolean language sql security definer stable set search_path = '' as $$
  select exists (
    select 1 from public.repertoire_group rg
    join public.membership m on m.group_id = rg.group_id
    where rg.repertoire_id = p_rep and m.user_id = auth.uid() and m.role in ('owner','editor')
  );
$$;--> statement-breakpoint
grant execute on function public.edits_repertoire_group(uuid) to authenticated;--> statement-breakpoint

-- 4) RLS de `repertoire_group`: quem vê o repertório vê os vínculos; só o dono do repertório escreve.
create policy "repertoire_group_select" on public.repertoire_group as permissive for select to authenticated
  using (exists (select 1 from public.repertoire r where r.id = repertoire_group.repertoire_id
    and (r.owner_id = auth.uid() or public.in_repertoire_group(r.id) or r.community_status = 'approved')));--> statement-breakpoint
create policy "repertoire_group_write_owner" on public.repertoire_group as permissive for all to authenticated
  using (exists (select 1 from public.repertoire r where r.id = repertoire_group.repertoire_id and r.owner_id = auth.uid()))
  with check (exists (select 1 from public.repertoire r where r.id = repertoire_group.repertoire_id and r.owner_id = auth.uid()));--> statement-breakpoint
grant select, insert, update, delete on table public.repertoire_group to authenticated;--> statement-breakpoint

-- 5) Reescreve as políticas que usavam `r.group_id` (leitura e co-edição) para a nova tabela.
alter policy "repertoire_select" on public.repertoire to authenticated
  using ("repertoire"."owner_id" = auth.uid() or public.in_repertoire_group("repertoire"."id")
    or "repertoire"."community_status" = 'approved' or ("repertoire"."community_status" = 'pending' and public.is_moderator()));--> statement-breakpoint

alter policy "repertoire_item_select" on public.repertoire_item to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_item"."repertoire_id"
    and (r.owner_id = auth.uid() or public.in_repertoire_group(r.id)
      or r.community_status = 'approved' or (r.community_status = 'pending' and public.is_moderator()))));--> statement-breakpoint
alter policy "repertoire_item_insert" on public.repertoire_item to authenticated
  with check (exists (select 1 from public.repertoire r where r.id = "repertoire_item"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint
alter policy "repertoire_item_update" on public.repertoire_item to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_item"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))))
  with check (exists (select 1 from public.repertoire r where r.id = "repertoire_item"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint
alter policy "repertoire_item_delete" on public.repertoire_item to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_item"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint

alter policy "repertoire_theme_select" on public.repertoire_theme to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_theme"."repertoire_id"
    and (r.owner_id = auth.uid() or public.in_repertoire_group(r.id)
      or r.community_status = 'approved' or (r.community_status = 'pending' and public.is_moderator()))));--> statement-breakpoint
alter policy "repertoire_theme_insert" on public.repertoire_theme to authenticated
  with check (exists (select 1 from public.repertoire r where r.id = "repertoire_theme"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint
alter policy "repertoire_theme_update" on public.repertoire_theme to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_theme"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))))
  with check (exists (select 1 from public.repertoire r where r.id = "repertoire_theme"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint
alter policy "repertoire_theme_delete" on public.repertoire_theme to authenticated
  using (exists (select 1 from public.repertoire r where r.id = "repertoire_theme"."repertoire_id"
    and (r.owner_id = auth.uid() or public.edits_repertoire_group(r.id))));--> statement-breakpoint

-- song_content: a cifra fica visível se a música está num repertório vinculado a um grupo meu.
alter policy "song_content_select" on public.song_content to authenticated
  using (exists (
    select 1 from public.song s where s.id = "song_content"."song_id" and (
      s.owner_id = auth.uid()
      or exists (
        select 1 from public.repertoire_item ri join public.repertoire r on r.id = ri.repertoire_id
        where ri.song_id = s.id and public.in_repertoire_group(r.id)
      )
      or (
        s.copyright_status in ('dominio_publico','licenca_aberta','permissao')
        and (
          s.community_status = 'approved'
          or exists (
            select 1 from public.repertoire_item ri join public.repertoire r on r.id = ri.repertoire_id
            where ri.song_id = s.id and r.community_status = 'approved'
          )
        )
      )
      or (
        public.is_moderator() and (
          s.community_status = 'pending'
          or exists (
            select 1 from public.repertoire_item ri join public.repertoire r on r.id = ri.repertoire_id
            where ri.song_id = s.id and r.community_status = 'pending'
          )
        )
      )
    )
  ));--> statement-breakpoint

-- song (metadado/referência): visível se está num repertório vinculado a um grupo meu.
alter policy "song_select_group" on public.song to authenticated
  using (exists (select 1 from public.repertoire_item ri join public.repertoire r on r.id = ri.repertoire_id
    where ri.song_id = "song"."id" and public.in_repertoire_group(r.id)));--> statement-breakpoint

-- 6) Reescreve as FUNÇÕES que referenciavam group_id.
-- "Meus repertórios": inclui os de grupos vinculados; group_name vira a lista dos grupos.
create or replace function public.repertoires_mine()
returns table(id uuid, title text, type public.repertoire_type, "date" date, owner_id uuid, community_status public.community_status, group_name text)
language sql security definer stable set search_path = '' as $$
  select r.id, r.title, r.type, r.date, r.owner_id, r.community_status,
    (select string_agg(g.name, ', ' order by g.name)
       from public.repertoire_group rg join public."group" g on g.id = rg.group_id
       where rg.repertoire_id = r.id)
  from public.repertoire r
  where r.owner_id = auth.uid() or public.in_repertoire_group(r.id)
  order by r.date desc nulls last, r.title;
$$;--> statement-breakpoint

-- Autorização do canal Realtime (B3): acesso via dono, grupo vinculado ou público.
create or replace function public.can_sync_repertoire(p_topic text)
returns boolean language plpgsql security definer stable set search_path = '' as $$
declare
  rid uuid;
begin
  if p_topic !~ '^live:[0-9a-fA-F-]{36}$' then
    return false;
  end if;
  rid := substring(p_topic from 6)::uuid;
  return exists (
    select 1 from public.repertoire r
    where r.id = rid
      and (r.owner_id = auth.uid() or r.visibility = 'public' or public.in_repertoire_group(r.id))
  );
end;
$$;--> statement-breakpoint

-- Excluir grupo: agora só apaga os VÍNCULOS do grupo (repertoire_group); os repertórios que
-- ficarem sem nenhum grupo voltam a privado.
create or replace function public.delete_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public."group" g where g.id = p_group_id and g.owner_id = auth.uid()) then
    return false;
  end if;

  delete from public.repertoire_group where group_id = p_group_id;
  update public.repertoire set visibility = 'private'
    where visibility = 'group'
      and not exists (select 1 from public.repertoire_group rg where rg.repertoire_id = repertoire.id);
  delete from public.join_request where group_id = p_group_id;
  delete from public.group_invite where group_id = p_group_id;
  delete from public.membership where group_id = p_group_id;
  delete from public."group" where id = p_group_id;
  return true;
end; $$;--> statement-breakpoint

-- 7) Agora nada mais depende da coluna — pode dropar (a FK cai junto).
alter table public.repertoire drop column group_id;
