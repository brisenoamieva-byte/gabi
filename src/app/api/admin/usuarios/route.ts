import { NextResponse } from "next/server";
import { isSuperAdmin } from "@/lib/admin/permissions";
import {
  createAdminUser,
  listAdminUsers,
  type AdminUserInput,
} from "@/lib/admin/usuarios-service";
import { getAdminSession } from "@/lib/admin/session";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const usuarios = await listAdminUsers();
    return NextResponse.json({ usuarios });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al listar" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!isSuperAdmin(session.profile)) {
    return NextResponse.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    const body = (await request.json()) as AdminUserInput;

    if (!body.nombre?.trim() || !body.email?.trim() || !body.rol) {
      return NextResponse.json(
        { error: "Completa nombre, email y rol." },
        { status: 400 },
      );
    }

    const result = await createAdminUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al crear" },
      { status: 500 },
    );
  }
}
