import { NextResponse } from "next/server";
import { authorizeNuboEditor } from "@/lib/estudios/nubo-editor-auth";
import { uploadNuboEstudioImagen } from "@/lib/estudios/nubo-publicidad-store";

const ALLOWED_SLOTS = new Set([
  "ubicacion-sitio",
  "hotel-taboada",
  "acceso-ref-0",
  "acceso-ref-1",
  "restaurante-ref-0",
  "restaurante-ref-1",
]);

export async function POST(request: Request) {
  const editor = await authorizeNuboEditor(request);
  if (!editor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const slot = String(form.get("slot") ?? "").trim();

    if (!(file instanceof File) || !file.size) {
      return NextResponse.json({ error: "Archivo requerido." }, { status: 400 });
    }

    if (!ALLOWED_SLOTS.has(slot)) {
      return NextResponse.json({ error: "Slot de imagen inválido." }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo imágenes (JPG, PNG, WebP)." }, { status: 400 });
    }

    const publicUrl = await uploadNuboEstudioImagen({
      file,
      slot,
      adminProfileId: editor.adminProfileId,
    });

    return NextResponse.json({ publicUrl, slot });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al subir imagen" },
      { status: 400 },
    );
  }
}
