import { isChordLine } from "./detect-format";

/**
 * Insere cada acorde de `chordLine` como `[acorde]` inline na coluna correspondente
 * de `lyricLine`, da direita para a esquerda (assim os índices à esquerda não se
 * deslocam). Se o acorde cai além do fim da letra, completa com espaços.
 */
function merge(chordLine: string, lyricLine: string): string {
  const chords = [...chordLine.matchAll(/\S+/g)].map((m) => ({
    chord: m[0],
    col: m.index ?? 0,
  }));
  let out = lyricLine;
  for (let i = chords.length - 1; i >= 0; i--) {
    const entry = chords[i];
    if (!entry) continue;
    const { chord, col } = entry;
    if (col > out.length) out = out.padEnd(col);
    out = `${out.slice(0, col)}[${chord}]${out.slice(col)}`;
  }
  return out;
}

/**
 * Converte "acordes sobre a letra" para ChordPro inline, **preservando a notação
 * exata** que o usuário colou (F°7, G7+, C#m7b5). Escrevemos o nosso conversor em
 * vez do `ChordsOverWordsParser` do ChordSheetJS porque este rejeitava acordes
 * alterados (° e + no sufixo) e os jogava fora, sumindo com cifras inteiras.
 *
 * Regra: uma linha de acordes seguida por uma linha de letra funde as duas; uma
 * linha de acordes solta (sem letra útil abaixo) vira acordes sobre espaços; o
 * resto passa intacto.
 */
export function chordsOverWordsToChordPro(input: string): string {
  const lines = input.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (next?.trim() && !isChordLine(next)) {
        out.push(merge(line, next));
        i += 2;
      } else {
        out.push(merge(line, ""));
        i += 1;
      }
    } else {
      out.push(line);
      i += 1;
    }
  }
  return out.join("\n");
}
