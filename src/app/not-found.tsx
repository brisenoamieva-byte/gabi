import Link from "next/link";
import { GabiLogo } from "@/components/brand/GabiLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <GabiLogo variant="header" href="/" />
      <h1 className="mt-4 text-2xl font-bold text-gabi-navy">Página no encontrada</h1>
      <p className="mt-2 max-w-md text-sm text-gabi-muted">
        El enlace no existe o ya no está disponible.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-xl bg-gabi-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-gabi-navy-light"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
