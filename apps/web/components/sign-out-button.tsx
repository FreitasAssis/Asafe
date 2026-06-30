"use client";

import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await browserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={() => void signOut()} style={{ padding: "8px 14px" }}>
      Sair
    </button>
  );
}
