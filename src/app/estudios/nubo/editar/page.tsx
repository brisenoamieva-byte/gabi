import { redirect } from "next/navigation";

/** Editor canónico del estudio NUBO — redirige al panel admin. */
export default function EstudioNuboEditarRedirectPage() {
  redirect("/admin/estudios-nubo");
}
