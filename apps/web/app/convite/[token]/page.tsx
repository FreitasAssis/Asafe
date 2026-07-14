import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { JoinGroup } from "@/components/join-group";

export default async function Convite({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await serverClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = encodeURIComponent(`/convite/${token}`);
    redirect(`/login?next=${next}`);
  }

  // Já é membro? Vai direto pro grupo, sem mostrar "Pedir para entrar".
  const { data } = await supabase.rpc("invite_membership", { p_token: token });
  const info = data as { groupId: string; isMember: boolean } | null;
  if (info?.isMember) redirect(`/grupos/${info.groupId}`);

  return <JoinGroup token={token} />;
}
