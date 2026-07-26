"use client";

import { useState } from "react";

/**
 * Campo de senha com botão "mostrar/ocultar" (👁). Alterna o `type` entre `password`
 * e `text`. Reutilizado no login e na redefinição de senha.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = "senha",
  autoComplete = "current-password",
  required,
}: {
  readonly value: string;
  readonly onChange: (v: string) => void;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw-field">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        className="input pw-input"
      />
      <button
        type="button"
        className="pw-toggle"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={show}
        tabIndex={-1}
      >
        {show ? "🙈" : "👁️"}
      </button>
    </div>
  );
}
