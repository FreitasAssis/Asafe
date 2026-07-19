import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { NewRepertoireForm } from "@/components/new-repertoire-form";

export default async function NovoRepertorio() {
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <NewRepertoireForm />;
}
