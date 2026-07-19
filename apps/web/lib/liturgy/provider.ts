import { type DailyReadings, type LiturgyProvider, parseDancrfReadings } from "@asafe/core";

const DANCRF = process.env.LITURGY_API_URL ?? "https://liturgia.up.railway.app/v2";

/**
 * Provider primário de leituras — Dancrf (`liturgia.up.railway.app`). Consulta
 * por DATA e extrai só as REFERÊNCIAS (o texto tem copyright, ver §6/A0).
 */
export function dancrfProvider(): LiturgyProvider {
  return {
    async getReadings(date) {
      const [y, m, d] = date.split("-").map(Number);
      const res = await fetch(`${DANCRF}/?dia=${d}&mes=${m}&ano=${y}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`Dancrf ${res.status} para ${date}`);
      return parseDancrfReadings(await res.json());
    },
  };
}

/**
 * Encadeia providers: tenta cada um em ordem, cai para o próximo se falhar ou
 * vier vazio. (Hoje só Dancrf; a JosueSantos não expõe referência limpa —
 * fallback fica para quando houver uma fonte de referências alternativa.)
 */
export function compositeProvider(...providers: LiturgyProvider[]): LiturgyProvider {
  return {
    async getReadings(date): Promise<DailyReadings> {
      let lastErr: unknown;
      for (const p of providers) {
        try {
          const out = await p.getReadings(date);
          if (out.refs.length > 0) return out;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr ?? new Error(`Nenhum provider resolveu as leituras de ${date}`);
    },
  };
}
