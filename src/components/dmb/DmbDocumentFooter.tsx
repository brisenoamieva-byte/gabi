import { DMB_CONTACT } from "@/lib/dmb/ecosystem";

type DmbDocumentFooterProps = {
  className?: string;
  elaboradoPor?: string;
  fecha?: string;
  extra?: string;
};

/** Pie de página para propuestas, estudios y PDFs — marca DMB. */
export function DmbDocumentFooter({
  className = "",
  elaboradoPor,
  fecha,
  extra,
}: DmbDocumentFooterProps) {
  return (
    <footer
      className={`border-t border-dmb-line pt-4 text-[11px] leading-relaxed text-dmb-muted ${className}`.trim()}
    >
      <p>
        Documento confidencial · <strong className="text-dmb-ink">DMB</strong> Consultoría
        Comercial Inmobiliaria · {DMB_CONTACT.web} · {DMB_CONTACT.email}
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
