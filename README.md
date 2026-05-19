# gabi

Guía para Asesores de Bienes Inmuebles. Aplicación Next.js para acompañar recorridos comerciales, trabajar con datos locales y sincronizar registros cuando haya internet.

## Desarrollo Local

Instala dependencias y levanta el servidor:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## PWA Y Modo Offline

gabi está configurada como PWA con `next-pwa`.

- En desarrollo (`npm run dev`) el service worker está desactivado para evitar caché vieja.
- En producción (`npm run build` + `npm start`) se genera `/sw.js`.
- La app cachea rutas, imágenes, fuentes y assets internos.
- Los clientes/leads se guardan localmente y `gabi_crm_pending` se reintenta al volver internet.

Para probar offline localmente:

```bash
npm run build
npm start
```

Después abre la app una vez online, instálala desde el navegador y prueba modo avión.

## Publicación En Vercel

1. Sube el repositorio a GitHub.
2. Crea un proyecto en [Vercel](https://vercel.com/new) conectado al repositorio.
3. Usa los defaults de Next.js:
   - Build command: `npm run build`
   - Output: automático
4. Agrega variables de entorno si se va a sincronizar CRM:
   - `HUBSPOT_PRIVATE_APP_TOKEN`
5. Publica y valida la URL temporal antes de conectar dominio.

## Validación Antes De Publicar

```bash
npm run lint
npm run build
```
