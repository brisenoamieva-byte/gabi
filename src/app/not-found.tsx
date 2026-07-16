import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">gabi</p>
      <h1 className="mt-2 text-2xl font-bold text-[#13315C]">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        El enlace no existe o ya no está disponible.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-[#13315C] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a4278]"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
