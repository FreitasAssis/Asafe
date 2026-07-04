# Asafe

> Organize e compartilhe repertórios de música litúrgica católica — num lugar só,
> no lugar das folhas soltas e dos PDFs perdidos no WhatsApp.

**Ao vivo:** <https://asafe.repertorio.workers.dev> · em construção (veja o [Status](#status)).

**Asafe** ajuda ministérios de música a montar repertórios de Missas, grupos de oração,
casamentos e adorações: escolha cantos de um catálogo vivo com cifra e letra, transponha
para o tom da sua voz, esconda os acordes para quem só canta, e acompanhe no celular ou
tablet na hora da celebração — mesmo sem internet.

Para a Missa, o app sabe o dia litúrgico, o tempo e as leituras, e ajuda a encontrar a
música certa para cada momento, sem repetir o que você cantou nos últimos domingos.
Compartilhe o repertório com a equipe ou mande um link para qualquer pessoa acompanhar.

O nome vem de **Asaf**, o mestre de canto que o rei Davi pôs à frente da música na Casa do
Senhor (autor de uma dúzia de salmos). O app leva o nome e a missão.

## Diferenciais

- **Curadoria comunitária com camada pessoal.** Você pode discordar da classificação de um
  canto ("para mim isto é Final, não Entrada") no seu próprio espaço — e esse sinal,
  agregado, melhora o catálogo de todos. A mesma música tem função diferente em comunidades
  diferentes, e o Asafe respeita isso.
- **Acervo próprio e portátil.** Suas folhas viram *suas* músicas. Você é dono do seu
  repertório, não apenas consumidor de um catálogo fechado.
- **Aberto e gratuito de verdade.** Open source (AGPL-3.0), pensado para rodar no plano
  gratuito em escala paroquial — sem travar funcionalidade atrás de assinatura.

## Status

🚧 Em construção.

- ✅ Fundação do monorepo
- ✅ Schema + RLS do MVP (`packages/db`)
- ✅ Catálogo com filtro por tags e curadoria pessoal
- ✅ Editor ChordPro: transpor, esconder acordes e modo visualização
- ✅ Montar repertório por momento litúrgico e compartilhar por link
- ✅ Importação em lote (colar várias cifras de uma vez)
- ✅ Grupos, convites e comunidade com moderação
- ✅ Direitos autorais: referência × conteúdo, gate de promoção, consentimento de obra
  própria, permissão (por obra e fonte autorizada) e atribuição sempre visível
- ✅ Identidade visual, navegação e onboarding
- ✅ Deploy de referência na Cloudflare Workers (OpenNext)

**Próximos passos**

- ⬜ Integrações litúrgicas: dia litúrgico, tempo e leituras, com sugestão de música por momento
- ⬜ App no celular/tablet, com uso offline na hora da celebração

Arquitetura e decisões de design: veja [docs/DESIGN.md](./docs/DESIGN.md). O roadmap por
fases está lá também.

## Stack

Monorepo TypeScript (Turborepo + Yarn workspaces).

| Pacote              | O quê                                                         |
| ------------------- | ------------------------------------------------------------ |
| `apps/web`          | Next.js — app + páginas públicas (links compartilhados, SSR) |
| `apps/mobile`       | Expo / React Native                                          |
| `packages/core`     | Tipos e lógica compartilhada (tags efetivas, slots, perícope)|
| `packages/chordpro` | Wrappers do ChordSheetJS (parse, render, transpor)           |
| `packages/db`       | Schema Drizzle, migrations e políticas RLS (Supabase)        |

Backend: **Supabase** (Postgres + Auth + RLS + Storage + Realtime).
Hospedagem do front: **Cloudflare Workers** (via [OpenNext](https://opennext.js.org/cloudflare)).

## Desenvolvimento

Requer **Node >= 22** (`.nvmrc`), **Yarn 4** (via corepack) e **Docker** (para o
Supabase local).

1. Instale as dependências:

   ```bash
   corepack enable      # garante o Yarn 4 (já fixado em package.json)
   yarn install
   ```

2. Suba o Supabase local (Postgres + Auth via Docker). Ao terminar, ele imprime a
   **API URL**, a **anon key**, o **service_role** e a **DB URL**:

   ```bash
   yarn dlx supabase start
   ```

3. Crie os dois arquivos de ambiente (ambos git-ignored) com esses valores:

   ```bash
   cp packages/db/.env.example packages/db/.env     # migrations, seed e testes
   cp apps/web/.env.example    apps/web/.env.local   # o app web (NEXT_PUBLIC_*)
   ```

4. Aplique o schema e semeie o que é livre (tags litúrgicas + slot templates):

   ```bash
   yarn workspace @asafe/db db:migrate
   yarn workspace @asafe/db db:seed
   ```

5. Rode:

   ```bash
   yarn dev        # todos os apps em dev (ou: yarn workspace @asafe/web dev)
   yarn test       # unidade + integração (RLS) — exige o Supabase local no ar
   yarn typecheck
   ```

O catálogo começa **vazio** de propósito: músicas não são versionadas nem semeadas
(direito autoral, DESIGN §9) — crie as suas pelo app. Para popular usuários de teste
(`ana`/`bruno`/`celia`), rode o seed com `ASAFE_SEED_DEMO=1` (**só em local**). **Nunca**
comite `.env` / `.env.local`.

### Solução de problemas

- **`supabase start` falha:** confirme que o **Docker está rodando**. Em conflito de
  porta, rode `yarn dlx supabase stop` e tente de novo. `yarn dlx supabase status`
  mostra as URLs e chaves locais a qualquer momento.
- **`db:migrate` reclama de `DATABASE_URL`:** falta o `packages/db/.env` (passo 3).
- **O app web abre mas não loga / não carrega dados:** falta o `apps/web/.env.local`
  (passo 3), ou o Supabase local não está no ar.

## Contribuindo

- **Commits**: [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `docs:`…), com escopo quando ajudar (`feat(core): …`).
- **TDD** na lógica pura (`packages/core`, `packages/chordpro`): escreva o teste,
  veja falhar, implemente. Regras de negócio e RLS têm testes.
- **PRs** contra a `main` com o **CI verde** (typecheck + testes). Uma fatia por PR.
- **Não versione conteúdo protegido** (cifras/letras de terceiros, textos litúrgicos
  da CNBB) — nem em seed, teste ou fixture. Na comunidade, obra protegida entra só como
  **referência** (título + autor); a cifra é liberada apenas quando a obra é livre ou
  autorizada — ver [DESIGN §9](./docs/DESIGN.md).

## Licença

[AGPL-3.0-only](./LICENSE). A AGPL trata "oferecer o app pela internet" como distribuição:
quem hospedar uma versão modificada do Asafe é obrigado a disponibilizar o código
modificado. Marca e comunidade são proteções separadas da licença.

Não comitamos conteúdo protegido (cifras/letras de terceiros, textos litúrgicos da CNBB) —
veja [docs/DESIGN.md](./docs/DESIGN.md).
