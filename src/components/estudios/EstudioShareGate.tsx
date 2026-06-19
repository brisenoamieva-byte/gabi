"use client";

import { PropuestaShareGate, type ShareGateAuthResult } from "@/components/propuestas/PropuestaShareGate";

type EstudioShareGateProps = {
  token: string;
  tituloCliente?: string | null;
  onAuthenticated: (result: ShareGateAuthResult) => void;
  headline?: string;
};

export function EstudioShareGate({
  token,
  tituloCliente,
  onAuthenticated,
  headline = "Estudio de mercado · Acceso privado",
}: EstudioShareGateProps) {
  return (
    <PropuestaShareGate
      token={token}
      tituloCliente={tituloCliente}
      onAuthenticated={onAuthenticated}
      authPath="/api/estudios/share/auth"
      subjectLabel="Estudio de mercado · Confidencial"
      headline={headline}
    />
  );
}
