import {
  getDesarrolladorIniciales,
  getDesarrolladorLogoUrl,
} from "@/lib/corredor/desarrollador-logos";
import {
  getDesarrolloIniciales,
  getDesarrolloLogoUrl,
} from "@/lib/corredor/desarrollo-logos";

type CorredorEntityLogoProps = {
  tipo: "desarrollo" | "desarrollador";
  id: string;
  nombre: string;
  logoUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-12 w-12 text-xs",
  lg: "h-16 w-16 text-sm",
};

export function CorredorEntityLogo({
  tipo,
  id,
  nombre,
  logoUrl,
  size = "md",
  className = "",
}: CorredorEntityLogoProps) {
  const src =
    logoUrl ??
    (tipo === "desarrollo"
      ? getDesarrolloLogoUrl({ id, logoUrl })
      : getDesarrolladorLogoUrl(id));
  const iniciales =
    tipo === "desarrollo" ? getDesarrolloIniciales(nombre) : getDesarrolladorIniciales(nombre);
  const box = sizeClasses[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={nombre}
        className={`${box} shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1 ${className}`}
      />
    );
  }

  return (
    <span
      className={`${box} grid shrink-0 place-items-center rounded-xl border-2 border-white bg-[#201044] font-bold text-white shadow-sm ${className}`}
      title={nombre}
    >
      {iniciales}
    </span>
  );
}
