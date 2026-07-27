import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { LandingContent } from "@/components/landing-content";

export const metadata = { title: "Asafe — repertórios litúrgicos" };

/** Raiz pública: visitante deslogado vê a landing; logado vai para o app (/inicio). */
export default async function Root() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/inicio");
  return <LandingContent />;
}
