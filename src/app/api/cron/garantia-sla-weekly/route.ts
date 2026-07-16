import { NextResponse } from "next/server";
import { runGarantiaWeeklyReports } from "@/lib/comercial/garantia-weekly-service";

const authorizeCron = (request: Request): boolean => {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) {
    return true;
  }
  return request.headers.get("x-cron-secret") === secret;
};

async function handle(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const force = searchParams.get("force") === "1";
  const desarrolloId = searchParams.get("desarrolloId")?.trim() || undefined;

  try {
    const result = await runGarantiaWeeklyReports({ force, desarrolloId });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en reporte semanal garantía." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
