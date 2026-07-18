/**
 * Formata uma transposição em **semitons** como tom/meio-tom (o que o botão faz de verdade):
 * cada passo é 1 semitom = ½ tom. Ex.: 1 → "+½", 2 → "+1", 3 → "+1½", -2 → "−1", 0 → "0".
 */
export function formatTom(semitones: number): string {
  if (semitones === 0) return "0";
  const sign = semitones > 0 ? "+" : "−";
  const abs = Math.abs(semitones);
  const whole = Math.floor(abs / 2);
  const half = abs % 2 === 1 ? "½" : "";
  const body = whole > 0 ? `${whole}${half}` : "½";
  return `${sign}${body}`;
}
