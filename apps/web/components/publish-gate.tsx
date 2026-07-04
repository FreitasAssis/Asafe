"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ATTRIBUTION_CHOICES,
  ATTRIBUTION_HINTS,
  ATTRIBUTION_LABELS,
  ATTRIBUTION_TO_STATUS,
  attributionWarning,
  authorizedStatus,
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  LICENSE_CHOICES,
  LICENSE_HINTS,
  LICENSE_LABELS,
  PERMISSION_CHECKBOX_LABEL,
  PERMISSION_EVIDENCE_HINT,
  suggestAttribution,
  type AttributionChoice,
  type LicenseKind,
} from "@asafe/core";
import { browserClient } from "@/lib/supabase/client";
import { classifySong, recordOwnWorkConsent, requestPublishSong } from "@/lib/songs";

/**
 * Gate de promoção de uma MÚSICA ao global: antes de propor, o dono declara a autoria
 * (define o copyright_status). Texto curto explica o "por que" — clareia, não bloqueia.
 */
export function PublishGate({
  songId,
  composer,
  onCancel,
}: {
  readonly songId: string;
  readonly composer: string | null;
  readonly onCancel: () => void;
}) {
  const router = useRouter();
  const [choice, setChoice] = useState<AttributionChoice | null>(null);
  const [busy, setBusy] = useState(false);
  // Obra própria (C4): licença escolhida + ação afirmativa (consentimento).
  const [license, setLicense] = useState<LicenseKind>(LICENSE_CHOICES[0]!);
  const [agreed, setAgreed] = useState(false);
  // Permissão por obra (C11): autorização declarada + evidência → 'permissao'.
  const [hasPermission, setHasPermission] = useState(false);
  const [evidence, setEvidence] = useState("");
  // Heurística (C6): sugere pela ficha de compositor e avisa contradições — não bloqueia.
  const suggestion = suggestAttribution(composer);
  const warning = choice ? attributionWarning(choice, composer) : null;
  const isOwn = choice === "propria";
  const isNamed = choice === "autor_nomeado";
  // Se declarou permissão, a evidência é obrigatória (senão fica 'protegida').
  const missingEvidence = isNamed && hasPermission && !evidence.trim();
  const canConfirm = Boolean(choice) && (!isOwn || agreed) && !missingEvidence && !busy;

  async function confirm() {
    if (!choice) return;
    setBusy(true);
    try {
      const sb = browserClient();
      if (isOwn) {
        // Consentimento versionado + licença — server grava now()/auth.uid().
        await recordOwnWorkConsent(sb, songId, license, CONSENT_TEXT_VERSION);
      } else if (isNamed) {
        // De outro autor: com permissão + evidência vira 'permissao'; senão 'protegida'.
        const status = authorizedStatus(hasPermission, evidence);
        await classifySong(sb, songId, status, status === "permissao" ? evidence : null);
      } else {
        await classifySong(sb, songId, ATTRIBUTION_TO_STATUS[choice]);
      }
      await requestPublishSong(sb, songId);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded border border-border p-3">
      <p className="text-sm text-muted">
        Ao sugerir, o <strong>título e as informações</strong> desta música ficam visíveis a todos —
        ajuda a comunidade a encontrar o que já existe. A <strong>cifra completa</strong> só aparece
        para os outros quando a música é <strong>livre</strong>. Por isso pedimos que complete algumas informações:
      </p>
      {suggestion && (
        <p className="mt-2 text-xs text-muted">
          Pela ficha de compositor{composer ? ` (${composer})` : ""}, o provável é{" "}
          <strong>{ATTRIBUTION_LABELS[suggestion]}</strong>.
        </p>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {ATTRIBUTION_CHOICES.map((c) => (
          <label
            key={c}
            className={`cursor-pointer rounded border p-2 ${choice === c ? "border-primary" : "border-border"}`}
          >
            <span className="flex items-center gap-2">
              <input type="radio" name="attr" checked={choice === c} onChange={() => setChoice(c)} />
              <strong className="text-sm">{ATTRIBUTION_LABELS[c]}</strong>
            </span>
            <span className="mt-1 block text-xs text-muted">{ATTRIBUTION_HINTS[c]}</span>
          </label>
        ))}
      </div>
      {isOwn && (
        <div className="mt-3 rounded border border-border p-3">
          <p className="text-sm font-semibold">Sua obra — escolha a licença:</p>
          <div className="mt-2 flex flex-col gap-2">
            {LICENSE_CHOICES.map((l) => (
              <label
                key={l}
                className={`cursor-pointer rounded border p-2 ${license === l ? "border-primary" : "border-border"}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="license"
                    checked={license === l}
                    onChange={() => setLicense(l)}
                  />
                  <strong className="text-sm">{LICENSE_LABELS[l]}</strong>
                </span>
                <span className="mt-1 block text-xs text-muted">{LICENSE_HINTS[l]}</span>
              </label>
            ))}
          </div>
          <p className="mt-3 rounded border border-border p-2 text-xs text-muted">{CONSENT_TEXT}</p>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            <span>
              Li e <strong>autorizo</strong> nos termos acima.
            </span>
          </label>
        </div>
      )}
      {isNamed && (
        <div className="mt-3 rounded border border-border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasPermission}
              onChange={(e) => setHasPermission(e.target.checked)}
            />
            <span>{PERMISSION_CHECKBOX_LABEL}</span>
          </label>
          {hasPermission && (
            <div className="mt-2">
              <input
                type="text"
                value={evidence}
                onChange={(e) => setEvidence(e.target.value)}
                placeholder="Link ou descrição da permissão"
                className="input w-full text-sm"
              />
              <p className="mt-1 text-xs text-muted">{PERMISSION_EVIDENCE_HINT}</p>
              {missingEvidence && (
                <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
                  Informe a evidência da permissão — sem ela, a música entra como protegida.
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {warning && (
        <p
          className="mt-3 rounded p-2 text-sm"
          style={{ color: "#92400e", background: "#fef3c7", border: "1px solid #fcd34d" }}
        >
          ⚠ {warning}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={!canConfirm}
          onClick={() => void confirm()}
        >
          {busy ? "Enviando…" : "Confirmar e sugerir"}
        </button>
        <button type="button" className="btn" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
