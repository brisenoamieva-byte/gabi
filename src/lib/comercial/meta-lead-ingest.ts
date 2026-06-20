import { createCommercialLead } from "@/lib/comercial/commercial-lead-create";
import { getMetaGraphApiVersion, getMetaPageAccessToken } from "@/lib/whatsapp/config";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

type MetaLeadField = { name: string; values: string[] };

type MetaLeadPayload = {
  id?: string;
  created_time?: string;
  field_data?: MetaLeadField[];
};

const fieldValue = (fields: MetaLeadField[], names: string[]): string | null => {
  for (const name of names) {
    const match = fields.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const value = match?.values?.[0]?.trim();
    if (value) {
      return value;
    }
  }
  return null;
};

const fetchMetaLead = async (leadgenId: string): Promise<MetaLeadPayload | null> => {
  const token = getMetaPageAccessToken();
  if (!token) {
    throw new Error("META_PAGE_ACCESS_TOKEN no configurado.");
  }

  const version = getMetaGraphApiVersion();
  const url = `https://graph.facebook.com/${version}/${leadgenId}?access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  const data = (await response.json()) as MetaLeadPayload & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "No se pudo leer el lead de Meta.");
  }

  return data;
};

const findCampanaByMetaFormId = async (formId: string) => {
  const supabase = createSupabaseServiceClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("campanas")
    .select("id, desarrollo_id, nombre")
    .eq("meta_lead_form_id", formId)
    .eq("activo", true)
    .maybeSingle();

  if (error) {
    if (error.message.includes("meta_lead_form_id")) {
      return null;
    }
    throw new Error(error.message);
  }

  return data as { id: string; desarrollo_id: string; nombre: string } | null;
};

export const ingestMetaLeadgen = async (leadgenId: string, formId?: string | null) => {
  const lead = await fetchMetaLead(leadgenId);
  if (!lead?.field_data?.length) {
    return { status: "rejected" as const, message: "Lead Meta sin field_data." };
  }

  const fields = lead.field_data;
  const nombre =
    fieldValue(fields, ["full_name", "nombre", "name", "first_name"]) ?? "Nombre por registrar";
  const email = fieldValue(fields, ["email", "correo"]);
  const telefono = fieldValue(fields, ["phone_number", "telefono", "teléfono", "mobile"]);

  const resolvedFormId = formId ?? fieldValue(fields, ["form_id"]);
  const campana = resolvedFormId ? await findCampanaByMetaFormId(resolvedFormId) : null;

  if (!campana) {
    return {
      status: "rejected" as const,
      message: `Campaña no vinculada al formulario Meta ${resolvedFormId ?? "desconocido"}.`,
    };
  }

  return createCommercialLead({
    desarrolloId: campana.desarrollo_id,
    campanaId: campana.id,
    nombre,
    email,
    telefono,
    medioContacto: "Meta Lead Ads",
    medioPublicitario: campana.nombre,
    notas: `Meta leadgen_id: ${leadgenId}`,
  });
};
