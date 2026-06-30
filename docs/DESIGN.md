# Asafe — Design e decisões

Referência viva de **arquitetura e do *porquê*** das decisões do Asafe. O *como* do schema
e das políticas de acesso vive no código (`packages/db`) — este documento explica as razões
e o que não é óbvio a partir do código. Leia antes de contribuir.

> O nome **Asaf** foi o mestre de canto que o rei Davi pôs à frente da música na Casa do
> Senhor, autor de uma dúzia de salmos (50, 73–83). O app leva o nome e a missão: ajudar a
> preparar a música da celebração.

## 1. Visão e problema

Músicos católicos voluntários organizam repertórios de Missas e outros eventos em folhas
soltas no Drive e PDFs perdidos no WhatsApp. Duas dores: (a) achar a música certa para cada
momento e tempo litúrgico, e (b) **não repetir** as mesmas músicas de uma celebração para a
seguinte. O Asafe ataca as duas, num acervo que é seu e que cresce com a comunidade.

## 2. Princípios

- **Open source — AGPL-3.0.** Escolhida porque fecha a brecha dos apps web: a AGPL trata
  "oferecer o app pela internet" como distribuição, então quem hospedar uma versão
  modificada é obrigado a abrir o código modificado. Outros podem derivar, mas **não podem
  fechar** o derivado. (Alternativa permissiva, se um dia priorizar adoção sobre proteção:
  MIT.) Marca e comunidade são proteções **separadas** da licença.
- **Separar código de conteúdo.** O código é público; **não** comitar conteúdo protegido
  (cifras/letras de terceiros, textos litúrgicos da CNBB) no repositório.
- **Custo ~zero por design.** As decisões de arquitetura existem para manter o app no plano
  gratuito indefinidamente em escala paroquial (ver §9).
- **Sem fins lucrativos.** Se um dia precisar de infra paga, modelo de **doação/apoiador**
  antes de travar funcionalidade.

## 3. Arquitetura e stack

Monorepo TypeScript (Turborepo + Yarn workspaces):

- **Web:** Next.js — também renderiza as **páginas públicas de leitura** (links
  compartilhados) via SSR: preview bonito no WhatsApp e carregamento rápido sem login.
- **Mobile:** React Native (Expo), compartilhando pacotes com o web.
- **Dados:** **Supabase** — Postgres + Auth + **RLS** + Storage + **Realtime**. O RLS
  expressa nativamente o modelo "vê o global + o seu + o compartilhado com o grupo"; o
  Realtime cobre navegação sincronizada sem servidor próprio.
- **Hospedagem do front:** **Cloudflare Pages** (evita a restrição de uso comercial do
  Vercel Hobby; CDN grátis para os links públicos).
- **Cifras:** **ChordSheetJS** (parse/render/transposição).
- **API/lógica:** **tRPC** onde precisa de lógica custom type-safe; onde o RLS resolve,
  `supabase-js` direto. **Drizzle** para o schema e queries tipadas.

O "backend" são duas metades gerenciadas (sem servidor para administrar): **Cloudflare**
serve o código que roda; **Supabase** guarda os dados. Sem lock-in — dá para exportar tudo
e auto-hospedar (o Supabase é open source), ao custo de manutenção própria.

## 4. Modelo de dados

> **Fonte de verdade: `packages/db`** (schema Drizzle + migrations). Esta seção registra só
> o *racional* das decisões não-óbvias.

- **Catálogo global vs. pessoal.** `owner_id NULL` = catálogo global (visível a todos os
  logados); preenchido = item pessoal. Suas folhas viram suas músicas.
- **Tags efetivas (diferencial).** O que o usuário vê numa música global é
  `tags_globais − {removes do user} ∪ {adds do user}`. A discordância pessoal ("para mim
  isto é Final") é **override por diferença** (`add`/`remove`), porque o universo é discreto
  e o diff some quando o global muda. A lógica pura está em `@asafe/core` (`effectiveTags`).
- **Tag vs. cifra — dois mecanismos.** Tag é override por diferença; **cifra é
  arranjo/versão completa** (`song_arrangement`), não diff: texto estruturado contínuo, um
  diff seria frágil. Vários arranjos por usuário ("simplificada", "com baixo"); escolhe-se o
  arranjo no item do repertório. **Transposição é separada** (por ocorrência, no item) — não
  se cria arranjo só para mudar de tom.
- **Sequência mora no item.** A ordem real de um repertório vive em `repertoire_item`
  (`moment_slot` + `order`), não no template. Os `slot_template` apenas **semeiam**; mudar um
  template depois **não** reescreve repertórios antigos (registro congelado).
- **Sinal agregado (curadoria coletiva).** Minerar os overrides por consenso: se N usuários,
  independentemente, reclassificam a mesma música, o painel do admin sugere promover ao
  global. O mesmo vale para vínculos música↔leitura.

## 5. Permissões / RLS

Expressas em **RLS no Postgres** (ver as políticas em `packages/db`). Modelo central:

- Todo usuário lê o **catálogo global** + o **seu** + os repertórios que possui ou que foram
  compartilhados com o seu **grupo**.
- **Co-edição:** membros com papel `editor` co-editam os *itens* e o *tema* dos repertórios
  compartilhados com o grupo; o repertório em si e os links permanecem do dono.
- **Link público** = leitura via `token` (validade opcional), sem auth, mediada por função
  `security definer` — o visitante anônimo nunca varre as tabelas, só acessa via token.
- **Papéis globais:** `user` (usa), `moderator` (aprova contribuições), `admin` (gerencia
  papéis). Papel não é auto-atribuível.

## 6. Camada litúrgica

Duas fontes complementares + cache durável em Postgres (sem Redis):

1. **Calendário canônico — LitCal API** (open source): tempo litúrgico, semana, cor,
   solenidades, ciclos dominical (A/B/C) e ferial (I/II), santo do dia. Suporta calendários
   nacionais.
2. **Leituras + santo em PT — API brasileira de liturgia.** Atenção: a maioria faz scraping
   (frágil) e há direitos sobre o texto das leituras.

**Cache em duas camadas.** Separa-se a *resolução do dia* (`liturgical_day`, específica do
ano porque a Páscoa é móvel) da *leitura em si* (`lectionary`, indexada pela **posição
litúrgica**, não pela data civil). O `lectionary` é um **dicionário reutilizável**: depois de
~2–3 anos você já viu quase todas as combinações e praticamente para de chamar a API frágil
— o que mitiga o risco do scraping. *Por que não Redis:* o caso é baixíssima frequência +
durabilidade (o oposto do Redis); uma tabela Postgres faz melhor e não evapora em restart.

**Snapshot ≠ cache.** `repertoire.liturgical_snapshot` é uma cópia **congelada** dos dados
resolvidos, gravada na criação do repertório (identidade + rótulos + *referências* das
leituras; o texto pesado fica no dicionário). O cache é referência regenerável; o snapshot é
registro imutável. Analogia: a nota fiscal copia o preço da compra, não aponta para o preço
atual. A `liturgical_key` fica também como coluna indexada, para casar repertórios entre
anos.

**Reaproveitar pela âncora.** Todo repertório é casado/reaproveitado por uma âncora —
**Missa** pela `liturgical_key`; **grupo de oração** por tema e/ou perícope; **casamento**
pela ocasião. O mesmo motor (anônimo, agregado, com filtro de frescor) roda para todos.

**Eixo "por leitura" (perícope) — casar música com o CONTEÚDO, não só a posição.** O usuário
liga um canto a uma **leitura** (não a uma data). O casamento é por **sobreposição de
versículos normalizada**, não por string igual: a perícope é decomposta em segmentos
(livro/capítulo/versículos), e duas leituras "casam" quando os intervalos se intersectam —
então o vínculo reaparece mesmo quando o recorte do dia é levemente diferente (Lc 15,11-32
"curto" vs. Lc 15,1-3.11-32 "longo" = mesma parábola). Nenhum concorrente cataloga por
conteúdo de leitura — eles param na posição litúrgica.

**Indicador de frescor.** Ao lado de cada música, "usada há tanto tempo" ligado ao *seu*
histórico entre celebrações — ataca diretamente a repetição semana a semana.

## 7. ChordPro — entrada e exibição

- **Armazenamento interno em ChordPro** (dá transposição, esconder cifra, reflow). O usuário
  **não precisa** conhecer ChordPro.
- **Entrada:** campo com **preview ao vivo**, aceitando "acordes sobre a letra" (o formato
  que o músico já usa), ChordPro direto (detectado pela presença de `[ ]`), ou **só letra**.
- **Exibição:** cifra+letra / só letra / esconder cifra (toggle por usuário); **modo palco**
  (tema escuro, fonte grande, autoscroll, capo); **modo projeção** (letra grande para telão).
- **Navegação sincronizada (Fase 3):** modo palco espelhado em tempo real entre os aparelhos
  via **Supabase Realtime** (sem servidor always-on). Um mestre por vez, transferível por
  toque; seguir é o padrão, mas olhar adiante não tira ninguém da sincronia.

## 8. Partes fixas da Missa (Ordinário)

- **Partes cantadas** (Santo, Cordeiro, Glória, aclamações) → são músicas no catálogo, tag
  `Ordinário`. **Fazer.**
- **Respostas curtas da assembleia** → baixo risco, compõem um "modo acompanhamento".
- **Partes variáveis** (leituras/salmo) → vêm da API litúrgica (§6).
- **Textos oficiais completos** (Orações Eucarísticas, Lecionário na íntegra) → **protegidos
  pela CNBB**: engenharia trivial, gargalo é licenciamento. **DECISÃO EM ABERTO** — licenciar,
  linkar fonte autorizada, ou começar só com as respostas curtas.

## 9. Comunidade e custo

- **Contribuições:** canal explícito (checkbox "sugerir para o catálogo global" ao criar
  tag/música/arranjo/vínculo) + canal implícito (sinal agregado dos overrides). Fila de
  revisão no painel do admin, ordenável por força do consenso; opcional digest semanal por
  Resend. Botão "reportar" em cada música cai na mesma fila.
- **Custo ~zero.** Dado é quase todo texto (~1–3 KB por música); os limites gratuitos do
  Supabase comportam um acervo muito maior que uma diocese produz. Áudio é **link** (sem
  upload); PDF é gerado sob demanda (não guardado); liturgia em cache; Cloudflare CDN na
  frente dos links. Um ping diário (GitHub Actions) evita a pausa do Supabase. Único custo
  quase certo: domínio (~R$ 40/ano), e mesmo assim opcional (`*.pages.dev` grátis).

## 10. Identidade e onboarding

O nome pouco conhecido é tratado como **força**: um app litúrgico que, de quebra, ensina um
pedaço da Escritura. **Regra de ouro:** a explicação é sempre **opcional e nunca bloqueia** —
convite, não aula, e tudo desligável. Aparece do mais leve ao mais explícito: boas-vindas no
1º acesso (fechável), tela "Sobre", e um toque contextual quando um **Salmo de Asaf** cai na
liturgia do dia (aproveitando o eixo de perícope) — o nome vira um fio que reaparece de leve.

**Identidade visual** (paleta "papel e tinta", acento litúrgico dinâmico, monograma da lira,
tipografia, modo palco e tokens CSS): ver [`docs/identidade-visual.md`](identidade-visual.md).
A adoção é uma fatia própria — a passada de UI pré-launch.

## 11. Decisões em aberto / riscos

- Licenciamento CNBB para textos oficiais (§8).
- Direitos de cifras/letras no catálogo **global** (curar; não comitar material protegido).
- Completude do calendário nacional do Brasil na LitCal.
- Escolha da API de liturgia diária + fragilidade de scraping.
- Domínio: rodar grátis em `*.pages.dev` ou registrar `asafe.com.br` / `asafe.app`.

## 12. Roadmap por fases

**Fase 1 — MVP (sem dependências externas):** catálogo com tags + overrides pessoais; montar
repertório por tipo com templates de slot (Missa canônica; grupo de oração / sarau
flexíveis); âncora por tema; editor ChordPro (cole sua cifra + preview + transposição +
modos); compartilhar com grupo + link público; indicador de frescor.

**Fase 2 — liturgia + comunidade:** LitCal + liturgia diária + cache em duas camadas +
snapshot; slots automáticos da Missa por tempo litúrgico; Ordinário cantado; arranjos de
cifra; vínculo música↔leitura (perícope) + resgate por sobreposição; fila de contribuições +
moderação + digest; botão "reportar"; modo projeção.

**Fase 3 — inteligência e alcance:** reaproveitar repertório pela âncora (seus → grupo →
comunidade anônima); motor de sugestão por momento (estação/tema, nº do salmo, conteúdo da
leitura) com pool deduplicado/ranqueado e filtro de frescor; analytics; PWA offline; papéis
no repertório; navegação sincronizada (Supabase Realtime); licenciamento CNBB (se for o
caminho).

---

**Status atual:** fundação do monorepo + schema/RLS do MVP prontos (`packages/db`). Próximo:
construir o MVP Fase 1, começando pelo catálogo + editor ChordPro.
