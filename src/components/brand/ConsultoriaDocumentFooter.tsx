import { DmbDocumentFooter } from "@/components/dmb/DmbDocumentFooter";
import {
  CONSULTORIA_MARCA_CONTACT,
  type ConsultoriaMarcaPresentacion,
} from "@/lib/brand/consultoria-marca";

type Props = {
  marca: ConsultoriaMarcaPresentacion;
  className?: string;
  elaboradoPor?: string;
  fecha?: string;
  extra?: string;
};

export function ConsultoriaDocumentFooter({ marca, className = "", elaboradoPor, fecha, extra }: Props) {
  if (marca === "dmb") {
    return (
      <DmbDocumentFooter
        className={className}
        elaboradoPor={elaboradoPor}
        fecha={fecha}
        extra={extra}
      />
    );
  }

  const contact = CONSULTORIA_MARCA_CONTACT.bbr;

  return (
    <footer
      className={`border-t border-neutral-300/90 pt-4 text-[11px] leading-relaxed text-neutral-500 ${className}`.trim()}
    >
      <p>
        Documento confidencial · <strong className="text-[#201044]">BBR Habitarea</strong> ·{" "}
        {contact.web} · {contact.email}
      </p>
      {extra ? <p className="mt-1">{extra}</p> : null}
      {elaboradoPor || fecha ? (
        <p className="mt-1">
          {elaboradoPor ? elaboradoPor : null}
          {elaboradoPor && fecha ? " · " : null}
          {fecha ? fecha : null}
        </p>
      ) : null}
    </footer>
  );
}
