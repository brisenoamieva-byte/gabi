"use client";

import Image from "next/image";
import { getDesarrolloIniciales, getDesarrolloLogoUrl } from "@/lib/corredor/desarrollo-logos";
import type { CorredorDesarrollo } from "@/lib/corredor/types";

type CorredorMapLogoPinProps = {
  desarrollo: CorredorDesarrollo;
  left: number;
  top: number;
  active: boolean;
  aproximada: boolean;
  onSelect: () => void;
};

export function CorredorMapLogoPin({
  desarrollo,
  left,
  top,
  active,
  aproximada,
  onSelect,
}: CorredorMapLogoPinProps) {
  const logoUrl = getDesarrolloLogoUrl(desarrollo);
  const iniciales = getDesarrolloIniciales(desarrollo.nombre);

  return (
    <button
      type="button"
      title={`${desarrollo.nombre} · ${desarrollo.kmLabel}`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 transition hover:scale-105 ${
        active ? "z-20 scale-110" : ""
      }`}
      style={{ left: `${left}%`, top: `${top}%` }}
    >
      {logoUrl ? (
        <span
          className={`flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 bg-white shadow-md sm:h-11 sm:w-11 ${
            active
              ? "border-[#201044] ring-2 ring-[#6cc24a]/60"
              : aproximada
                ? "border-slate-300 opacity-90"
                : "border-white"
          }`}
        >
          <Image
            src={logoUrl}
            alt=""
            width={44}
            height={44}
            className="h-full w-full object-contain p-0.5"
            unoptimized
          />
        </span>
      ) : (
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-black text-white shadow-md sm:h-11 sm:w-11 ${
            active
              ? "border-[#201044] bg-[#6cc24a]"
              : aproximada
                ? "border-white bg-slate-400"
                : "border-white bg-[#201044]"
          }`}
        >
          {iniciales}
        </span>
      )}
    </button>
  );
}
