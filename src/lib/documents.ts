import type { DocumentoTipo } from "@/lib/admin/types";
import {
  desarrollos,
  getClusterById,
  getDisponibilidadPlanoByCluster,
  getPrototipoById,
} from "@/lib/data";

export class DocumentNotAvailableError extends Error {
  constructor(label: string) {
    super(`${label} no está disponible. Solicítalo al administrador del desarrollo.`);
    this.name = "DocumentNotAvailableError";
  }
}

const downloadStaticFile = async (url: string, filename: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("No se encontró el archivo PDF.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(objectUrl);
};

const fetchDocumentoOficial = async (params: {
  desarrolloId: string;
  clusterId?: string;
  etapa?: string;
  prototipoId?: string;
  tipo: DocumentoTipo;
}) => {
  const search = new URLSearchParams({
    desarrolloId: params.desarrolloId,
    tipo: params.tipo,
  });
  if (params.clusterId) {
    search.set("clusterId", params.clusterId);
  }
  if (params.etapa) {
    search.set("etapa", params.etapa);
  }
  if (params.prototipoId) {
    search.set("prototipoId", params.prototipoId);
  }

  try {
    const response = await fetch(`/api/documentos/resolve?${search.toString()}`);
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as {
      url?: string | null;
      filename?: string;
    };
    return data.url ? { url: data.url, filename: data.filename ?? "documento.pdf" } : null;
  } catch {
    return null;
  }
};

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const downloadDesarrolloBrochure = async (desarrolloId: string) => {
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!desarrollo) {
    throw new Error("Desarrollo no encontrado.");
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    tipo: "brochure_desarrollo",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename);
    return;
  }

  if (desarrollo.brochurePdf) {
    await downloadStaticFile(
      desarrollo.brochurePdf,
      `${slugify(desarrollo.nombre)}-brochure.pdf`,
    );
    return;
  }

  throw new DocumentNotAvailableError("Brochure del desarrollo");
};

export const downloadClusterBrochure = async (clusterId: string, desarrolloId: string) => {
  const cluster = getClusterById(clusterId);
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!cluster || !desarrollo) {
    throw new Error("Cluster o desarrollo no encontrado.");
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId,
    tipo: "brochure_cluster",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename);
    return;
  }

  if (cluster.brochurePdf) {
    await downloadStaticFile(
      cluster.brochurePdf,
      `${slugify(cluster.nombre)}-brochure.pdf`,
    );
    return;
  }

  throw new DocumentNotAvailableError("Brochure del cluster");
};

export const downloadDisponibilidadReport = async (
  clusterId: string,
  desarrolloId: string,
  etapa?: string,
) => {
  const cluster = getClusterById(clusterId);
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!cluster || !desarrollo) {
    throw new Error("Cluster o desarrollo no encontrado.");
  }

  const plano = getDisponibilidadPlanoByCluster(clusterId);

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId,
    etapa,
    tipo: "disponibilidad",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename);
    return;
  }

  if (plano?.documentoPdf) {
    await downloadStaticFile(
      plano.documentoPdf,
      `${slugify(cluster.nombre)}-disponibilidad.pdf`,
    );
    return;
  }

  throw new DocumentNotAvailableError(
    etapa ? `Disponibilidad · Etapa ${etapa}` : "Documento de disponibilidad",
  );
};

export const downloadFichaTecnica = async (prototipoId: string, desarrolloId: string) => {
  const prototipo = getPrototipoById(prototipoId);
  const cluster = prototipo ? getClusterById(prototipo.clusterId) : undefined;
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);

  if (!prototipo || !cluster || !desarrollo) {
    throw new Error("Producto no encontrado.");
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId: cluster.id,
    prototipoId,
    tipo: "ficha_tecnica",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename);
    return;
  }

  throw new DocumentNotAvailableError("Ficha técnica");
};
