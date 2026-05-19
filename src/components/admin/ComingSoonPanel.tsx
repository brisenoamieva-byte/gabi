type ComingSoonPanelProps = {
  paso: number;
  titulo: string;
  descripcion: string;
  items: string[];
};

export function ComingSoonPanel({ paso, titulo, descripcion, items }: ComingSoonPanelProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[#201044]/8 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#C8A276]">
          Paso {paso} · En construcción
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#201044]">{titulo}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">{descripcion}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6">
        <p className="text-sm font-bold text-[#201044]">Próximamente en este módulo</p>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
