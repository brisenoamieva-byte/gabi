import {
  perfilCalificacionLeadColor,
  perfilCalificacionLeadDescription,
  type PerfilCalificacionLead,
} from "@/lib/comercial/perfilamiento-post-visita";

type PerfilCalificacionLeadBadgeProps = {
  calificacion: PerfilCalificacionLead;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
};

const sizeClass: Record<NonNullable<PerfilCalificacionLeadBadgeProps["size"]>, string> = {
  sm: "h-6 min-w-[1.5rem] px-1.5 text-[10px]",
  md: "h-7 min-w-[1.75rem] px-2 text-xs",
  lg: "h-9 min-w-[2.25rem] px-2.5 text-sm",
};

export function PerfilCalificacionLeadBadge({
  calificacion,
  size = "md",
  showTooltip = true,
}: PerfilCalificacionLeadBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold tabular-nums ${sizeClass[size]} ${perfilCalificacionLeadColor[calificacion]}`}
      title={showTooltip ? perfilCalificacionLeadDescription[calificacion] : undefined}
      aria-label={`Calificación ${calificacion}`}
    >
      {calificacion}
    </span>
  );
}
