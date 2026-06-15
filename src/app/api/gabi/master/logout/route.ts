import { NextResponse } from "next/server";
import { GABI_MASTER_COOKIE } from "@/lib/gabi/master-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GABI_MASTER_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
