"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import Link from "next/link";
import { GabiLogo } from "@/components/brand/GabiLogo";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [accountEmail, setAccountEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setAccountEmail(user.email);
      }
    });
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError("No se pudo actualizar la contraseña. Vuelve a abrir el enlace del correo.");
        return;
      }

      await supabase.auth.signOut();
      const loginEmail = accountEmail || (await supabase.auth.getUser()).data.user?.email;
      const params = new URLSearchParams({ reset: "ok" });
      if (loginEmail) {
        params.set("email", loginEmail);
      }
      router.replace(`/admin/login?${params.toString()}`);
    } catch {
      setError("Error inesperado. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center gabi-surface px-5 py-10">
      <div className="w-full max-w-md rounded-[1.75rem] border border-gabi-forest/10 bg-white p-8 shadow-xl shadow-gabi-forest/5">
        <div className="mb-8 text-center">
          <GabiLogo variant="hero" className="mx-auto" />
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-gabi-sand">
            Backoffice comercial
          </p>
          <h1 className="mt-2 text-2xl font-black text-gabi-forest">Crea tu contraseña</h1>
          <p className="mt-2 text-sm text-slate-500">
            {accountEmail
              ? `Cuenta: ${accountEmail}. Elige una contraseña para entrar al panel admin.`
              : "Elige una contraseña para tu cuenta admin."}
          </p>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Nueva contraseña
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="input-cotizador"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Confirmar contraseña
            </span>
            <input
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              required
              minLength={8}
              className="input-cotizador"
            />
          </label>
          {error ? (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gabi-forest text-sm font-bold text-white disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {loading ? "Guardando..." : "Guardar contraseña"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/admin/login" className="font-semibold text-gabi-forest hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </main>
  );
}
