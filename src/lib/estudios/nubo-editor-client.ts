import { readStoredAsesorSession } from "@/lib/asesores/session-client";

const CODE_KEY = "gabi_nubo_editor_code";

export function getNuboEditorOperatorCode(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CODE_KEY);
}

export function setNuboEditorOperatorCode(code: string): void {
  sessionStorage.setItem(CODE_KEY, code.trim());
}

export function clearNuboEditorOperatorCode(): void {
  sessionStorage.removeItem(CODE_KEY);
}

export function nuboEditorFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const asesor = readStoredAsesorSession();
  const code = getNuboEditorOperatorCode();
  const headers = new Headers(init.headers);

  if (asesor?.email) {
    headers.set("x-gabi-operator-email", asesor.email);
  }
  if (code) {
    headers.set("x-gabi-operator-code", code);
  }

  return fetch(input, { ...init, headers });
}
