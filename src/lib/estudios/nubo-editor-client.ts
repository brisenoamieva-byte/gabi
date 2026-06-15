/** Fetch autenticado para el editor NUBO (usa cookie de sesión maestra o Supabase admin). */
export function nuboEditorFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  return fetch(input, { ...init, credentials: "same-origin" });
}
