"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MembershipRole } from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import {
  approveRequest,
  createInvite,
  leaveGroup,
  rejectRequest,
  removeMember,
  revokeInvite,
  type Group,
  type GroupInvite,
  type GroupMember,
  type JoinRequest,
} from "@/lib/groups";

const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "dono",
  editor: "editor",
  viewer: "leitor",
};

/** Detalhe do grupo: membros, convites (dono) e sair (membro). */
export function GroupDetail({
  group,
  members,
  requests,
  invites,
  isOwner,
  currentUserId,
}: {
  readonly group: Group;
  readonly members: GroupMember[];
  readonly requests: JoinRequest[];
  readonly invites: GroupInvite[];
  readonly isOwner: boolean;
  readonly currentUserId: string;
}) {
  const router = useRouter();
  const [memberList, setMemberList] = useState<GroupMember[]>(members);
  const [requestList, setRequestList] = useState<JoinRequest[]>(requests);
  const [inviteList, setInviteList] = useState<GroupInvite[]>(invites);
  const [role, setRole] = useState<"editor" | "viewer">("viewer");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const urlFor = (token: string) => `${window.location.origin}/convite/${token}`;

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      const invite = await createInvite(browserClient(), group.id, role, null);
      setInviteList((prev) => [...prev, invite]);
      const url = urlFor(invite.token);
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({ title: "Convite — Asafe", url });
        } catch {
          // usuário cancelou a bandeja — ok
        }
      } else {
        await navigator.clipboard.writeText(url);
        setMsg("Convite copiado!");
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao gerar convite.");
    } finally {
      setBusy(false);
    }
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(urlFor(token));
    setMsg("Convite copiado!");
  }

  async function revoke(id: string) {
    try {
      await revokeInvite(browserClient(), id);
      setInviteList((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao revogar.");
    }
  }

  async function approve(req: JoinRequest) {
    try {
      await approveRequest(browserClient(), group.id, req.userId, req.role);
      setRequestList((prev) => prev.filter((r) => r.userId !== req.userId));
      setMemberList((prev) => [
        ...prev,
        { userId: req.userId, name: req.name, email: req.email, role: req.role },
      ]);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao aprovar pedido.");
    }
  }

  async function reject(userId: string) {
    try {
      await rejectRequest(browserClient(), group.id, userId);
      setRequestList((prev) => prev.filter((r) => r.userId !== userId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao recusar pedido.");
    }
  }

  async function remove(userId: string) {
    try {
      await removeMember(browserClient(), group.id, userId);
      setMemberList((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao remover membro.");
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await leaveGroup(browserClient(), group.id, currentUserId);
      router.push("/grupos");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao sair do grupo.");
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <a href="/grupos" style={{ fontSize: 13, color: "#666" }}>
        ← grupos
      </a>
      <h1 style={{ margin: "8px 0 0" }}>{group.name}</h1>

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Membros</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {memberList.map((m) => (
            <li
              key={m.userId}
              style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}
            >
              <span style={{ flex: 1 }}>
                {m.name ?? m.email} · {ROLE_LABELS[m.role]}
                {m.name && <span style={{ color: "#999", fontSize: 12 }}> ({m.email})</span>}
              </span>
              {isOwner && m.role !== "owner" && (
                <button type="button" onClick={() => void remove(m.userId)} style={{ color: "#c00" }}>
                  remover
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner && requestList.length > 0 && (
        <section style={{ marginTop: 16 }}>
          <h2 style={{ fontSize: 16 }}>Pedidos pendentes</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {requestList.map((r) => (
              <li
                key={r.userId}
                style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}
              >
                <span style={{ flex: 1 }}>
                  {r.name ?? r.email} · {ROLE_LABELS[r.role]}
                  {r.name && <span style={{ color: "#999", fontSize: 12 }}> ({r.email})</span>}
                </span>
                <button type="button" onClick={() => void approve(r)} style={{ color: "#2a7" }}>
                  aprovar
                </button>
                <button type="button" onClick={() => void reject(r.userId)} style={{ color: "#c00" }}>
                  recusar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <section style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>Convidar</strong>
            <label style={{ fontSize: 12, color: "#666" }}>
              papel{" "}
              <select value={role} onChange={(e) => setRole(e.target.value as "editor" | "viewer")}>
                <option value="viewer">leitor</option>
                <option value="editor">editor</option>
              </select>
            </label>
            <button type="button" onClick={() => void generate()} disabled={busy}>
              {busy ? "…" : "Gerar convite"}
            </button>
            {msg && <span style={{ fontSize: 12, color: "#2a7" }}>{msg}</span>}
          </div>

          {inviteList.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
              {inviteList.map((i) => (
                <li
                  key={i.id}
                  style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}
                >
                  <span style={{ flex: 1 }}>{ROLE_LABELS[i.role]}</span>
                  <button type="button" onClick={() => void copy(i.token)}>
                    copiar
                  </button>
                  <button type="button" onClick={() => void revoke(i.id)} style={{ color: "#c00" }}>
                    revogar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!isOwner && (
        <section style={{ marginTop: 16 }}>
          <button type="button" onClick={() => void leave()} disabled={busy} style={{ color: "#c00" }}>
            Sair do grupo
          </button>
          {msg && <span style={{ fontSize: 12, color: "#c00", marginLeft: 8 }}>{msg}</span>}
        </section>
      )}
    </main>
  );
}
