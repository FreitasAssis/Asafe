"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { browserClient } from "@/lib/supabase/client";

/** Estado compartilhado da sessão ao vivo: música atual e (B3.2) a seção/parágrafo em foco. */
export interface SyncState {
  idx: number;
  anchor?: number | null;
}

export interface LiveSync {
  isMaster: boolean;
  following: boolean;
  count: number;
  peers: string[];
  masterName: string | null;
  claim: () => void;
  detach: () => void;
  resync: () => void;
}

/**
 * Navegação sincronizada (B3) via Supabase Realtime — sem servidor always-on.
 *
 * Um **canal** por repertório (`live:{id}`) é a "sala". **Presence** conta quem está; **broadcast**
 * leva o estado do **mestre** (só um por vez) aos seguidores. Broadcast com `self:true` faz todos
 * — inclusive quem reivindicou — verem os `claim` na MESMA ordem, então convergem no mesmo mestre
 * mesmo em reivindicações simultâneas. Seguir é o padrão; quem navega sozinho se solta (`detach`)
 * e volta com `resync`. O mestre reemite o estado periodicamente (heartbeat) e quando alguém entra
 * (`hello`), cobrindo late-join e reconexão.
 *
 * Reaproveitado pelo modo Projeção como **seguidor silencioso** (sem UI de sincronia). Ver #35.
 */
export function useLiveSync(params: {
  repertoireId: string;
  enabled: boolean;
  userId: string;
  name: string;
  state: SyncState;
  onRemote: (s: SyncState) => void;
}): LiveSync {
  const { repertoireId, enabled, userId, name } = params;
  const [isMaster, setIsMaster] = useState(false);
  const [following, setFollowing] = useState(true);
  const [count, setCount] = useState(0);
  const [peers, setPeers] = useState<string[]>([]);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [masterName, setMasterName] = useState<string | null>(null);

  const chRef = useRef<RealtimeChannel | null>(null);
  const stateRef = useRef(params.state);
  const onRemoteRef = useRef(params.onRemote);
  const followingRef = useRef(following);
  const isMasterRef = useRef(isMaster);
  const masterIdRef = useRef(masterId);
  stateRef.current = params.state;
  onRemoteRef.current = params.onRemote;
  followingRef.current = following;
  isMasterRef.current = isMaster;
  masterIdRef.current = masterId;

  const sendState = useCallback(() => {
    chRef.current?.send({ type: "broadcast", event: "state", payload: stateRef.current });
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const supabase = browserClient();
    const ch = supabase.channel(`live:${repertoireId}`, {
      config: { private: true, presence: { key: userId }, broadcast: { self: true } },
    });
    chRef.current = ch;

    ch.on("broadcast", { event: "state" }, ({ payload }) => {
      if (followingRef.current && !isMasterRef.current) onRemoteRef.current(payload as SyncState);
    });
    ch.on("broadcast", { event: "claim" }, ({ payload }) => {
      const p = payload as { userId: string; name: string };
      setMasterId(p.userId);
      setMasterName(p.name);
      setIsMaster(p.userId === userId);
      if (p.userId !== userId) setFollowing(true); // ao trocar de mestre, volta a seguir
    });
    ch.on("broadcast", { event: "hello" }, () => {
      if (isMasterRef.current) sendState(); // ajuda quem acabou de entrar / reconectar
    });

    const refresh = () => {
      const st = ch.presenceState();
      setCount(Object.keys(st).length);
      setPeers(
        Object.values(st)
          .map((arr) => (arr[0] as { name?: string } | undefined)?.name)
          .filter((n): n is string => !!n),
      );
      // se o mestre saiu do canal, ninguém comanda até alguém reivindicar
      if (masterIdRef.current && !st[masterIdRef.current]) {
        setMasterId(null);
        setMasterName(null);
        setIsMaster(false);
      }
    };
    ch.on("presence", { event: "sync" }, refresh);
    ch.on("presence", { event: "join" }, refresh);
    ch.on("presence", { event: "leave" }, refresh);

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void ch.track({ name });
        ch.send({ type: "broadcast", event: "hello", payload: { userId } });
      }
    });

    return () => {
      void supabase.removeChannel(ch);
      chRef.current = null;
      setIsMaster(false);
      setFollowing(true);
      setMasterId(null);
      setMasterName(null);
      setCount(0);
      setPeers([]);
    };
  }, [enabled, repertoireId, userId, name, sendState]);

  // Mestre: transmite ao mudar o estado local (música/seção).
  useEffect(() => {
    if (enabled && isMaster) sendState();
  }, [enabled, isMaster, params.state.idx, params.state.anchor, sendState]);

  // Heartbeat do mestre (cobre quem entra/reconecta entre as mudanças).
  useEffect(() => {
    if (!enabled || !isMaster) return;
    const t = setInterval(sendState, 3000);
    return () => clearInterval(t);
  }, [enabled, isMaster, sendState]);

  const claim = useCallback(() => {
    setMasterId(userId);
    setMasterName(name);
    setIsMaster(true);
    setFollowing(false);
    chRef.current?.send({ type: "broadcast", event: "claim", payload: { userId, name } });
    sendState();
  }, [userId, name, sendState]);

  const detach = useCallback(() => setFollowing(false), []);
  const resync = useCallback(() => {
    setFollowing(true);
    chRef.current?.send({ type: "broadcast", event: "hello", payload: { userId } });
  }, [userId]);

  return {
    isMaster,
    following,
    count,
    peers,
    masterName: masterId ? masterName : null,
    claim,
    detach,
    resync,
  };
}
