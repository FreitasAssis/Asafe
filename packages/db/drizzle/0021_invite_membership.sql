-- Resolve um token de convite para { groupId, isMember } do usuário atual, sem efeito
-- colateral (o RLS de group_invite só libera o dono; por isso security definer). A tela de
-- convite usa isto para, se a pessoa JÁ é membro, mandá-la direto pro grupo em vez de mostrar
-- "Pedir para entrar". Retorna null se o token for inválido/expirado. Qualquer logado executa.
create or replace function public.invite_membership(p_token text)
returns jsonb language sql security definer stable
set search_path = '' as $$
  select jsonb_build_object(
    'groupId', gi.group_id,
    'isMember', exists (
      select 1 from public.membership m
      where m.group_id = gi.group_id and m.user_id = auth.uid()
    )
  )
  from public.group_invite gi
  where gi.token = p_token and (gi.expires_at is null or gi.expires_at > now())
  limit 1;
$$;--> statement-breakpoint
grant execute on function public.invite_membership(text) to authenticated;
