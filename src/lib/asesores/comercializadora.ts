import { desarrollos } from "@/lib/data";

export const getComercializadorForDesarrollo = (desarrolloId: string) =>
  desarrollos.find((item) => item.id === desarrolloId)?.comercializador ?? null;

export const getDesarrolloIdsForComercializador = (comercializador: string) =>
  desarrollos.filter((item) => item.comercializador === comercializador).map((item) => item.id);

export const resolveComercializadorFromDesarrollos = (desarrollosIds: string[]) => {
  for (const desarrolloId of desarrollosIds) {
    const comercializador = getComercializadorForDesarrollo(desarrolloId);
    if (comercializador) {
      return comercializador;
    }
  }
  return null;
};
