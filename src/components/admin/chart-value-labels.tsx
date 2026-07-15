"use client";

/**
 * Etiqueta numérica visible en barras Recharts (sin depender del hover).
 * Usa `placement` (no `position`): LabelList de Recharts sobrescribe `position` al clonar el elemento.
 */
export function BarValueLabel(props: {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string;
  placement?: "top" | "right" | "center" | "bottom";
  formatter?: (value: number) => string;
}) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    value,
    placement = "top",
    formatter = (n) => String(n),
  } = props;
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return null;

  const px = Number(x);
  const py = Number(y);
  const pw = Number(width);
  const ph = Number(height);
  const text = formatter(n);

  // Puntos de línea (sin ancho de barra)
  if (!pw || Number.isNaN(pw)) {
    return (
      <text
        x={px}
        y={placement === "bottom" ? py + 12 : py - 6}
        fill="#64748b"
        fontSize={9}
        fontWeight={600}
        textAnchor="middle"
      >
        {text}
      </text>
    );
  }

  if (placement === "right") {
    return (
      <text
        x={px + pw + 4}
        y={py + ph / 2}
        fill="#334155"
        fontSize={10}
        fontWeight={600}
        dominantBaseline="middle"
      >
        {text}
      </text>
    );
  }

  if (placement === "center") {
    if (ph < 12 || pw < 10) return null;
    return (
      <text
        x={px + pw / 2}
        y={py + ph / 2}
        fill="#ffffff"
        fontSize={9}
        fontWeight={700}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {text}
      </text>
    );
  }

  if (placement === "bottom") {
    return (
      <text
        x={px + pw / 2}
        y={py + ph + 12}
        fill="#334155"
        fontSize={10}
        fontWeight={600}
        textAnchor="middle"
      >
        {text}
      </text>
    );
  }

  return (
    <text
      x={px + pw / 2}
      y={py - 4}
      fill="#334155"
      fontSize={10}
      fontWeight={600}
      textAnchor="middle"
    >
      {text}
    </text>
  );
}

export function PieValueLabel(props: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
}) {
  const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, value = 0 } =
    props;
  if (!value || percent < 0.04) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={10}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value}
    </text>
  );
}
