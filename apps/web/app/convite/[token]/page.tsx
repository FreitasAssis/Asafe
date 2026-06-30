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
  if (!user) redirect("/login");

  return <JoinGroup token={token} />;
}
