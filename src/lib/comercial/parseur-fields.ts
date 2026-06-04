/** Normaliza claves de payload Parseur (esquema variable por mailbox). */

const normalizeKey = (key: string) =>
  key
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const ALIASES: Record<string, string[]> = {
  nombre: [
    "nombre",
    "name",
    "lead_name",
    "leadname",
    "cliente",
    "client_name",
    "full_name",
    "fullname",
    "contact_name",
    "contacto",
  ],
  email: ["email", "correo", "e_mail", "mail", "email_address"],
  telefono: [
    "telefono",
    "teléfono",
    "phone",
    "mobile",
    "celular",
    "whatsapp",
    "telefono_movil",
    "phone_number",
  ],
  ciudad: ["ciudad", "city", "origen", "region", "ubicacion", "location", "estado"],
  vendedor: ["vendedor", "asesor", "seller", "agent", "agente", "comercial"],
  interes: ["interes", "nivel_interes", "interest", "nivel_de_interes"],
  notas: ["notas", "notes", "comentarios", "comments", "mensaje", "message"],
  producto: ["producto", "product", "desarrollo", "proyecto", "development"],
  medio: ["medio", "canal", "channel", "medio_publicitario", "fuente", "source"],
  parseurEmail: [
    "parseur_email",
    "mailbox",
    "inbox",
    "recipient",
    "to",
    "to_email",
    "mailbox_email",
  ],
  documentId: ["documentid", "document_id", "parseur_document_id"],
};

const aliasToField = new Map<string, string>();
for (const [field, keys] of Object.entries(ALIASES)) {
  for (const key of keys) {
    aliasToField.set(normalizeKey(key), field);
  }
}

const flattenPayload = (value: unknown, prefix = ""): Record<string, string> => {
  const out: Record<string, string> = {};

  if (value === null || value === undefined) {
    return out;
  }

  if (Array.isArray(value)) {
    if (value.length && typeof value[0] === "object" && value[0] !== null) {
      Object.assign(out, flattenPayload(value[0], prefix));
    }
    return out;
  }

  if (typeof value !== "object") {
    if (prefix) {
      out[prefix] = String(value).trim();
    }
    return out;
  }

  for (const [rawKey, rawValue] of Object.entries(value as Record<string, unknown>)) {
    const key = normalizeKey(rawKey);
    const nextPrefix = prefix ? `${prefix}_${key}` : key;

    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    if (typeof rawValue === "object") {
      Object.assign(out, flattenPayload(rawValue, nextPrefix));
      continue;
    }

    out[nextPrefix] = String(rawValue).trim();
    if (!prefix) {
      out[key] = String(rawValue).trim();
    }
  }

  return out;
};

export type ParseurLeadFields = {
  nombre: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  vendedor: string | null;
  interes: string | null;
  notas: string | null;
  producto: string | null;
  medio: string | null;
  parseurEmail: string | null;
  documentId: string | null;
};

export const extractParseurFields = (payload: unknown): ParseurLeadFields => {
  const flat = flattenPayload(payload);
  const resolved: Partial<ParseurLeadFields> = {};

  for (const [key, value] of Object.entries(flat)) {
    if (!value) {
      continue;
    }

    const field = aliasToField.get(key) ?? aliasToField.get(normalizeKey(key.split("_").pop() ?? key));
    if (!field || field in resolved) {
      continue;
    }

    resolved[field as keyof ParseurLeadFields] = value;
  }

  const nombre =
    resolved.nombre?.trim() ||
    (resolved.email ? resolved.email.split("@")[0] : null) ||
    (resolved.telefono ? `Lead ${resolved.telefono}` : null);

  return {
    nombre: nombre || null,
    email: resolved.email?.trim().toLowerCase() || null,
    telefono: resolved.telefono?.trim() || null,
    ciudad: resolved.ciudad?.trim() || null,
    vendedor: resolved.vendedor?.trim() || null,
    interes: resolved.interes?.trim() || null,
    notas: resolved.notas?.trim() || null,
    producto: resolved.producto?.trim() || null,
    medio: resolved.medio?.trim() || null,
    parseurEmail: resolved.parseurEmail?.trim().toLowerCase() || null,
    documentId: resolved.documentId?.trim() || null,
  };
};

export const isParseurFailureEvent = (payload: unknown): boolean => {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  const event = String(record.event ?? record.Event ?? "").toLowerCase();
  if (event.includes("template_needed") || event.includes("export_failed")) {
    return true;
  }

  if (typeof record.text === "string" && record.text.toLowerCase().includes("failed")) {
    return true;
  }

  return false;
};
