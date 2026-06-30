/**
 * Marca do Asafe: monograma (lira que é a letra "A") + wordmark em serif.
 * O traço usa --primary e as cordas usam --accent, então adapta ao tema.
 * `stacked` empilha (ícone em cima do nome); `size` controla o monograma.
 */
export function Brand({
  withWordmark = true,
  size = 28,
  stacked = false,
}: {
  readonly withWordmark?: boolean;
  readonly size?: number;
  readonly stacked?: boolean;
}) {
  return (
    <span
      className={
        stacked ? "inline-flex flex-col items-center gap-1.5" : "inline-flex items-center gap-2"
      }
    >
      <svg width={size} height={size} viewBox="0 0 56 56" role="img" aria-label="Asafe">
        <path
          d="M16 50 L28 8 L40 50"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="21.5" y1="34" x2="34.5" y2="34" stroke="var(--primary)" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="25" y1="34" x2="25" y2="46" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="28" y1="34" x2="28" y2="46" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
        <line x1="31" y1="34" x2="31" y2="46" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      {withWordmark && (
        <span
          className={`font-serif font-semibold tracking-tight text-ink ${stacked ? "text-2xl" : "text-lg"}`}
        >
          Asafe
        </span>
      )}
    </span>
  );
}
