import type { DocumentoTipo } from "@/lib/admin/types";
import {
  desarrollos,
  getClusterById,
  getDisponibilidadPlanoByCluster,
  getPrototipoById,
} from "@/lib/data";
import {
  cacheDocumentBlob,
  readCachedDocument,
  triggerBlobDownload,
} from "@/lib/offline/documents-cache";

export class DocumentNotAvailableError extends Error {
  constructor(label: string) {
    super(`${label} no está disponible. Solicítalo al administrador del desarrollo.`);
    this.name = "DocumentNotAvailableError";
  }
}

const downloadStaticFile = async (
  url: string,
  filename: string,
  cacheParams?: {
    desarrolloId: string;
    tipo: DocumentoTipo;
    clusterId?: string;
    prototipoId?: string;
    etapa?: string;
  },
) => {
  if (cacheParams) {
    const cached = await readCachedDocument(cacheParams);
    if (cached) {
      triggerBlobDownload(cached.blob, cached.filename);
      return;
    }
  }

  const response = await fetch(url);
  if (!response.ok) {
    if (cacheParams) {
      const cached = await readCachedDocument(cacheParams);
      if (cached) {
        triggerBlobDownload(cached.blob, cached.filename);
        return;
      }
    }
    throw new Error("No se encontró el archivo PDF.");
  }

  const blob = await response.blob();
  if (cacheParams) {
    await cacheDocumentBlob(cacheParams, blob, filename);
  }
  triggerBlobDownload(blob, filename);
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

  const cacheParams = { desarrolloId, tipo: "brochure_desarrollo" as const };
  const cached = await readCachedDocument(cacheParams);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    tipo: "brochure_desarrollo",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename, {
      desarrolloId,
      tipo: "brochure_desarrollo",
    });
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

export const downloadTarjetasProceso = async (desarrolloId: string) => {
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!desarrollo) {
    throw new Error("Desarrollo no encontrado.");
  }

  if (desarrollo.tarjetasProcesoPdf) {
    await downloadStaticFile(
      desarrollo.tarjetasProcesoPdf,
      `${slugify(desarrollo.nombre)}-tarjetas-proceso.pdf`,
    );
    return;
  }

  throw new DocumentNotAvailableError("Tarjetas de proceso");
};

export const downloadClusterBrochure = async (clusterId: string, desarrolloId: string) => {
  const cluster = getClusterById(clusterId);
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!cluster || !desarrollo) {
    throw new Error("Cluster o desarrollo no encontrado.");
  }

  const cacheParams = {
    desarrolloId,
    tipo: "brochure_cluster" as const,
    clusterId,
  };
  const cached = await readCachedDocument(cacheParams);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId,
    tipo: "brochure_cluster",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename, {
      desarrolloId,
      tipo: "brochure_cluster",
      clusterId,
    });
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

  const cacheParams = {
    desarrolloId,
    tipo: "disponibilidad" as const,
    clusterId,
    etapa,
  };
  const cached = await readCachedDocument(cacheParams);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const plano = getDisponibilidadPlanoByCluster(clusterId);

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId,
    etapa,
    tipo: "disponibilidad",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename, {
      desarrolloId,
      tipo: "disponibilidad",
      clusterId,
      etapa,
    });
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

export const downloadMasterPlan = async (desarrolloId: string) => {
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);
  if (!desarrollo) {
    throw new Error("Desarrollo no encontrado.");
  }

  const cacheParams = { desarrolloId, tipo: "master_plan" as const };
  const cached = await readCachedDocument(cacheParams);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    tipo: "master_plan",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename, {
      desarrolloId,
      tipo: "master_plan",
    });
    return;
  }

  if (desarrollo.masterPlanImage?.toLowerCase().endsWith(".pdf")) {
    await downloadStaticFile(
      desarrollo.masterPlanImage,
      `${slugify(desarrollo.nombre)}-master-plan.pdf`,
    );
    return;
  }

  throw new DocumentNotAvailableError("Master plan");
};

export const downloadFichaTecnica = async (prototipoId: string, desarrolloId: string) => {
  const prototipo = getPrototipoById(prototipoId);
  const cluster = prototipo ? getClusterById(prototipo.clusterId) : undefined;
  const desarrollo = desarrollos.find((item) => item.id === desarrolloId);

  if (!prototipo || !cluster || !desarrollo) {
    throw new Error("Producto no encontrado.");
  }

  const cacheParams = {
    desarrolloId,
    tipo: "ficha_tecnica" as const,
    clusterId: cluster.id,
    prototipoId,
  };
  const cached = await readCachedDocument(cacheParams);
  if (cached) {
    triggerBlobDownload(cached.blob, cached.filename);
    return;
  }

  const oficial = await fetchDocumentoOficial({
    desarrolloId,
    clusterId: cluster.id,
    prototipoId,
    tipo: "ficha_tecnica",
  });
  if (oficial) {
    await downloadStaticFile(oficial.url, oficial.filename, {
      desarrolloId,
      tipo: "ficha_tecnica",
      clusterId: cluster.id,
      prototipoId,
    });
    return;
  }

  throw new DocumentNotAvailableError("Ficha técnica");
};
