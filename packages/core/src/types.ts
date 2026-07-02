/**
 * Vocabulário de domínio do Asafe (ver DESIGN.md §4).
 * Uniões de literais estáveis usadas em todo o monorepo — code é fonte de verdade
 * dos nomes; os valores casam com as colunas do Postgres.
 */

/** Papel global do usuário (§6). */
export type UserRole = "user" | "moderator" | "admin";

/** Papel dentro de um grupo (§5: membership). */
export type MembershipRole = "owner" | "editor" | "viewer";

/** Categorias de tag (§5). */
export type TagCategory =
  | "momento"
  | "tempo_liturgico"
  | "tema"
  | "ocasiao"
  | "fonte"
  | "salmo";

/** Tipos de repertório (§5). Aberto a novos tipos no futuro. */
export type RepertoireType =
  | "Missa"
  | "Casamento"
  | "Adoracao"
  | "Terco"
  | "GrupoDeOracao"
  | "Livre";

/** Override pessoal de tag em música global (§5). */
export type TagOverrideAction = "add" | "remove";

/** Tipos de perícope, por leitura (§5). */
export type PericopeType = "evangelho" | "1a_leitura" | "2a_leitura" | "salmo";

/** Visibilidade de músicas/repertórios. */
export type Visibility = "private" | "group" | "public";

/** Tipos de contribuição à curadoria comunitária (§5, §10). */
export type ContributionType =
  | "nova_musica_global"
  | "nova_tag_global"
  | "correcao_tag"
  | "arranjo_alternativo"
  | "vinculo_pericope";

export type ContributionStatus = "pendente" | "aprovada" | "rejeitada";
