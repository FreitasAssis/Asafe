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
- **Hospedagem do front:** **Cloudflare Workers** (via [OpenNext](https://opennext.js.org/cloudflare))
  — evita a restrição de uso comercial do Vercel Hobby; CDN grátis para os links públicos.
  O deploy de referência roda em `*.workers.dev`.
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
- **Tag vs. cifra — dois mecanismos.** Tag é override por diferença; **cifra é versão
  completa**, texto estruturado contínuo (um diff seria frágil). A cifra (ChordPro) mora
  **à parte da música**, em `song_content` — tabela com **RLS própria** (ver "Direitos
  autorais" abaixo e §5). **Transposição é separada** (por ocorrência, no item) — não se
  cria versão nova só para mudar de tom. *Múltiplos arranjos por usuário ("simplificada",
  "com baixo") são uma evolução (Fase 2).*
- **Direitos autorais no modelo — regra de ouro: _estrutura é livre, conteúdo é restrito_.**
  A **referência** de uma música (título, compositor, tags) vive em `song`; a **cifra** vive
  em `song_content`, à parte. Assim uma obra protegida aparece a todos como **referência**
  (metadado, com atribuição), e a **cifra só é liberada** quando a música é livre — domínio
  público, licença aberta ou **permissão** — ou para o dono/grupo. O `song.copyright_status`
  não tem default permissivo: é **decidido no gate de promoção ao global** (ver §9), com a
  evidência guardada em `copyright_evidence`. Obra própria carrega um **consentimento
  versionado** (licença escolhida + quem/quando). Fonte da verdade no código: `packages/db`.
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
- **Referência × conteúdo.** A cifra (`song_content`) tem RLS **separada** da música
  (`song`): expor o metadado nunca implica expor a cifra. A não-donos a cifra só é liberada
  quando a obra é **livre/autorizada** (`copyright_status` em domínio público, licença aberta
  ou permissão) **e** aprovada na comunidade — ou via grupo. É o que sustenta a "regra de
  ouro" (§4/§9).
- **Link público** = leitura via `token` (validade opcional), sem auth, mediada por função
  `security definer` — o visitante anônimo nunca varre as tabelas, só acessa via token. A
  **atribuição (autor) acompanha** a obra em toda superfície pública (direito moral).
- **Moderação.** `moderator` aprova / recusa / **devolve para ajuste** as contribuições;
  cada decisão vira um evento em `moderation_event` (devolutiva ao proponente + trilha de
  auditoria). O registro de **fontes autorizadas** (permissão em bloco) também é do moderador.
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
  da equipe via **Supabase Realtime** (sem servidor always-on; **não** Socket.IO, que exigiria
  máquina paga). Regras:
  - **Opcional**, por repertório/sessão. Desligado, cada um navega sozinho (comportamento atual).
  - **Um mestre por vez, transferível por toque.** Quem abre a sessão é o mestre; um botão
    "assumir comando" passa o bastão. Só o mestre empurra a tela dos outros → elimina a
    "guerra de scroll".
  - **Seguir é o padrão; olhar adiante não é punido.** O seguidor acompanha o mestre
    (música + scroll + tom) enquanto não mexe; ao arrastar a própria tela ele se solta
    (leitura livre) **sem afetar ninguém**, com aviso discreto e botão "voltar a seguir".
  - **Caso de uso forte:** um operador que não está tocando conduz as telas de toda a equipe
    (scroll incluído), mãos livres, sem pedaleira.
  - **Estado mínimo compartilhado:** quem é o mestre + música/posição atual dele. Cada aparelho
    decide localmente se segue (tolerante a wifi ruim; ao reconectar, relê o estado). Tratar
    conflito de mestre.

## 8. Partes fixas da Missa (Ordinário)

- **Partes cantadas** (Santo, Cordeiro, Glória, aclamações) → são músicas no catálogo, tag
  `Ordinário`. **Fazer.**
- **Respostas curtas da assembleia** → baixo risco, compõem um "modo acompanhamento".
- **Partes variáveis** (leituras/salmo) → vêm da API litúrgica (§6).
- **Textos oficiais completos** (Orações Eucarísticas, Lecionário na íntegra) → **protegidos
  pela CNBB**: engenharia trivial, gargalo é licenciamento. **DECISÃO EM ABERTO** — licenciar,
  linkar fonte autorizada, ou começar só com as respostas curtas.

## 9. Comunidade e custo

- **Contribuições:** canal explícito ("sugerir à comunidade" numa música ou repertório) +
  canal implícito (sinal agregado dos overrides). Fila de revisão do moderador; opcional
  digest semanal por Resend. Botão "reportar" (futuro) cai na mesma fila.

**Direitos autorais — do gate à publicação.** Resumo do implementado (fonte de verdade no
código: `packages/db` + `@asafe/core`):

- **Gate de promoção.** Antes de ir ao global, o proponente **declara a autoria**: obra
  própria · domínio público · de outro autor · não sei. Isso define o `copyright_status`.
  Uma heurística sugere pela ficha do compositor e **avisa** contradições (não bloqueia).
- **Obra própria → consentimento.** O autor escolhe a **licença** e aceita um **consentimento
  versionado** (registro probatório: licença + quem/quando). Vira `licenca_aberta`.
- **De outro autor → protegida, salvo permissão.** Sem permissão, fica `protegida` e entra
  só como **referência**. Com **"tenho autorização"** + **evidência** (link/nota), vira
  `permissao` e a cifra pode ir ao global. O moderador **revisa a evidência** antes de aprovar.
- **Fonte autorizada (permissão em bloco).** Um compositor/editora autorizado é registrado
  pelo moderador (`authorized_source`); aí o gate **pré-preenche** a permissão para as obras
  desse autor. **Humano no loop** — sugere, não auto-classifica. (Formalização jurídica dos
  critérios: aberto, §11.)
- **Atribuição sempre visível.** O autor acompanha a obra em toda superfície pública — link,
  comunidade, global (direito moral).
- **Consumo respeita referência × conteúdo.** "Pegar" um repertório da comunidade **clona o
  arranjo** sem duplicar conteúdo: músicas livres/que já tenho vêm cheias; as protegidas
  entram como **referência** com **"digitar uma vez"** (minha cópia privada) ou link. A cifra
  protegida de outra pessoa **nunca é redistribuída**.
- **Acompanhamento.** "Meus envios" mostra o status de cada submissão (pendente / publicado /
  devolvido / recusado) + o motivo/nota da moderação.

- **Custo ~zero.** Dado é quase todo texto (~1–3 KB por música); os limites gratuitos do
  Supabase comportam um acervo muito maior que uma diocese produz. Áudio é **link** (sem
  upload); PDF é gerado sob demanda (não guardado); liturgia em cache; Cloudflare CDN na
  frente dos links. Um ping diário (GitHub Actions) evita a pausa do Supabase. Único custo
  quase certo: domínio (~R$ 40/ano), e mesmo assim opcional (`*.workers.dev` grátis).

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

- **Formalização jurídica dos direitos (§11-legal).** O **mecanismo** está pronto — gate de
  autoria, `copyright_status`, consentimento de obra própria, permissão por obra e **fonte
  autorizada** (permissão em bloco). Falta a camada **legal**: o texto do termo de licença
  (o `CONSENT_TEXT` é **placeholder**) e os critérios do que conta como permissão válida.
  Enquanto isso, a postura é **conservadora** (humano no loop; nada é auto-classificado).
  Evolução possível com base legal: **anexar** o comprovante de permissão (hoje a evidência
  é link/nota).
- Licenciamento CNBB para textos oficiais (§8).
- Completude do calendário nacional do Brasil na LitCal.
- Escolha da API de liturgia diária + fragilidade de scraping.
- Domínio: rodar grátis em `*.workers.dev` ou registrar `asafe.com.br` / `asafe.app`.
- ~~**O que "aprovar um repertório" publica.**~~ **Resolvido** (referência × conteúdo): a
  cifra saiu de `song` para `song_content`, com RLS própria; aprovar um repertório torna
  legível o **metadado** das músicas, mas a **cifra** só quando a obra é livre/autorizada.
  Expor a referência deixou de expor o conteúdo.

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

**Status atual:** Fase 1 (MVP) entregue e **no ar** (Cloudflare Workers + Supabase de produção);
comunidade com moderação, importação em lote e identidade visual também prontas. O épico de
**direitos autorais** (referência × conteúdo, gate de promoção, consentimento, permissão por
obra e fonte autorizada, atribuição sempre visível) está implementado. Próximo bloco grande: a **camada litúrgica** (§6) e os
**modos de apresentação** (§7). O status vivo por funcionalidade fica no [`README.md`](../README.md).
