import { LandingContent } from "@/components/landing-content";

export const metadata = { title: "Sobre — Asafe" };

/** "/sobre" — mesma apresentação da raiz; mantém o link "saber mais"/login sempre acessível. */
export default function Sobre() {
  return <LandingContent />;
}
