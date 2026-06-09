"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NuboPropuestaSlides } from "@/components/propuestas/NuboPropuestaSlides";
import { PropuestaSharePanel } from "@/components/propuestas/PropuestaSharePanel";
import { useGabiOperator } from "@/components/gabi/useGabiOperator";
import { getPropuestaBySlug } from "@/lib/propuestas/registry";
import { requireOperatorMessage } from "@/lib/gabi/operator";
import { OPERATOR_LOGIN_PATH } from "@/lib/gabi/operator";
import Link from "next/link";

export default function PropuestaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { ready, isOperator, user } = useGabiOperator();
  const [authReady, setAuthReady] = useState(false);

  const propuesta = getPropuestaBySlug(slug);

  useEffect(() => {
    if (!localStorage.getItem("gabi_user")) {
      router.replace(OPERATOR_LOGIN_PATH);
      return;
    }
    setAuthReady(true);
  }, [router]);

  if (!authReady || !ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#EEEBE4]">
        <p className="text-sm text-neutral-600">Cargando propuesta…</p>
      </main>
    );
  }

  if (!isOperator) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-slate-600">{requireOperatorMessage()}</p>
        <Link href="/dashboard" className="text-sm font-semibold underline">
          Volver
        </Link>
      </main>
    );
  }

  if (!propuesta) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-slate-600">Propuesta no encontrada.</p>
        <Link href="/propuestas" className="text-sm font-semibold underline">
          Ver todas
        </Link>
      </main>
    );
  }

  return (
    <>
      <PropuestaSharePanel
        slug={slug}
        operatorEmail={user?.email}
        titulo={`${propuesta.meta.titulo} · ${propuesta.meta.ubicacion}`}
      />
      <NuboPropuestaSlides data={propuesta} />
    </>
  );
}
