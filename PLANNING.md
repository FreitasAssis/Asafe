# Asafe — Documento de Planejamento

> **O que é isto:** o brief de arquitetura e produto do *Asafe*. Serve como
> fonte de verdade e documentação viva. Qualquer pessoa nova no projeto deve ler este arquivo antes de começar.
>
> **O nome:** *Asafe* foi o mestre de canto que o rei Davi pôs à frente da música na
> Casa do Senhor, e autor de uma dúzia de salmos (50, 73–83). O app leva o nome **e** a
> missão: ajudar a preparar a música da celebração. A história do nome é usada como
> identidade do produto — ver §16 (Identidade e onboarding).

---

## 1. Visão e problema

O Asafe ajuda músicos católicos a **organizar e compartilhar repertórios** para
Missas e outros eventos (casamentos, adorações, terços, encontros).

A dor central que resolvemos: hoje as músicas vivem em folhas soltas no Drive/Docs,
e é trabalhoso (a) achar a música certa para cada momento e tempo litúrgico, e
(b) **não repetir** as mesmas músicas de uma celebração para outra.

O usuário típico: músico voluntário de paróquia, que monta o repertório no ônibus
a caminho da Missa e quer mandar a versão certa no grupo do WhatsApp da equipe.

### Pitch (descrição para usuários — uso em loja / apresentação)

> **Asafe** é onde o seu ministério de música organiza os repertórios das celebrações —
> num lugar só, no lugar das folhas soltas e dos PDFs perdidos no WhatsApp.
>
> Monte o repertório de uma Missa, de um grupo de oração, de um casamento ou de uma
> adoração escolhendo cantos de um catálogo vivo, com cifra e letra. Transponha para o
> tom da sua voz, esconda os acordes para quem só canta, e acompanhe tudo no celular ou
> tablet na hora da celebração, mesmo sem internet.
>
> Para a Missa, o app já sabe o dia litúrgico, o tempo e as leituras — e te ajuda a
> encontrar a música certa para cada momento, sem repetir o que você cantou nos últimos
> domingos. Achou um canto que combina com o Evangelho de domingo? Guarde essa ligação:
> da próxima vez que aquela leitura voltar, o canto reaparece — para você e para
> qualquer equipe.
>
> E nada disso é uma ilha. Compartilhe o repertório com a sua equipe ou mande um link
> para qualquer pessoa abrir e acompanhar. Marque suas próprias versões e classificações
> sem bagunçar as dos outros — e, quando quiser, contribua de volta para um acervo que
> cresce com toda a comunidade.
>
> Gratuito, aberto e feito para você.

## 2. Posicionamento e diferencial

O mercado **não está vazio**. Concorrentes diretos no Brasil:

- **Cantate** (cantate.app) — polido, comercial: biblioteca litúrgica, antífonas/salmos
  do dia, filtro por momento/tempo, cifras, transposição, autorrolagem, videoaulas.
- **CatoliChord** (catholichord.com) — muito próximo: setlists litúrgicos, cifras,
  liturgia do dia, offline, permissões, biblioteca pública com classificação por IA,
  e import dos textos oficiais da Oração Eucarística. Freemium/pago.
- **Canta Igreja** (canta.app) — grátis, mas só Android e só letra (sem cifra/transpor).
- **Cânticos Litúrgicos** (Play Store) — offline travado atrás de chave paga.

**Não tentamos vencer no número de recursos** (perderíamos para times comerciais).
Vencemos pela *filosofia*. Três diferenciais defensáveis:

1. **Curadoria comunitária com camada pessoal.** Cada usuário pode discordar da
   classificação ("para mim isto é FINAL, não ENTRADA") no seu próprio espaço, e esse
   desacordo vira **sinal agregado** que melhora o catálogo de todos. Respeita uma
   verdade litúrgica: a mesma música tem função diferente em comunidades/dioceses
   diferentes. Não vi isso em nenhum concorrente.
2. **Acervo próprio e portabilidade.** Suas folhas viram *suas* músicas; você é dono
   do seu repertório, não só consumidor de um catálogo fechado.
3. **Aberto e gratuito de verdade** (open source). Vira estratégia: confiança,
   contribuidores, longevidade, possível patrocínio institucional (paróquia/diocese).

Bônus de produto: **indicador de "usada há tanto tempo"** ao lado de cada música,
ligado ao *seu* histórico entre Missas — ataca diretamente o problema de não repetir.

## 3. Princípios

- **Open source — licença: AGPL-3.0.** Escolhida porque fecha a brecha dos apps web:
  na GPL comum, quem só *roda* o código num servidor (sem distribuir) não precisa abrir
  nada; a **AGPL trata "oferecer o app pela internet" como distribuição**, então quem
  hospedar uma versão modificada do Asafe é obrigado a disponibilizar o código
  modificado. Resultado: outros podem criar derivados, mas **não podem fechar** o que
  derivarem nem transformar em produto proprietário fechado. (Alternativa permissiva,
  se um dia priorizar adoção máxima sobre proteção: MIT.) Marca e comunidade são
  proteções **separadas** da licença e continuam suas.
- **Separar código de conteúdo.** O código é público; **não** comitar conteúdo
  protegido (cifras de terceiros, textos litúrgicos da CNBB) no repositório.
- **Custo ~zero por design.** As decisões de arquitetura existem para manter o app no
  plano gratuito indefinidamente em escala paroquial (ver §11).
- **Sem fins lucrativos.** Se um dia precisar de infra paga, modelo de **doação/apoiador**
  antes de travar funcionalidade.

## 4. Stack técnico

- **Monorepo TypeScript** (Turborepo).
- **Web:** Next.js. Também renderiza as **páginas públicas de leitura** (links
  compartilhados) via SSR — preview bonito no WhatsApp e carregamento rápido sem login.
- **Mobile:** React Native (Expo), compartilhando pacotes de tipos/lógica com o web.
- **Backend de dados:** **Supabase** — Postgres + Auth + **RLS** + Storage + **Realtime**.
  O RLS expressa nativamente o modelo "vê o global + o seu + o compartilhado com o grupo".
  O Realtime cobre a navegação sincronizada sem servidor próprio (ver §8).
- **Hospedagem do front:** **Cloudflare Pages** (evita a restrição de uso comercial
  do plano Hobby do Vercel; CDN grátis para os links públicos).
- **E-mail:** **Resend** (digest do admin).
- **Camada de API/lógica:** **tRPC** para lógica custom type-safe; onde RLS já resolve,
  acessar via `supabase-js` direto. **Drizzle** para queries tipadas quando houver
  servidor próprio.
- **Cifras:** **ChordSheetJS** (parse/render/transposição de ChordPro e de
  "acordes sobre a letra").

### Onde cada coisa fica hospedada (plano gratuito)

O "backend" se divide em duas metades, em serviços diferentes — ambos gerenciados
(nada de administrar servidor) e dentro do plano gratuito:

```
   ┌─────────────────────┐        ┌──────────────────────────┐
   │   Cloudflare Pages   │        │        Supabase          │
   │  (CÓDIGO que roda)   │  ───▶  │   (DADOS / estado)       │
   │                      │  HTTPS │                          │
   │ • app Next.js        │        │ • Postgres (as tabelas)  │
   │ • funções de servidor│        │ • Auth (login)           │
   │ • tRPC               │        │ • Storage                │
   │ • páginas públicas   │        │ • RLS                    │
   │ • CDN dos links      │        │                          │
   └─────────┬────────────┘        └──────────────────────────┘
             │
             ▼
         Usuário (navegador / app)
```

Fluxo: o usuário acessa o app servido pelo **Cloudflare**, que conversa com o
**Supabase** para ler/gravar os dados. O Supabase roda em cima da AWS; o Cloudflare,
na rede edge deles. Você controla código e dados e pode exportar tudo a qualquer
momento (sem lock-in), mas o "metal" é da infra deles — é isso que mantém o custo em
zero. Auto-hospedar é possível (Supabase é open source, o app é seu), mas aí entra
custo de servidor e manutenção; para escala paroquial, o gerenciado é o caminho.

## 5. Modelo de dados

Tabelas (nomes de campo em inglês para casar com o código):

```
user            (id, email, role['user'|'moderator'|'admin'], created_at)
group           (id, name, owner_id)
membership      (user_id, group_id, role['owner'|'editor'|'viewer'])

song            (id, title, composer, default_key, chordpro_body,
                 audio_links[] /* só links, sem upload */,
                 owner_id /* NULL = catálogo global */, visibility, created_at)

song_arrangement(id, song_id /* música-pai */, owner_id,
                 chordpro_body /* VERSÃO COMPLETA do usuário, não diff */,
                 label /* "simplificada", "com baixo", "Missa das 19h" */,
                 is_default_for_user, created_at)
                 /* edição de cifra = versão/ramo, não override por diferença.
                    só para divergir de música GLOBAL; em música própria edita-se
                    o chordpro_body direto. clona a cifra global atual como ponto
                    de partida; independente dela depois (não recebe melhorias
                    automáticas). pode ser sugerido como versão alternativa global. */

tag             (id, name, category['momento'|'tempo_liturgico'|'tema'|'ocasiao'|
                                     'fonte'|'salmo' /* ref. ex.: "Salmo 22" */],
                 owner_id /* NULL = global; preenchido = tag pessoal */)
song_tag        (song_id, tag_id)            /* tags globais em músicas globais */

user_song_tag_override (user_id, song_id, tag_id, action['add'|'remove'])
                 /* tag CONTINUA override por diferença (universo discreto) */

repertoire      (id, title, type['Missa'|'Casamento'|'Adoração'|'Terço'|
                                  'GrupoDeOração'|'Sarau'|...],
                 date /* NULLABLE — nem todo tipo tem data litúrgica */,
                 liturgical_key  /* NULLABLE — só tipos litúrgicos. ÂNCORA da Missa,
                                    INDEXADA, p/ casar/reaproveitar entre anos */,
                 liturgical_snapshot jsonb /* NULLABLE — cópia CONGELADA (ver §7) */,
                 owner_id, group_id, visibility, created_at)
repertoire_item (id, repertoire_id, song_id,
                 arrangement_id /* NULL = cifra padrão da música */,
                 moment_slot, order /* a sequência REAL deste repertório mora aqui */,
                 transpose /* tom POR OCORRÊNCIA, separado do arranjo */, notes)

repertoire_assignment (id, repertoire_id,
                 repertoire_item_id /* NULL = papel do repertório todo */,
                 person /* nome livre ou user_id */, role /* "rege","sola","salmo",... */)
                 /* PAPÉIS por celebração: quem faz o quê. Opcional e leve;
                    texto livre basta no começo. */

-- ÂNCORAS não-litúrgicas (todo repertório é casado/reaproveitado por uma âncora):
repertoire_theme    (repertoire_id, tag_id /* categoria 'tema'; ex.: "O Amor de Deus" */)
repertoire_pericope (repertoire_id, pericope_id /* foco do encontro; ex.: Filho Pródigo */)
                 /* Missa âncora = liturgical_key; grupo de oração = tema e/ou perícope;
                    casamento = ocasião. O MESMO motor (§7) busca pela âncora do tipo. */

-- Sequência de momentos por tipo (semeia o repertório; ajustabilidade varia):
slot_template   (type,
                 slots[] /* [{key:'entrada', label:'Entrada', optional:false}, ...] */,
                 reorderable /* Missa=false (ordem canônica); grupo de oração=true */,
                 allow_custom_slots /* pode adicionar momentos próprios? */)
                 /* o template SEMEIA; a sequência final fica no repertoire_item.
                    mudar o template depois NÃO reescreve repertórios antigos. */

share_link      (id, repertoire_id, token, expires_at, scope='read')

contribution    (id, type['nova_musica_global'|'nova_tag_global'|'correcao_tag'|
                          'arranjo_alternativo'|'vinculo_pericope'],
                 submitter_id, payload jsonb, status['pendente'|'aprovada'|'rejeitada'],
                 note, created_at)

-- Vínculo música ↔ LEITURA (eixo "por conteúdo", além da posição litúrgica):
pericope        (id, ref_canonica /* legível: "Lc 15,1-3.11-32" */,
                 incipit /* "Filho Pródigo" */,
                 tipo['evangelho'|'1a_leitura'|'2a_leitura'|'salmo'])
pericope_segment(pericope_id, book, chapter, verse_start, verse_end)
                 /* 1+ por perícope; trecho não-contíguo vira vários segmentos.
                    é o que permite casar por SOBREPOSIÇÃO, não por string igual. */
song_pericope   (song_id, pericope_id, suggested_moment /* ex.: 'comunhao' */,
                 created_by, scope['pessoal'|'global'])
                 /* nasce pessoal; pode ser sugerido global (vinculo_pericope).
                    sinal agregado vale aqui: N equipes ligaram este canto a esta
                    leitura = sugestão forte. */

-- Camada litúrgica em DUAS partes (ver §7):
liturgical_day  (date, nation) → jsonb
                 /* RESOLUÇÃO do dia: tempo, semana, dia, celebração-que-vence,
                    rank, cor, ciclo_dominical[A|B|C], ciclo_ferial[I|II],
                    santo_do_dia(mês-dia). Fonte: LitCal. Específico do ano. */
lectionary      (liturgical_key, cycle) → jsonb
                 /* as LEITURAS de fato (1ª, salmo, [2ª], evangelho). Fonte: API BR.
                    DICIONÁRIO reutilizável — para de crescer após ~2-3 anos. */
```

**Regra das tags efetivas** (o que o usuário vê em uma música global):

```
tags_efetivas(user, song) = tags_globais(song) − {removes do user} ∪ {adds do user}
```

Em músicas **próprias** (`owner_id` preenchido), edita-se as tags direto, sem a
camada de diff.

**Sinal agregado (curadoria coletiva):** minerar `user_song_tag_override` por consenso.
Ex.: se N usuários, de forma independente, fizeram `remove ENTRADA / add FINAL` na
mesma música, o painel do admin mostra *"N usuários reclassificaram como FINAL — promover?"*
com um clique para aplicar no global.

**Tag vs. cifra — dois mecanismos diferentes de personalização:**
- **Tag** = override por **diferença** (`add`/`remove`), porque o universo é discreto
  (presente/ausente) e o diff some quando o global muda.
- **Cifra** = **arranjo/versão completa** (`song_arrangement`), porque cifra é texto
  estruturado contínuo; um diff de texto seria frágil (teria de ser reaplicado e
  poderia conflitar). Storage não é problema (é texto). Vários arranjos por
  usuário/música (ex.: "simplificada" + "com baixo"); escolhe-se o arranjo no
  `repertoire_item`. **Transposição é separada** (por ocorrência, no item) — não se
  cria arranjo só para mudar de tom.
- Ambos podem virar **contribuição** ao global: tag vira `correcao_tag`, cifra vira
  `arranjo_alternativo` (uma simplificada oficial, uma com cifras mais ricas).

## 6. Permissões / RLS / papéis

Política central (expressa em RLS no Supabase):

- Todo usuário lê o **catálogo global** + as **suas** músicas/tags/overrides +
  os **repertórios** que possui ou que foram compartilhados com o seu **grupo**.
- **Link público** = leitura via `token`, sem auth (validade opcional via `expires_at`).
- **Papéis:** `user` (usa), `moderator` (aprova contribuições), `admin` (gerencia papéis).
  O usuário-curador pode delegar o papel de moderador.

## 7. Camada litúrgica

Duas fontes complementares + cache:

1. **Calendário canônico — LitCal API** (johnromanodorazio.com, open source).
   Fornece tempo litúrgico, semana ("14º Domingo do Tempo Comum"), cor, solenidades,
   em JSON. Suporta **calendários nacionais** (`/calendar/nation/{NATION}`).
   *Verificar a completude do calendário nacional do Brasil (Aparecida, santos locais);
   contribuir/ajustar se faltar.*
2. **Leituras + santo do dia em PT** — API brasileira de liturgia diária
   (avaliar: `Dancrf/liturgia-diaria`, `LucasGiori/API-Liturgia-CNBB`, entre outras).
   **Atenção:** a maioria faz scraping (frágil quando o site-fonte muda) e há questão
   de direitos sobre o texto das leituras.

**Cache em duas camadas (sem Redis).** As leituras são indexadas pela *posição
litúrgica*, não pela data civil, e se repetem por ciclo — então separamos:

- `liturgical_day (date, nation)` — **resolução** do dia: tempo, semana, dia,
  celebração-que-vence, cor, ciclo dominical (A/B/C) **e ferial (I/II)**, santo do dia.
  Vem da LitCal. É **específico do ano** porque a Páscoa é móvel (a contagem do Tempo
  Comum desalinha; uma semana do TC é pulada em alguns anos) e por causa da precedência
  de santos. Pequeno; dá para pré-calcular anos inteiros.
- `lectionary (liturgical_key, cycle)` — as **leituras** de fato. Vem da API BR.
  É o **dicionário reutilizável**: depois de ~2-3 anos litúrgicos você já viu quase
  todas as combinações (domingos A/B/C, feriais I/II, santos conforme as datas passam)
  e praticamente para de chamar a API frágil. *Mitiga o risco de scraping.*

Fluxo: data do repertório → `liturgical_day` (resolve posição, ciclo, santo) →
deriva a `liturgical_key` → `lectionary` (hit = zero chamada externa; miss = busca
uma vez e guarda). **Atenção:** os ciclos são dois eixos — domingos/solenidades em
A/B/C (3 anos); feriais em Ano I/II (2 anos). O **santo do dia** recorre por data fixa
(mês-dia), não por posição. O direito autoral sobre o *texto* das leituras não muda;
só cai a frequência de busca.

*Por que não Redis:* o problema aqui é baixíssima frequência + necessidade de
**durabilidade**, o oposto do caso de uso do Redis (cache volátil de altíssima
frequência). Tabela Postgres faz melhor, não evapora em restart, e não adiciona um
serviço para manter (contra o princípio "0800"). Páginas públicas usam o **CDN do
Cloudflare** (cache HTTP nativo). Se um dia precisar de camada quente (ex.: rate limit
nos links), usar **Workers KV** do Cloudflare, não Redis hospedado.

**Snapshot litúrgico (≠ cache).** `repertoire.liturgical_snapshot` é uma cópia
**congelada** dos dados resolvidos, gravada no repertório na criação. O cache é
*referência* (compartilhada, regenerável, reflete o "melhor dado atual"); o snapshot é
*registro* (próprio do repertório, imutável). Assim, um repertório de 2 anos atrás
continua mostrando o contexto litúrgico com que foi montado, mesmo que a API, o
calendário ou o dicionário mudem depois. Guarda identidade + rótulos de exibição +
**referências** das leituras (ex.: "Mt 16,13-19"); o texto pesado fica no dicionário
(e é sensível a direitos). Analogia: a nota fiscal copia o preço da compra, não aponta
para o preço atual do produto. A `liturgical_key` fica também como **coluna indexada**
(para casar repertórios entre anos), separada do snapshot (que é para exibição).

**Reaproveitar repertório pela ÂNCORA.** Todo repertório tem uma âncora pela qual é
casado e reaproveitado entre equipes/anos — e o mesmo motor (anônimo, deduplicado, com
frescor) roda para todos, só muda a âncora:
- **Missa** → `liturgical_key` (a celebração resolvida). "Já tenho repertório para esta
  Missa?" é busca por chave igual. Festas de data fixa voltam todo ano (leituras
  próprias); domingos do TC a cada 3 anos; feriais a cada 2.
- **Grupo de oração** → `tema` (ex.: "O Amor de Deus") e/ou `pericope` (ex.: Filho
  Pródigo). "Que repertórios a comunidade montou sobre O Amor de Deus / sobre esta
  leitura?"
- **Casamento / outros** → ocasião.

Reaproveitar de um ano para outro **não** é o problema de repetição (ninguém lembra o
que cantou há 12 meses) — convive com o indicador de frescor, que cuida da repetição
**semana a semana**. O reaproveitamento traz junto a **sequência** de slots daquele
repertório (mora no `repertoire_item`), então pegar o encontro de outra equipe já vem
com a ordem que eles usaram, pronta para ajustar.

**Motor de sugestão (Fase 3).** Resolve a data → para cada momento da Missa, sugere
músicas cujas tags batem: **estação/tema** para o geral, **número do salmo** para o
salmo responsorial (próprio do dia), **identidade da festa** para hinos próprios.
Semeado pelos repertórios anteriores (seus → grupo → comunidade) e filtrado por frescor.
- **Não** mesclar "um canto de cada repertório" como padrão: um repertório tem
  coerência (tons, estilo, arco); mesclagem automática vira Frankenstein.
- Superfície principal = **repertórios inteiros como modelo** ("Repertório 1, 2, 3"),
  coerentes, escolhe-se um como base.
- Por cima, **pool por momento** como camada de *troca/descoberta* ("ver alternativas"):
  candidatos daquele slot, **deduplicados e contados por frequência** → recomendação
  ranqueada ("a entrada mais cantada nesta festa que você ainda não usou").
- Pool comunitário é **anônimo e agregado** ("14 equipes cantaram"), nunca atribuído.
- O **salmo** é o slot mais seguro para pool (próprio do dia → só arranjos do Salmo X).
- Risco de **homogeneização** (todos clicam no nº 1): frescor contrabalança; mostrar de
  propósito algumas alternativas menos frequentes; coocorrência ("equipes que cantaram
  esta entrada também cantaram esta comunhão") fica para Fase 3+.

**Eixo "por leitura" (perícope) — casar música com o CONTEÚDO, não só a posição.**
Caso de uso: um domingo comum em que o Evangelho é o Filho Pródigo, e o usuário conhece
um canto perfeito para a comunhão porque combina com o texto. Isso é um eixo à parte das
tags de posição/estação. Funciona assim:

- O usuário liga o canto à **leitura** (não à data): grava `song_pericope` apontando
  para a `pericope` (ref. canônica + incipit) e, opcionalmente, o `suggested_moment`.
  Pode fazer ao montar o repertório **ou** durante a semana, lendo o Evangelho.
- **Resgate:** ao montar o repertório de uma data, o fluxo já resolve
  `data → liturgical_day → lectionary`, e o `lectionary` expõe as **referências** das
  leituras do dia. Com a referência, busca-se "que músicas a comunidade ligou a esta
  leitura?". O canto reaparece **em qualquer ano**, independente de posição/ciclo, e
  para qualquer usuário.
- **Casamento por sobreposição (normalizado), não por string igual.** Os recortes
  variam (Lc 15,11-32 "curto" vs Lc 15,1-3.11-32 "longo" = mesma parábola). Por isso a
  perícope é decomposta em `pericope_segment (book, chapter, verse_start, verse_end)`;
  duas leituras "casam" quando seus segmentos se sobrepõem (mesmo livro+capítulo e
  intervalos de versículo que se intersectam). Assim o vínculo reaparece mesmo quando o
  recorte do dia é levemente diferente.
- **Curadoria comunitária:** vínculo nasce `pessoal`; pode ser sugerido global
  (`vinculo_pericope`); sinal agregado é forte aqui (N equipes ligando o mesmo canto à
  mesma leitura = recomendação robusta). **Diferencial:** nenhum concorrente visto
  cataloga por conteúdo de leitura — eles param na posição litúrgica.

**Slots por tipo (templates).** Cada `type` traz um `slot_template` que **semeia** o
repertório; a ajustabilidade varia conforme a natureza do tipo (espectro, não binário):
- **Missa = estrutura canônica** (`reorderable=false`). A ordem é a forma do rito, não
  preferência. O que *varia* é condicional e vem da resolução litúrgica, não de arrastar:
  **Glória** omitido no Advento/Quaresma; **Aclamação** não é "Aleluia" na Quaresma;
  **Salmo responsorial** é próprio do dia. Pode-se acrescentar um momento opcional
  (ação de graças, instrumental), mas não inverter Comunhão com Entrada.
- **Grupo de oração = estrutura sugerida** (`reorderable=true`, `allow_custom_slots=true`):
  abre com abertura/louvor/adoração/ministração/envio, mas reordena, renomeia, remove e
  adiciona à vontade.
- **Sarau / lista livre** = template mínimo ou inexistente.

Em todos os casos a **sequência final mora no `repertoire_item`** (`moment_slot`+`order`),
não no template — ajustes são daquele repertório, e mudar o template depois não reescreve
os antigos (mesma lógica de "registro congelado" do snapshot, aplicada à estrutura).
**Tipos não-litúrgicos** (grupo de oração, sarau) simplesmente pulam o pipeline litúrgico
(`liturgical_key`/`snapshot` nulos); são ancorados por tema e/ou perícope (ver acima).
Músicas tagueadas por momento.

## 8. ChordPro — entrada e exibição

- **Armazenamento interno em ChordPro** (dá transposição, esconder cifra, reflow).
  O usuário **não precisa** conhecer ChordPro.
- **Entrada:** campo de texto com **preview ao vivo**. Aceitar:
  - **"Acordes sobre a letra"** (estilo CifraClub) — formato que o músico já usa;
    o ChordSheetJS converte.
  - **ChordPro** direto (detectar automaticamente pela presença de `[ ]`).
  - **Só letra** (música de assembleia, sem cifra) — o toggle de esconder cifra
    nem aparece nesse caso.
- **Exibição:** modos cifra+letra / só letra / esconder cifra (toggle por usuário);
  **modo palco** (tema escuro, fonte grande, autoscroll, capo); transposição por
  `repertoire_item`.
- **Modo projeção:** letra grande, limpa, para projetar num telão/TV e a assembleia
  acompanhar (sem cifra). Reaproveita a letra que já está estruturada — custo baixo.
- **Navegação sincronizada (opcional — Fase 3):** modo palco com sincronização em tempo
  real entre os aparelhos da equipe — música atual, scroll e tom espelhados. É um **toggle
  ativar/desativar** (por repertório/sessão); desligado, cada um navega sozinho. Caso de
  uso forte: um **operador que NÃO está tocando** (coordenador/técnico, mãos livres) conduz
  as telas de todos, scroll incluído, sem precisar de pedaleira. Implementar via **Supabase
  Realtime** — já incluído no plano, com folga para dezenas de aparelhos; **não** usar
  Socket.IO/servidor always-on (sairia do gratuito). Tratar reconexão (relê o estado atual
  ao voltar) e conflito de mestre.
  - **Quem comanda — um mestre por vez, transferível por toque.** Quem abre a sessão vira
    o mestre; um botão "assumir comando" passa o bastão (mestre travou, ou troca de quem
    conduz). Evita a "guerra de scroll" porque só um empurra a tela dos outros.
  - **Seguir é o padrão; olhar adiante não é punido.** Enquanto não mexe, o seguidor
    acompanha o mestre. Ao **arrastar a própria tela**, ele se solta (leitura livre) e
    **não afeta ninguém** — comandar ≠ olhar. Aviso discreto "você saiu da sincronia" +
    botão **"voltar a seguir"** (recoloca na posição do mestre num toque; pode
    ressincronizar sozinho após alguns segundos parado).
  - Estado mínimo que importa: *quem é o mestre* e *música/posição atual dele*; cada
    aparelho decide localmente se segue — tolerante a wifi ruim.
- **Editar a cifra (não só o tom):** adicionar/remover acordes, versão simplificada etc.
  gera um **arranjo** (`song_arrangement`) — versão ChordPro completa que aponta para a
  música-pai. Não é diff/override. Vários por usuário (com `label`); escolhe-se o arranjo
  ao inserir no repertório. Só vale para divergir de música **global**; em música própria,
  edita-se direto. Clona a cifra global atual como ponto de partida e fica independente
  dela. Pode ser sugerido como **arranjo alternativo** ao catálogo global. (Detalhe em §5.)

## 9. Partes fixas da Missa (Ordinário)

Quatro pedaços com viabilidades diferentes:

- **Partes cantadas** (Santo, Cordeiro, Glória, aclamações) → são **músicas** no
  catálogo, tag `Ordinário`. A cifra/arranjo é do compositor. **Fazer.**
- **Respostas curtas da assembleia** ("E com o vosso espírito"...) → curtas, baixo
  risco; compõem um "modo acompanhamento". **Fazer (default seguro).**
- **Partes variáveis** (leituras/salmo/antífonas) → vêm da API litúrgica (§7).
- **Textos oficiais completos** (Orações Eucarísticas, Ordinário/Lecionário na íntegra)
  → **protegidos pela CNBB**: o colofão proíbe reproduzir ou armazenar em banco de
  dados sem permissão escrita. **Engenharia trivial, gargalo é licenciamento.**
  Caminhos: licenciar com a Edições CNBB, linkar fonte autorizada (`missalromano.com.br`),
  ou começar só com as respostas curtas. **DECISÃO EM ABERTO.**

## 10. Comunidade, contribuições e notificações

- **Canal explícito:** ao criar uma tag ou música pessoal, checkbox
  *"sugerir para o catálogo global"* → cria uma linha em `contribution`.
- **Canal implícito:** o sinal agregado dos overrides (§5) surge no painel do admin.
- **Notificação do admin (mais simples e barato):** fila de revisão no painel com
  **contador/badge** (zero infra extra), ordenável por força do consenso.
  Opcional: **digest semanal** por Resend. **Evitar** notificação por evento (ruído).
- **Botão "reportar" (singelo):** em cada música, um toque para sinalizar problema
  (cifra errada, letra trocada, tom estranho) com um motivo curto. Cai na **mesma fila**
  de moderação — nada de UI pesada. É o jeito mais barato de manter o catálogo limpo
  com a ajuda da comunidade.

## 11. Sustentabilidade e custo de infra

Confiança de **R$ 0 indefinidamente em escala paroquial** (e além):

- Dado é quase todo texto: uma música ChordPro tem ~1–3 KB. Os 500 MB do Postgres
  grátis do Supabase comportam um acervo muito maior que uma paróquia/diocese produz.
- 50 mil MAU do auth é astronômico para o público-alvo.
- O que encareceria (storage/tráfego de arquivos) está **desenhado para fora**:
  áudio = link (sem upload), PDF gerado sob demanda (não guardado), liturgia em cache,
  Cloudflare CDN na frente dos links públicos.
- A pausa do Supabase após 7 dias se resolve com um **ping diário** (GitHub Actions
  grátis); um app usado toda semana nem chega a pausar.
- Único custo quase certo: **domínio próprio** (~R$ 40/ano `.com.br` / ~US$ 15 `.app`),
  e mesmo assim opcional (dá para rodar no subdomínio grátis `*.pages.dev`).
- Gasto real (Supabase Pro ~US$ 25/mês) só apareceria numa escala bem acima do esperado.

## 12. Roadmap por fases

**MVP (Fase 1) — sem dependências externas:**
- Catálogo com tags categorizadas + músicas e overrides pessoais.
- Montar repertório **por tipo** com **templates de slot** (Missa canônica;
  grupo de oração / sarau flexíveis e reordenáveis); sequência mora no item.
- Âncora por **tema** para tipos não-litúrgicos (`repertoire_theme`).
- ChordPro: entrada "cole sua cifra" + preview + transposição + modos de exibição.
- Compartilhar: com grupo + link público (validade opcional).
- Indicador de "usada há tanto tempo".

**Fase 2 — liturgia + comunidade:**
- Integração LitCal + liturgia diária + cache em duas camadas + snapshot.
- Slots automáticos da Missa por tempo litúrgico.
- Ordinário cantado + respostas curtas (modo acompanhamento).
- Arranjos de cifra (`song_arrangement`) + escolha de arranjo no item.
- Vínculo música ↔ leitura (`pericope`/`song_pericope`) + resgate por sobreposição de
  referência do dia; âncora por **perícope** em encontros não-litúrgicos
  (`repertoire_pericope`).
- Fila de contribuições (tag, música, **arranjo alternativo**, **vínculo de perícope**)
  + sinal agregado + moderação + digest Resend.
- **Botão "reportar"** (singelo) em cada música → mesma fila de moderação.
- **Modo projeção** (letra grande para telão/TV; custo baixo).

**Fase 3 — inteligência e alcance:**
- Reaproveitar repertório por `liturgical_key` (seus → grupo → comunidade anônima).
- Motor de sugestão por momento (estação/tema, nº do salmo, identidade da festa,
  **conteúdo da leitura via perícope**), com pool deduplicado/ranqueado e filtro de
  frescor (ver §7).
- Analytics de uso (mais/menos tocadas).
- PWA offline (cachear o repertório do dia).
- **Papéis no repertório** (`repertoire_assignment`: quem rege, quem sola, quem faz o salmo).
- **Navegação sincronizada** no modo palco (música atual + scroll + tom em tempo real),
  **opcional** (toggle ativar/desativar), via **Supabase Realtime** (sem custo extra).
  Caso forte: operador que não toca conduz as telas da equipe. Tratar reconexão/conflito.
- Coocorrência entre slots; licenciamento CNBB para textos oficiais (se for o caminho).

## 13. Decisões em aberto / riscos

- Licenciamento CNBB para textos oficiais (§9).
- Direitos de cifras/letras no catálogo **global** (curar; não comitar material protegido).
- Completude do calendário nacional do Brasil na LitCal.
- Escolha da API de liturgia diária + fragilidade de scraping.
- Domínio: rodar grátis em `*.pages.dev` ou registrar `asafe.*` (checar disponibilidade;
  confirmar `asafe.com.br` no Registro.br e `asafe.app` num registrador).

> Licença OSS: **definida — AGPL-3.0** (ver §3).
> Pool comunitário de sugestão: **definido — anônimo e agregado** (ver §7).

## 14. Estrutura de repositório sugerida

```
asafe/
├─ apps/
│  ├─ web/         # Next.js (app + páginas públicas SSR)
│  └─ mobile/      # Expo / React Native
├─ packages/
│  ├─ db/          # schema Drizzle, migrations, políticas RLS
│  ├─ core/        # tipos e lógica compartilhada (tags efetivas, slots da Missa)
│  └─ chordpro/    # wrappers do ChordSheetJS (parse, render, transpor)
├─ PLANNING.md
└─ turbo.json
```

## 15. Próximos passos imediatos

1. Inicializar o monorepo (Turborepo) + projeto Supabase.
2. Escrever o schema (§5) em Drizzle + as políticas RLS (§6).
3. Construir o fluxo do **MVP** (§12) — começando pelo catálogo + tags efetivas
   e pelo editor ChordPro com preview.
4. Só então integrar a camada litúrgica (Fase 2).

## 16. Identidade e onboarding (a história do nome)

*Asafe* é um nome pouco conhecido — e isso é tratado como **força, não remendo**: um app
litúrgico que, de quebra, ensina um pedaço da Escritura. Quem foi Asaf: o mestre de canto
que o rei Davi pôs à frente da música na Casa do Senhor; agradou tanto que viraram salmos
(os "Salmos de Asaf", 50 e 73–83). É a mesma função que o app exerce — organizar e
preparar a música do culto. A persona pode se apresentar como "seu Asaf" (ideia de
assistente nomeado, tipo Alexa/Siri, mas com lastro bíblico real).

**Regra de ouro:** a explicação é sempre **opcional e nunca bloqueia**. Convite, não aula;
nada de catequese forçada. Tudo desligável.

Onde a história aparece (do mais leve ao mais explícito):
- **Boas-vindas (1º acesso):** uma tela curta, fechável num toque, com a microcópia —
  *"Asaf foi o mestre de canto que o rei Davi encarregou de cuidar da música na Casa do
  Senhor. Agradou tanto que viraram salmos. Este app leva o nome dele — e a mesma missão:
  ajudar você a preparar a música da celebração."* Com um "saiba mais" opcional.
- **Tela "Sobre":** versão completa (quem foi Asaf, os salmos atribuídos, o porquê do
  nome). Quem é curioso busca; quem não é, nunca tropeça.
- **Toque contextual via Salmos de Asaf** (aproveita o eixo de perícope, §7): quando um
  Salmo de Asaf cai na liturgia do dia (ou ao abrir o Salmo 50, p.ex.), um aviso discreto
  e desligável — *"Hoje a liturgia traz um Salmo de Asaf, que dá nome a este app."* O nome
  vira um fio que reaparece de leve no uso. **Diferencial:** nenhum concorrente tem nome
  com história para reencontrar assim.
- **Micro-tooltip** ("?") na primeira vez que "Asafe" aparece em destaque, abrindo uma
  linha de explicação.
