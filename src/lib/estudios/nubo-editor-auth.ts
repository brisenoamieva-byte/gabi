import { isSuperAdmin } from "@/lib/admin/permissions";
import { getAdminSession } from "@/lib/admin/session";
import { isGabiOperator } from "@/lib/gabi/operator";
import { verifyOperatorAccessCode } from "@/lib/gabi/operator-access";

export type NuboEditorAuth = {
  adminProfileId: string | null;
  email: string;
};

export async function authorizeNuboEditor(request: Request): Promise<NuboEditorAuth | null> {
  const session = await getAdminSession();
  if (session && isSuperAdmin(session.profile)) {
    return {
      adminProfileId: session.profile.id,
      email: session.profile.email,
    };
  }

  const email = request.headers.get("x-gabi-operator-email")?.trim().toLowerCase() ?? "";
  const code = request.headers.get("x-gabi-operator-code")?.trim() ?? "";

  if (!email || !code || !isGabiOperator({ email }) || !verifyOperatorAccessCode(code)) {
    return null;
  }

  return {
    adminProfileId: null,
    email,
  };
}
