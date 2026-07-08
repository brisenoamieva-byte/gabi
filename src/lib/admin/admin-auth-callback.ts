/** Query en redirectTo de Supabase para abrir pantalla de contraseña tras validar el enlace. */
export const ADMIN_PASSWORD_SETUP_FLOW = "setup-password";

export const adminAuthCallbackUrl = (siteUrl: string): string =>
  `${siteUrl.replace(/\/$/, "")}/auth/callback?flow=${ADMIN_PASSWORD_SETUP_FLOW}`;

export const isAdminPasswordSetupFlow = (params: {
  flow?: string | null;
  type?: string | null;
}): boolean =>
  params.flow === ADMIN_PASSWORD_SETUP_FLOW ||
  params.type === "recovery" ||
  params.type === "invite" ||
  params.type === "signup";
