import { NextResponse } from "next/server";
import {
  ASESOR_SESSION_COOKIE,
  asesorSessionCookieOptions,
} from "@/lib/asesores/session-cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ASESOR_SESSION_COOKIE, "", {
    ...asesorSessionCookieOptions(),
    maxAge: 0,
  });
  return response;
}
