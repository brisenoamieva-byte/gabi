"use client";

import { PropuestaShareGate, type ShareGateAuthResult } from "@/components/propuestas/PropuestaShareGate";
import type { ConsultoriaMarcaPresentacion } from "@/lib/brand/consultoria-marca";
import { DEFAULT_CONSULTORIA_MARCA } from "@/lib/brand/consultoria-marca";

type EstudioShareGateProps = {
  token: string;
  tituloCliente?: string | null;
  onAuthenticated: (result: ShareGateAuthResult) => void;
  headline?: string;
  presentacionMarca?: ConsultoriaMarcaPresentacion;
};

export function EstudioShareGate({
  token,
  tituloCliente,
  onAuthenticated,
  headline = "Estudio de mercado · Acceso privado",
  presentacionMarca = DEFAULT_CONSULTORIA_MARCA,
}: EstudioShareGateProps) {
  return (
    <PropuestaShareGate
      token={token}
      tituloCliente={tituloCliente}
      onAuthenticated={onAuthenticated}
      authPath="/api/estudios/share/auth"
      subjectLabel="Estudio de mercado · Confidencial"
      headline={headline}
      presentacionMarca={presentacionMarca}
    />
  );
}
