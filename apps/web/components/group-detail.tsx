"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MembershipRole } from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { Breadcrumb } from "@/components/breadcrumb";
import {
  approveRequest,
  createInvite,
  deleteGroup,
  leaveGroup,
  rejectRequest,
  removeMember,
  renameGroup,
  revokeInvite,
  setMemberRole,
  transferGroup,
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
  const [name, setName] = useState(group.name);

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

  async function changeRole(userId: string, newRole: "editor" | "viewer") {
    try {
      await setMemberRole(browserClient(), group.id, userId, newRole);
      setMemberList((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: newRole } : m)));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao mudar o papel.");
    }
  }

  async function promote(m: GroupMember) {
    if (
      !confirm(
        `Passar a titularidade para ${m.name ?? m.email}? Você deixa de ser o dono e passa a editor. Não dá para desfazer sozinho.`,
      )
    )
      return;
    setBusy(true);
    try {
      await transferGroup(browserClient(), group.id, m.userId);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao passar a titularidade.");
      setBusy(false);
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

  async function saveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === group.name) return;
    setBusy(true);
    setMsg(null);
    try {
      await renameGroup(browserClient(), group.id, trimmed);
      setMsg("Nome salvo ✓");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao renomear.");
    } finally {
      setBusy(false);
    }
  }

  async function destroy() {
    if (
      !confirm(
        `Excluir o grupo "${group.name}"? Os repertórios compartilhados com ele deixam de ser compartilhados. Não dá para desfazer.`,
      )
    )
      return;
    setBusy(true);
    try {
      await deleteGroup(browserClient(), group.id);
      router.push("/grupos");
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Erro ao excluir o grupo.");
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "1.5rem auto", padding: "0 1rem", fontFamily: "system-ui" }}>
      <Breadcrumb items={[{ label: "Grupos", href: "/grupos" }, { label: group.name }]} />
      {isOwner ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Nome do grupo"
            style={{ flex: 1, padding: 8, fontSize: 20, fontWeight: 600 }}
          />
          <button
            type="button"
            className="btn"
            onClick={() => void saveName()}
            disabled={busy || !name.trim() || name.trim() === group.name}
          >
            Salvar
          </button>
        </div>
      ) : (
        <h1 style={{ margin: "8px 0 0" }}>{group.name}</h1>
      )}

      <section style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 16 }}>Membros</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {memberList.map((m) => (
            <li
              key={m.userId}
              style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", fontSize: 14 }}
            >
              <span style={{ flex: 1 }}>
                {m.name ?? m.email}
                {!(isOwner && m.role !== "owner") && ` · ${ROLE_LABELS[m.role]}`}
                {m.name && <span style={{ color: "var(--text-muted)", fontSize: 12 }}> ({m.email})</span>}
              </span>
              {isOwner && m.role !== "owner" && (
                <>
                  <select
                    value={m.role}
                    aria-label={`Papel de ${m.name ?? m.email}`}
                    onChange={(e) => void changeRole(m.userId, e.target.value as "editor" | "viewer")}
                    disabled={busy}
                    style={{ fontSize: 12 }}
                  >
                    <option value="viewer">leitor</option>
                    <option value="editor">editor</option>
                  </select>
                  <button type="button" onClick={() => void promote(m)} disabled={busy}>
                    tornar dono
                  </button>
                  <button type="button" onClick={() => void remove(m.userId)} style={{ color: "var(--danger)" }}>
                    remover
                  </button>
                </>
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
                  {r.name && <span style={{ color: "var(--text-muted)", fontSize: 12 }}> ({r.email})</span>}
                </span>
                <button type="button" onClick={() => void approve(r)} style={{ color: "#2a7" }}>
                  aprovar
                </button>
                <button type="button" onClick={() => void reject(r.userId)} style={{ color: "var(--danger)" }}>
                  recusar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && (
        <section style={{ marginTop: 16, padding: 12, border: "1px solid var(--border)", borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <strong>Convidar</strong>
            <label style={{ fontSize: 12, color: "var(--text-muted)" }}>
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
                  <button type="button" onClick={() => void revoke(i.id)} style={{ color: "var(--danger)" }}>
                    revogar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {isOwner && (
        <section style={{ marginTop: 24 }}>
          <button type="button" onClick={() => void destroy()} disabled={busy} style={{ color: "var(--danger)" }}>
            Excluir grupo
          </button>
        </section>
      )}

      {!isOwner && (
        <section style={{ marginTop: 16 }}>
          <button type="button" onClick={() => void leave()} disabled={busy} style={{ color: "var(--danger)" }}>
            Sair do grupo
          </button>
          {msg && <span style={{ fontSize: 12, color: "var(--danger)", marginLeft: 8 }}>{msg}</span>}
        </section>
      )}
    </main>
  );
}
