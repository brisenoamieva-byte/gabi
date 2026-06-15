import { Suspense } from "react";
import { OperadorLoginForm } from "./OperadorLoginForm";

export default function OperadorLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center gabi-surface text-sm text-slate-500">
          Cargando…
        </main>
      }
    >
      <OperadorLoginForm />
    </Suspense>
  );
}
