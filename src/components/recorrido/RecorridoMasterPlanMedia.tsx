type RecorridoMasterPlanMediaProps = {
  imageSrc?: string | null;
  pdfUrl?: string | null;
  pdfNombre?: string | null;
  titulo: string;
};

export function RecorridoMasterPlanMedia({
  imageSrc,
  pdfUrl,
  pdfNombre,
  titulo,
}: RecorridoMasterPlanMediaProps) {
  if (imageSrc) {
    return (
      <div className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={`Master plan · ${titulo}`}
          className="h-auto w-full object-contain"
        />
      </div>
    );
  }

  if (!pdfUrl) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-[#201044]/10 bg-white shadow-inner">
        <iframe
          src={`${pdfUrl}#view=FitH`}
          title={pdfNombre ?? `Master plan · ${titulo}`}
          className="h-[min(70vh,520px)] w-full bg-white"
        />
      </div>
      <a
        href={pdfUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#201044]/15 bg-white px-4 text-xs font-bold text-[#201044] hover:bg-slate-50"
      >
        Abrir master plan en nueva pestaña
      </a>
    </div>
  );
}
