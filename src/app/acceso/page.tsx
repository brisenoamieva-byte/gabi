"use client";

import { Suspense } from "react";
import { AdminLoginForm } from "@/app/admin/login/AdminLoginForm";

export default function AccesoPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center gabi-surface px-5 py-10">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-[1.75rem] border border-gabi-forest/10 bg-white p-8 text-center text-sm text-slate-500">
            Cargando…
          </div>
        }
      >
        <AdminLoginForm variant="unified" />
      </Suspense>
    </main>
  );
}
