import type { Metadata } from "next";
import Link from "next/link";
import { GabiLogo } from "@/components/brand/GabiLogo";

export const metadata: Metadata = {
  title: "Aviso de privacidad — gabi",
  description:
    "Aviso de privacidad integral de gabi (gabi.mx) conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
  robots: { index: true, follow: true },
};

const LAST_UPDATE = "20 de julio de 2026";

export default function AvisoDePrivacidadPage() {
  return (
    <main className="min-h-dvh bg-[#F4F6F8] text-gabi-ink">
      <header className="border-b border-gabi-line bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5 md:px-8">
          <GabiLogo variant="header" href="/" />
          <Link
            href="/"
            className="text-[13px] font-medium text-gabi-navy/55 transition hover:text-gabi-navy"
          >
            Inicio
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-16">
        <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-gabi-navy/40">
          gabi.mx
        </p>
        <h1 className="mt-3 font-gabi-display text-[clamp(1.75rem,4vw,2.35rem)] font-bold tracking-tight text-gabi-navy">
          Aviso de privacidad
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-gabi-navy/55">
          Última actualización: {LAST_UPDATE}. Documento integral conforme a la Ley Federal de
          Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su
          normativa aplicable en México.
        </p>

        <div className="prose-gabi mt-10 space-y-10 text-[15px] leading-relaxed text-gabi-navy/80">
          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              1. Identidad y domicilio del responsable
            </h2>
            <p>
              El responsable del tratamiento de los datos personales es{" "}
              <strong className="font-semibold text-gabi-navy">
                José Ricardo Briseño Amieva
              </strong>
              , persona física, quien opera la plataforma{" "}
              <strong className="font-semibold text-gabi-navy">gabi</strong> (gabi.mx) como
              responsable propio del tratamiento.
            </p>
            <p>
              <strong className="font-semibold text-gabi-navy">Domicilio:</strong> Enredadera 53,
              Álamos 3.ª sección, Querétaro, Querétaro, México, C.P. 76160.
            </p>
            <p>
              <strong className="font-semibold text-gabi-navy">Correo de contacto / privacidad:</strong>{" "}
              <a
                href="mailto:contacto@gabi.mx"
                className="font-medium text-gabi-navy underline decoration-gabi-teal/50 underline-offset-2 hover:decoration-gabi-teal"
              >
                contacto@gabi.mx
              </a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">2. Alcance</h2>
            <p>Este aviso aplica al tratamiento de datos personales realizado a través de:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>El sitio web y la aplicación web de gabi (incluyendo PWA).</li>
              <li>
                Canales de captación conectados a gabi (por ejemplo, Meta Lead Ads, formularios
                web, correo procesado vía integraciones, WhatsApp Cloud API).
              </li>
              <li>
                El uso de la plataforma por asesores, operadores y personal autorizado de
                desarrollos o comercializadoras clientes de gabi.
              </li>
            </ul>
            <p>
              Los procesos comerciales offline del desarrollo o de la comercializadora (contratos
              de compraventa, anexos de apartado, avisos propios del vendedor) pueden regirse por
              avisos de privacidad distintos emitidos por esas entidades. Cuando un documento de
              expediente del cliente (por ejemplo, un anexo de privacidad del desarrollo) se
              almacene en gabi, gabi lo trata como encargado o como responsable según el contexto
              contractual; en todo caso, este aviso informa el tratamiento técnico en la
              plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              3. Datos personales que se recaban
            </h2>
            <p>Según el uso de la plataforma, podemos tratar las siguientes categorías:</p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                <strong className="font-semibold text-gabi-navy">Identificación y contacto:</strong>{" "}
                nombre, correo electrónico, teléfono, ciudad u origen.
              </li>
              <li>
                <strong className="font-semibold text-gabi-navy">Comerciales / CRM:</strong> interés
                en productos o desarrollos, medio de contacto, campaña publicitaria, etapa del
                proceso, notas de seguimiento, historial de interacciones, asignación a asesor.
              </li>
              <li>
                <strong className="font-semibold text-gabi-navy">Usuarios de la plataforma:</strong>{" "}
                nombre, correo, teléfono, rol, desarrollo(s) asignado(s), credenciales o PIN de
                acceso, registros de sesión y actividad operativa.
              </li>
              <li>
                <strong className="font-semibold text-gabi-navy">
                  Documentación de expediente (cuando se carga):
                </strong>{" "}
                archivos e información asociada a identidad, domicilio, RFC u otros datos
                necesarios para apartado o formalización. Estos pueden incluir datos de carácter
                patrimonial o, en su caso, sensibles según su contenido; se tratan con mayor
                cuidado y solo para las finalidades del expediente.
              </li>
              <li>
                <strong className="font-semibold text-gabi-navy">Técnicos:</strong> dirección IP,
                tipo de dispositivo/navegador, registros de error (observabilidad), cookies o
                almacenamiento local necesarios para sesión y funcionamiento offline.
              </li>
            </ul>
            <p>
              No solicitamos de forma deliberada datos sensibles ajenos a la operación comercial
              inmobiliaria. Si usted los proporciona espontáneamente en notas o archivos, se
              tratarán solo en la medida necesaria para el servicio solicitado.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              4. Finalidades del tratamiento
            </h2>
            <p>
              <strong className="font-semibold text-gabi-navy">
                Finalidades primarias (necesarias para la relación / servicio):
              </strong>
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Operar la plataforma gabi y autenticar a usuarios autorizados.</li>
              <li>
                Registrar, asignar y dar seguimiento a prospectos y leads de desarrollos
                inmobiliarios.
              </li>
              <li>
                Facilitar recorridos, cotizaciones, disponibilidad, CRM, sembrado y expedientes.
              </li>
              <li>
                Enviar notificaciones operativas (por ejemplo, WhatsApp o correo) relacionadas
                con un lead o con el cumplimiento del proceso comercial.
              </li>
              <li>Soporte técnico, seguridad, prevención de abuso y continuidad del servicio.</li>
              <li>Cumplir obligaciones legales aplicables.</li>
            </ul>
            <p className="mt-4">
              <strong className="font-semibold text-gabi-navy">
                Finalidades secundarias (requieren consentimiento cuando la ley lo exija):
              </strong>
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>
                Envío de información comercial o demos sobre gabi a quienes lo soliciten
                (por ejemplo, agendar una demostración).
              </li>
              <li>
                Mejora del producto mediante análisis agregados o seudonimizados de uso, cuando
                no sean estrictamente necesarios para prestar el servicio.
              </li>
            </ul>
            <p>
              Si no desea que sus datos se usen para finalidades secundarias, puede oponerse en
              cualquier momento escribiendo a{" "}
              <a
                href="mailto:contacto@gabi.mx"
                className="font-medium text-gabi-navy underline decoration-gabi-teal/50 underline-offset-2 hover:decoration-gabi-teal"
              >
                contacto@gabi.mx
              </a>
              . La negativa no afectará el tratamiento necesario para prestar el servicio.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              5. Transferencias y encargados
            </h2>
            <p>
              Para operar gabi podemos compartir o alojar datos con proveedores que actúan como
              encargados o receptores necesarios del servicio, bajo obligaciones de
              confidencialidad y seguridad, entre ellos (según configuración vigente):
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Infraestructura de hosting y despliegue (por ejemplo, Vercel).</li>
              <li>Base de datos y almacenamiento (por ejemplo, Supabase).</li>
              <li>Correo transaccional (por ejemplo, Resend).</li>
              <li>
                Meta Platforms (Facebook / Instagram / WhatsApp Cloud API) para Lead Ads y
                mensajería, cuando la campaña o el canal estén conectados.
              </li>
              <li>Herramientas de observabilidad de errores (por ejemplo, Sentry), si están activas.</li>
              <li>
                Comercializadoras, desarrollos o asesores autorizados que usan gabi para atender
                al prospecto correspondiente.
              </li>
            </ul>
            <p>
              Algunas de estas transferencias pueden implicar tratamiento fuera de México. Al
              utilizar gabi o al enviar un lead a través de un canal conectado, usted acepta
              dichas transferencias en la medida necesaria para las finalidades informadas. No
              vendemos bases de datos de prospectos a terceros ajenos a la operación comercial
              descrita.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              6. Cookies y tecnologías similares
            </h2>
            <p>
              gabi utiliza cookies y almacenamiento local principalmente para autenticación de
              sesión, preferencias técnicas y funcionamiento offline de herramientas de campo.
              No operamos de forma predeterminada píxeles publicitarios de terceros en el núcleo
              de la plataforma. Puede configurar su navegador para limitar cookies; algunas
              funciones de inicio de sesión podrían dejar de estar disponibles.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              7. Conservación
            </h2>
            <p>
              Conservamos los datos el tiempo necesario para las finalidades informadas, la
              relación comercial o contractual vigente, y los plazos legales de conservación o
              defensa de derechos. Los leads y expedientes suelen mantenerse mientras el
              desarrollo o la cuenta cliente permanezcan activos en gabi y conforme a
              instrucciones del cliente operativo, salvo solicitud ARCO procedente o
              obligación legal en contrario.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">8. Seguridad</h2>
            <p>
              Implementamos medidas administrativas, técnicas y físicas razonables (control de
              acceso, cifrado en tránsito, roles de usuario, claves de servicio) acordes a la
              naturaleza de los datos. Ningún sistema es absolutamente seguro; si detectamos un
              incidente relevante que afecte sus datos, procederemos conforme a la ley aplicable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              9. Derechos ARCO y limitación de uso
            </h2>
            <p>
              Usted puede solicitar acceso, rectificación, cancelación u oposición (ARCO), así
              como limitar el uso o divulgación de sus datos, o revocar el consentimiento cuando
              proceda, enviando un correo a{" "}
              <a
                href="mailto:contacto@gabi.mx"
                className="font-medium text-gabi-navy underline decoration-gabi-teal/50 underline-offset-2 hover:decoration-gabi-teal"
              >
                contacto@gabi.mx
              </a>{" "}
              con el asunto «Derechos ARCO — gabi», indicando:
            </p>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Nombre completo y medio de contacto para notificarle la respuesta.</li>
              <li>Descripción clara del derecho que desea ejercer y los datos involucrados.</li>
              <li>
                Documentos que acrediten su identidad (y, en su caso, la representación legal).
              </li>
            </ul>
            <p>
              Atenderemos su solicitud en los plazos y términos que establece la LFPDPPP. Si
              considera que su derecho a la protección de datos ha sido lesionado, puede acudir
              ante la autoridad competente en México.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              10. Menores de edad
            </h2>
            <p>
              gabi no está dirigido a menores de 18 años. Si tiene conocimiento de que un menor
              nos proporcionó datos sin la autorización correspondiente, escríbanos para
              proceder a su eliminación cuando corresponda.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">
              11. Cambios a este aviso
            </h2>
            <p>
              Podemos actualizar este aviso para reflejar cambios legales, operativos o del
              producto. La versión vigente se publicará en esta misma URL, con la fecha de
              última actualización. El uso continuado de gabi tras un cambio sustancial implica
              el conocimiento del aviso actualizado, sin perjuicio de los consentimientos que la
              ley exija obtener de nuevo.
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-gabi-line bg-white p-5 md:p-6">
            <h2 className="font-gabi-display text-lg font-bold text-gabi-navy">Contacto</h2>
            <p>
              José Ricardo Briseño Amieva · gabi
              <br />
              Enredadera 53, Álamos 3.ª sección, Querétaro, Qro., C.P. 76160, México
              <br />
              <a
                href="mailto:contacto@gabi.mx"
                className="font-medium text-gabi-navy underline decoration-gabi-teal/50 underline-offset-2 hover:decoration-gabi-teal"
              >
                contacto@gabi.mx
              </a>
            </p>
          </section>
        </div>
      </article>

      <footer className="border-t border-gabi-line px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-gabi-navy/40">© {new Date().getFullYear()} gabi</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
            <Link href="/" className="text-gabi-navy/45 hover:text-gabi-navy">
              Inicio
            </Link>
            <a href="mailto:contacto@gabi.mx" className="text-gabi-navy/45 hover:text-gabi-navy">
              contacto@gabi.mx
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
