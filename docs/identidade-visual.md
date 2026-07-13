# Asafe — Identidade visual

> Define paleta, acentos litúrgicos, logo, tipografia
> e os tokens de cor (CSS) prontos para usar. O objetivo é uma identidade **reverente
> e moderna**, legível no palco, humilde e comunitária — à altura do que o app é.
>
> Ver também `docs/DESIGN.md` §10 (identidade e onboarding). A **adoção** (trocar as cores
> inline por tokens, `data-theme`, fontes) é uma fatia própria — a "passada de UI pré-launch".

---

## 1. Princípios (de onde tudo vem)

- **Reverente, não "loja de artigos religiosos".** Nada de dourado barroco nem cruz
  genérica. Dignidade pela contenção, não pelo ornamento.
- **Papel e tinta.** A herança são as folhas de repertório — então a base é pergaminho
  e tinta. Calmo, de leitura.
- **Leitura em primeiro lugar.** O app vive na mão do músico durante a celebração, muitas
  vezes com pouca luz: alto contraste, tipografia generosa, **modo escuro de verdade**.
- **Acento litúrgico dinâmico** — a jogada que só o Asafe pode fazer. Como o app já
  resolve o tempo litúrgico, a cor de acento **acompanha a celebração** (verde no Tempo
  Comum, roxo na Quaresma, etc.). Comunica cuidado litúrgico sem dizer uma palavra.
- **Humilde e aberto.** Visual que não grita, não corporativo. O herói da tela é a
  cifra/letra; a identidade fica no entorno.

---

## 2. Paleta base (estável — é o rosto do app)

| Nome | Hex | Papel |
|------|-----|-------|
| Índigo vésperas | `#2F3A5E` | Cor-âncora da marca. Azul de crepúsculo, contemplativo, sacro sem ser de uma estação só. |
| Pergaminho | `#F4EEE1` | Fundo do modo claro. Papel quente. |
| Tinta | `#1E1C1A` | Texto no claro; **fundo do modo ao vivo**. Quase-preto quente. |
| Latão | `#B0894A` | Acento (luz de vela, cordas da lira). **Sempre mínimo** — gota, não banho. |
| Cinza pedra | `#8C8578` | Neutro de bordas e texto secundário **grande**. Para texto secundário pequeno, usar o pedra escuro `#6E685C` (ver tokens) — o `#8C8578` não passa AA em corpo pequeno. |

Regras de uso: texto de corpo é **tinta** (claro) ou **pergaminho** (palco); **índigo**
para elementos de marca/primários; **latão** só para acento e destaque, nunca para
blocos grandes. No modo escuro, o índigo precisa clarear para manter contraste (ver
tokens).

---

## 3. Acento litúrgico (dinâmico — muda com o tempo)

Dirigido pela mesma resolução litúrgica do app (LitCal). A interface se "veste" de leve
da cor do tempo. Tons **dessaturados e sóbrios** de propósito — reverência, não carnaval.

| Tempo litúrgico | Cor | Hex |
|-----------------|-----|-----|
| Tempo Comum | Verde | `#4F7A55` |
| Advento e Quaresma | Roxo | `#5E4A80` |
| Natal, Páscoa, festas e solenidades | Dourado/branco | `#C2A14E` (+ branco) |
| Pentecostes, Paixão, mártires | Vermelho | `#9E3B33` |
| *(opcional)* Gaudete e Laetare | Rosa | `#C98BA8` |

Aplicar como uma única variável (`--season`) trocada conforme o dia; usar com parcimônia
(realces, etiqueta de tempo, detalhe de cabeçalho), nunca como fundo dominante.

> **Faseamento.** O acento *automático* depende de um resolvedor **data → tempo litúrgico**
> que ainda não existe no app — hoje há só as **tags** `tempo_liturgico` (manuais); o
> resolvedor por data é a camada LitCal da Fase 2 (DESIGN §6, decisão em aberto). Então:
> a **paleta base** (índigo/latão) entra já na passada de UI; o `--season` começa **estático**
> (ou escolhido à mão) e passa a **acompanhar o dia** quando a camada litúrgica existir.

---

## 4. Logo / monograma

Conceito: uma **lira de Asaf que também é a letra "A"** — os braços formam o A, e as
cordas (em latão) pendem da travessa. Traço único, mono-cor, sem gradiente: funciona
minúsculo (ícone do app, favicon) e tanto no claro quanto no escuro.

Lockups: monograma em índigo sobre pergaminho (claro); em pergaminho com cordas douradas
sobre tinta (escuro). Wordmark "Asafe" em serif ao lado.

SVG de referência do monograma:

```svg
<svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="Asafe">
  <path d="M16 50 L28 8 L40 50" fill="none" stroke="#2F3A5E"
        stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  <line x1="21.5" y1="34" x2="34.5" y2="34" stroke="#2F3A5E"
        stroke-width="2.2" stroke-linecap="round"/>
  <line x1="25" y1="34" x2="25" y2="46" stroke="#B0894A" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="28" y1="34" x2="28" y2="46" stroke="#B0894A" stroke-width="1.6" stroke-linecap="round"/>
  <line x1="31" y1="34" x2="31" y2="46" stroke="#B0894A" stroke-width="1.6" stroke-linecap="round"/>
</svg>
```

Para o ícone do app/favicon, usar só o monograma (sem wordmark) sobre pergaminho ou índigo.

---

## 5. Tipografia

- **Wordmark e títulos:** um serif de caráter, voz de "livro/missal" — dá dignidade.
  Sugestões open-source: **Fraunces** ou **Spectral**.
- **Interface:** um sans humanista, limpo e muito legível. Sugestões: **Inter** ou
  **Source Sans 3**.
- **Cifras:** fonte de largura previsível para os acordes alinharem sobre a letra
  (mono). Sugestão: **JetBrains Mono** ou **IBM Plex Mono** — ou deixar o ChordSheetJS
  cuidar do alinhamento.

Todas as sugestões são fontes abertas, coerentes com a pegada open source do projeto.
Duas espessuras bastam (regular e medium); evitar pesos muito pesados.

---

## 6. Modo ao vivo (onde o app é tocado)

- Fundo **tinta** (`#1E1C1A`), texto **pergaminho** (`#F4EEE1`), acordes em **latão/dourado**.
- Alto contraste, fonte grande, sem distrações; autoscroll e capo já previstos no app.
- É o cenário mais importante de testar: se está legível e bonito no escuro, está pronto.

Exemplo de tratamento de cifra no palco:

```
Ré        Lá/Dó#        (latão #C2A14E)
Vós sois o Deus que salva (pergaminho #F4EEE1, sobre tinta #1E1C1A)
```

---

## 7. Imagem e uso de espaço

Restrição é a regra. O app é ferramenta; o herói da tela é a cifra/letra. Então:

- **Sem foto de fundo nem ilustração grande** competindo com o conteúdo.
- A identidade se carrega pelo **monograma pequeno**, pelo **espaço em branco generoso**,
  pela **tipografia** e pela **cor litúrgica**.
- No máximo, uma **textura de papel levíssima** no modo claro, se desejar.
- Modo escuro impecável é inegociável.

---

## 8. Tokens de cor (CSS — prontos para usar)

```css
:root {
  /* paleta base (estável) */
  --asafe-indigo:        #2F3A5E;
  --asafe-indigo-300:    #8E9AC4; /* índigo claro p/ uso sobre fundo escuro */
  --asafe-parchment:     #F4EEE1;
  --asafe-parchment-2:   #FBF8EF; /* superfície elevada no claro */
  --asafe-ink:           #1E1C1A;
  --asafe-brass:         #B0894A;
  --asafe-gold:          #C2A14E; /* latão mais claro, melhor sobre escuro */
  --asafe-stone:         #8C8578; /* neutro de bordas / texto secundário grande */
  --asafe-stone-700:     #6E685C; /* pedra escuro p/ texto secundário pequeno (AA) */

  /* acentos litúrgicos (hex estáveis; trocar --season conforme o dia) */
  --season-ordinary:     #4F7A55; /* tempo comum */
  --season-penitential:  #5E4A80; /* advento e quaresma */
  --season-feast:        #C2A14E; /* natal, páscoa, festas */
  --season-red:          #9E3B33; /* pentecostes, paixão, mártires */
  --season-rose:         #C98BA8; /* opcional: gaudete e laetare */
  --season:              var(--season-ordinary); /* default estático; o app sobrescreve quando houver camada litúrgica */

  /* papéis — modo claro */
  --bg:          var(--asafe-parchment);
  --surface:     var(--asafe-parchment-2);
  --text:        var(--asafe-ink);
  --text-muted:  var(--asafe-stone-700); /* texto secundário pequeno: pedra escuro (AA) */
  --primary:     var(--asafe-indigo);
  --accent:      var(--asafe-brass);
  --border:      #E3DBC9;
}

/* modo escuro / palco */
:root[data-theme="dark"] {
  --bg:          var(--asafe-ink);
  --surface:     #26231F;
  --text:        var(--asafe-parchment);
  --text-muted:  #A89E8C;
  --primary:     var(--asafe-indigo-300); /* índigo clareia no escuro */
  --accent:      var(--asafe-gold);       /* dourado lê melhor que latão */
  --border:      #3A352F;
}
```

Acessibilidade (contraste WCAG, medido sobre pergaminho `#F4EEE1` no claro / tinta `#1E1C1A`
no palco):

- **Corpo:** tinta s/ pergaminho **14.7** e pergaminho s/ tinta **14.7** (AAA).
- **Primário:** índigo s/ pergaminho **9.6** (AAA); índigo-300 s/ tinta **6.1** (AA).
- **Texto secundário:** pedra `#8C8578` dá só **3.16** (falha AA em corpo pequeno) →
  use `#6E685C` (**4.78**, AA) para legenda/texto pequeno no claro. No escuro, `#A89E8C`.
- **Latão é cor de acento, não de texto:** **2.78** s/ pergaminho — **falha**. Isso também
  vale para **ícones/labels pequenos**: nesses, use tinta ou índigo. No palco, o dourado
  `#C2A14E` s/ tinta dá **6.9** (AA) e pode marcar acordes.
