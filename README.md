# Asafe

> Organize e compartilhe repertórios de música litúrgica católica — num lugar só,
> no lugar das folhas soltas e dos PDFs perdidos no WhatsApp.

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
- ⬜ MVP Fase 1: catálogo, editor ChordPro, montar/compartilhar repertório

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
Hospedagem do front: **Cloudflare Pages**.

## Desenvolvimento

Requer **Node >= 22** (veja `.nvmrc`), **Yarn 4** (via corepack) e **Docker** (para o
Supabase local).

```bash
corepack enable          # garante o Yarn 4 (já fixado em package.json)
yarn install
yarn typecheck
yarn dev                 # roda os apps em modo dev (turbo)
```

Banco de dados local (Supabase) — necessário para os testes de `packages/db`:

```bash
yarn dlx supabase start  # sobe Postgres + Auth local (Docker)
yarn workspace @asafe/db db:migrate
yarn workspace @asafe/db db:seed
yarn test                # testes de unidade + integração (RLS)
```

Copie `packages/db/.env.example` para `packages/db/.env` com as credenciais que o
`supabase start` imprime. **Nunca** comite o `.env`.

## Licença

[AGPL-3.0-only](./LICENSE). A AGPL trata "oferecer o app pela internet" como distribuição:
quem hospedar uma versão modificada do Asafe é obrigado a disponibilizar o código
modificado. Marca e comunidade são proteções separadas da licença.

Não comitamos conteúdo protegido (cifras/letras de terceiros, textos litúrgicos da CNBB) —
veja [docs/DESIGN.md](./docs/DESIGN.md).
