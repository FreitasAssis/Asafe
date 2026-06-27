# Asafe

> Organize e compartilhe repertórios de música litúrgica católica — num lugar só,
> no lugar das folhas soltas e dos PDFs perdidos no WhatsApp.

**Asafe** ajuda ministérios de música a montar repertórios de Missas, grupos de oração,
casamentos e adorações: escolha cantos de um catálogo vivo com cifra e letra, transponha
para o tom da sua voz, esconda os acordes para quem só canta, e acompanhe no celular ou
tablet na hora da celebração.

O nome vem de **Asaf**, o mestre de canto que o rei Davi pôs à frente da música na Casa do
Senhor (autor de uma dúzia de salmos). O app leva o nome e a missão.

## Status

🚧 Em construção. Veja [PLANNING.md](./PLANNING.md) — a fonte de verdade de arquitetura e
produto. **Leia antes de contribuir.**

## Stack

Monorepo TypeScript (Turborepo + Yarn workspaces).

| Pacote            | O quê                                                        |
| ----------------- | ----------------------------------------------------------- |
| `apps/web`        | Next.js — app + páginas públicas (links compartilhados, SSR)|
| `apps/mobile`     | Expo / React Native                                         |
| `packages/core`   | Tipos e lógica compartilhada (tags efetivas, slots, perícope)|
| `packages/chordpro`| Wrappers do ChordSheetJS (parse, render, transpor)         |
| `packages/db`     | Schema Drizzle, migrations e políticas RLS (Supabase)       |

Backend: **Supabase** (Postgres + Auth + RLS + Storage + Realtime).
Hospedagem do front: **Cloudflare Pages**.

## Desenvolvimento

```bash
corepack enable      # garante o Yarn 4 (já fixado em package.json)
yarn install
yarn dev             # roda todos os apps em modo dev (turbo)
yarn typecheck
yarn test
```

Requer Node >= 22 (veja `.nvmrc`).

## Licença

[AGPL-3.0-only](./LICENSE). A AGPL trata "oferecer o app pela internet" como distribuição:
quem hospedar uma versão modificada do Asafe é obrigado a disponibilizar o código
modificado. Marca e comunidade são proteções separadas da licença.
