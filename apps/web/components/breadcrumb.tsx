import { Fragment } from "react";

export interface Crumb {
  readonly label: string;
  readonly href?: string;
}

/** Trilha de navegação. O último item é a página atual (sem link). */
export function Breadcrumb({ items }: { readonly items: readonly Crumb[] }) {
  return (
    <nav className="breadcrumb" aria-label="Trilha de navegação">
      {items.map((c, i) => (
        <Fragment key={`${c.label}-${i}`}>
          {i > 0 && <span className="sep">›</span>}
          {c.href ? <a href={c.href}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
        </Fragment>
      ))}
    </nav>
  );
}
