"use client";

import { FormEvent, useState } from "react";
import { LockKeyhole } from "lucide-react";
import {
  getNuboEditorOperatorCode,
  setNuboEditorOperatorCode,
} from "@/lib/estudios/nubo-editor-client";

type Props = {
  onReady: () => void;
};

export function NuboEditorCodeGate({ onReady }: Props) {
  const [code, setCode] = useState(getNuboEditorOperatorCode() ?? "");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) {
      setError("Ingresa tu código de operador.");
      return;
    }
    setNuboEditorOperatorCode(code);
    setError("");
    onReady();
  };

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gabi-forest/10 bg-white p-6 shadow-sm">
      <div className="mb-4 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-gabi-forest/8 text-gabi-forest">
          <LockKeyhole className="h-5 w-5" />
        </span>
        <h2 className="mt-3 text-lg font-black text-gabi-forest">Código de operador</h2>
        <p className="mt-2 text-sm text-slate-500">
          Para guardar cambios usa el mismo código que en <code>/operador</code>, no tu contraseña
          de admin.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="Código operador gabi"
          className="input-cotizador w-full"
          autoComplete="off"
        />
        {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="min-h-11 w-full rounded-xl bg-gabi-forest text-sm font-bold text-white"
        >
          Continuar al editor
        </button>
      </form>
    </div>
  );
}
