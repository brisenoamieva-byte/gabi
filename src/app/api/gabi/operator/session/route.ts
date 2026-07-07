import { NextResponse } from "next/server";
import { buildOperatorSession } from "@/lib/gabi/operator-access";
import { getMasterSessionEmail } from "@/lib/gabi/master-session";
import { isGabiOperator } from "@/lib/gabi/operator";

export async function GET() {
  const email = await getMasterSessionEmail();
  if (!email || !isGabiOperator({ email })) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return NextResponse.json({ asesor: buildOperatorSession(email) });
}
