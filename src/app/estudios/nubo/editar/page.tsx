import { redirect } from "next/navigation";
import { DMB_ADMIN } from "@/lib/dmb/admin-routes";

/** Editor canónico del estudio NUBO — redirige al panel admin DMB. */
export default function EstudioNuboEditarRedirectPage() {
  redirect(DMB_ADMIN.estudiosNubo);
}
