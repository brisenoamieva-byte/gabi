import { Suspense } from "react";
import { AdminLoginForm } from "./AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center gabi-surface px-5 py-10">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-[1.75rem] border border-[#13315C]/10 bg-white p-8 text-center text-sm text-slate-500 shadow-xl">
            Cargando...
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </main>
  );
}
