# SPEC 03 — Página Acerca de y formulario de contacto

> **Estado:** Implementado
> **Depende de:** SPEC 01, SPEC 02
> **Fecha:** 2026-10-11
> **Objetivo:** Implementar `references/templates/home-about/about.jsx` en `/about` como tab `Acerca de` del Nav, con un formulario de contacto que envía un correo real vía Resend a través del endpoint `POST /api/contact`.

## Por qué existe este spec

SPEC 02 dejó fuera el tab `Acerca de` porque su formulario de contacto necesita envío real de correo.
Es la primera funcionalidad del proyecto con efecto en el servidor y secretos (`RESEND_API_KEY`).
Por eso fija el patrón: Route Handler en `app/api/` + validación en servidor + variables de entorno.

## Alcance

**Dentro:**

- Ruta `/about` — réplica fiel de `about.jsx`:
  - Hero: kicker `▸ ACERCA DE`, título `ACERCA DE ARCADE VAULT`, párrafo de misión.
  - `highlight-row` con 3 `highlight` (`HEART` magenta, `BROWSER` cyan, `PLANT` green) y `HighlightIcon` (SVG pixel).
  - Divider `about-divider` con 24 píxeles animados (`.reveal`).
  - Sección contacto (`.reveal`): intro `▸ CONTACTO` / `CONTÁCTANOS`, subtítulo, 3 tips con LED.
  - Formulario con campos `NOMBRE`, `CORREO ELECTRÓNICO`, `MENSAJE` y botón `▶  ENVIAR MENSAJE`.
- Estados del formulario:
  - **Vacío/inválido en cliente:** si algún campo está vacío, animación `shake` (400 ms) y no se envía.
  - **Pending:** inputs y botón deshabilitados; botón muestra `▶ ENVIANDO…`.
  - **Éxito:** `terminal-success` igual al template, con `GRACIAS, <NOMBRE>.` y botón `ENVIAR OTRO MENSAJE` que limpia el formulario.
  - **Error:** mismo terminal con líneas `[OK]` y una línea final `[ERROR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.` + botón `REINTENTAR` que vuelve al formulario conservando los datos.
- Route Handler `POST /api/contact` (`app/api/contact/route.ts`) que valida y envía un correo de texto plano vía Resend a `CONTACT_TO_EMAIL`.
- `ContactForm` llama al endpoint con `fetch` y JSON.
- Validación en servidor: campos requeridos (tras `trim`), email con regex, nombre ≤ 60, email ≤ 254, mensaje ≤ 2000 caracteres.
- Honeypot: campo oculto `website`; si viene con valor, el servidor devuelve éxito sin llamar a Resend.
- Correo: asunto `[Arcade Vault] Mensaje de <nombre>`, `replyTo` = email del usuario, cuerpo con nombre, email y mensaje.
- Variables de entorno: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`; `.env.example` commiteado.
- Nav: link `Acerca de` como último tab en barra de escritorio y en el panel móvil (antes de `Iniciar Sesión`), activo en `/about`.
- Portar a `app/globals.css` el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css`.
- Estilo para la línea de error del terminal (`.term-body .error`), diseñado con `/frontend-design` porque el template no lo define.

**Fuera de alcance (para specs futuros):**

- Persistir mensajes en base de datos.
- Correo de confirmación al remitente.
- Rate limit por IP o captcha.
- Plantilla HTML / React Email.
- Dominio verificado en Resend (se usa `onboarding@resend.dev` mientras tanto).
- Link `Acerca de` en el Footer.
- Bloques CSS `GAMEPAD` y `Theme variants`.

## Modelo de datos

`app/api/contact/route.ts`:

```ts
// Request: POST /api/contact, Content-Type: application/json
export interface ContactRequest {
  name: string;
  email: string;
  msg: string;
  website?: string;   // honeypot, debe venir vacío
}

export type ContactField = "name" | "email" | "msg";

// Respuestas:
// 200 { ok: true }                                   → enviado (o honeypot lleno)
// 400 { ok: false, error: "invalid", fields: ContactField[] } → validación falló o body no es JSON
// 500 { ok: false, error: "send_failed" }            → falta env o Resend falló
export type ContactResponse =
  | { ok: true }
  | { ok: false; error: "invalid"; fields: ContactField[] }
  | { ok: false; error: "send_failed" };

export async function POST(request: Request): Promise<Response>;
```

Estado del cliente en `app/components/ContactForm.tsx`:

```ts
type Status = "idle" | "sending" | "success" | "error";
// form: { name, email, msg } se conserva en error para REINTENTAR.
```

Variables de entorno (`.env.local`, no commiteado; `.env.example` sí):

```bash
RESEND_API_KEY=re_xxxxxxxx
CONTACT_TO_EMAIL=diegochoqueramirez@gmail.com
CONTACT_FROM_EMAIL="Arcade Vault <onboarding@resend.dev>"
```

Convenciones:

- `RESEND_API_KEY` solo se lee en el servidor; nunca con prefijo `NEXT_PUBLIC_`.
- Solo se exporta `POST`; otros métodos devuelven 405 (comportamiento por defecto de Next).
- Si falta alguna variable o Resend devuelve error, responde 500 `send_failed` y loguea en servidor con `console.error`. Nunca lanza.
- Respuesta 400 `invalid` reutiliza el `shake` del cliente (no hay mensajes por campo).
- Error de red en el `fetch` se trata igual que 500 (terminal de error).
- Textos de la página (misión, highlights, tips) son copy fijo en el componente, no en `app/data/`.

## Plan de implementación

1. Portar el bloque `ABOUT PAGE` de `references/templates/home-about/styles.css` al final de `app/globals.css`. Verificar: `npm run build` compila y las pantallas existentes no cambian.
2. Crear `app/components/HighlightIcon.tsx` (servidor, SVG puros) y `app/components/About.tsx` (servidor) con hero, highlights y divider, más un placeholder para el formulario. Crear `app/about/page.tsx` que renderiza `<About />` + `<RevealObserver />`. Verificar: `/about` muestra hero y divider; el divider aparece al hacer scroll.
3. Nav: añadir sección `"about"` a `sectionFor` (`pathname.startsWith("/about")`) y link `Acerca de` como último tab en barra y panel móvil (antes de `Iniciar Sesión`). Verificar: link activo correcto en `/about` y el resto de rutas.
4. Crear `app/components/ContactForm.tsx` (cliente) con el formulario, `shake` en cliente y el estado de éxito simulado localmente. Integrarlo en `About.tsx`. Verificar: vacíos hacen shake; completo muestra el terminal.
5. Instalar `resend`. Añadir `!.env.example` a `.gitignore` y crear `.env.example`. Crear `app/api/contact/route.ts` con `POST` (parseo JSON, validación, honeypot, envío Resend, códigos 200/400/500). Verificar con `curl -X POST localhost:3000/api/contact`: body inválido → 400, honeypot lleno → 200 sin correo.
6. Conectar `ContactForm` al endpoint con `fetch("/api/contact", { method: "POST" })`: estados sending, success, invalid (shake) y error; campo honeypot oculto (`aria-hidden`, `tabIndex={-1}`, `autoComplete="off"`). Verificar con `.env.local` real: llega el correo a `CONTACT_TO_EMAIL` con `replyTo` correcto.
7. Diseñar con `/frontend-design` la línea `.term-body .error` y el botón `REINTENTAR` dentro del lenguaje visual del terminal. Verificar: sin `RESEND_API_KEY` se ve el terminal de error y `REINTENTAR` conserva los datos.
8. `npm run lint` y `npm run build` sin errores.

## Criterios de aceptación

- [x] `npm run build` y `npm run lint` terminan sin errores.
- [x] `/about` renderiza hero, 3 highlights, divider y sección de contacto sin errores en consola.
- [x] `/about` usa las mismas clases CSS que `about.jsx` y se ve igual lado a lado con `references/templates/home-about/arcade-vault-standalone.html`.
- [x] Divider y sección contacto empiezan ocultos y reciben la clase `in` al entrar en viewport.
- [x] `Acerca de` es el último tab del Nav en escritorio y aparece en el panel móvil antes de `Iniciar Sesión`.
- [x] `Acerca de` tiene clase `active` solo en `/about`.
- [x] Enviar con algún campo vacío aplica `shake` y no hace request a `/api/contact`.
- [x] Durante el envío, inputs y botón están deshabilitados y el botón muestra `▶ ENVIANDO…`.
- [x] Con env válidas, enviar el formulario entrega un correo a `CONTACT_TO_EMAIL` con asunto `[Arcade Vault] Mensaje de <nombre>` y `replyTo` igual al email ingresado.
- [x] Tras éxito se muestra el terminal con `GRACIAS, <NOMBRE EN MAYÚSCULAS>.`; `ENVIAR OTRO MENSAJE` vuelve al formulario vacío.
- [x] Sin `RESEND_API_KEY` (o con una inválida) se muestra el terminal con `[ERROR] NO SE PUDO ENVIAR. INTÉNTALO DE NUEVO.`; `REINTENTAR` vuelve al formulario con los datos previos.
- [x] `POST /api/contact` con email inválido (p.ej. `abc`), mensaje > 2000 caracteres o body no JSON responde 400 `invalid` y no llama a Resend.
- [x] `POST /api/contact` con el honeypot `website` lleno responde 200 y no se envía correo; en la UI se muestra éxito.
- [x] `GET /api/contact` responde 405.
- [x] `RESEND_API_KEY` no aparece en ningún bundle del cliente (grep en `.next/static`).
- [x] `.env.example` está commiteado con las 3 variables; `.env.local` no.
- [x] `app/globals.css` no incluye los bloques `GAMEPAD` ni `Theme variants`.

## Decisiones

- **Sí:** Resend. SDK simple, free tier suficiente.
- **No:** Nodemailer + SMTP. Más configuración y credenciales más sensibles.
- **No:** mock sin envío. El usuario quiere envío real en este spec.
- **Sí:** Route Handler `POST /api/contact`. Decisión del usuario: endpoint explícito, testeable con `curl` y reutilizable por otros clientes.
- **No:** Server Action. Se consideró primero; se descartó en favor de un endpoint REST con nombre fijo.
- **Sí:** ruta `/about`. Coherente con `/games`, `/hall-of-fame`, `/login`.
- **No:** `/acerca-de`. Rompe la convención de rutas en inglés.
- **Sí:** solo un correo al equipo (`diegochoqueramirez@gmail.com`).
- **No:** acuse de recibo al remitente. Abre la puerta a usar el formulario para spamear terceros.
- **Sí:** destinatario y remitente en env vars. Cambiar buzón o dominio no requiere deploy de código.
- **Sí:** `onboarding@resend.dev` como remitente inicial. Sin dominio verificado, Resend solo entrega al email dueño de la cuenta, que coincide con el destinatario.
- **Sí:** validación en servidor + honeypot. Protección básica sin dependencias.
- **No:** rate limit en memoria. No es fiable en serverless; va en su spec si hace falta.
- **Sí:** honeypot devuelve éxito falso. No le da pistas al bot.
- **Sí:** texto plano. Sin dependencias extra; el correo es interno.
- **No:** React Email. Sobreingeniería para un buzón propio.
- **Sí:** error en el mismo estilo terminal con `REINTENTAR`. Coherente con el éxito del template.
- **Sí:** pending con botón deshabilitado `▶ ENVIANDO…`.
- **No:** terminal progresivo durante el envío. Las líneas `[OK]` serían falsas antes de la respuesta.
- **Sí:** reutilizar `RevealObserver` de SPEC 02.
- **Sí:** `About` servidor + `ContactForm` cliente. Solo el formulario necesita estado.
- **Sí (durante implementación):** ignorar `.playwright-mcp/**` en `eslint.config.mjs`. Scripts temporales de Playwright, ya ignorados por git, rompían `npm run lint`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| `.gitignore` ignora `.env*`, incluido `.env.example` | Añadir `!.env.example` en el paso 5. |
| Sin dominio verificado, Resend rechaza destinatarios distintos al dueño de la cuenta | `CONTACT_TO_EMAIL` debe ser el email de la cuenta Resend. Verificar dominio en un spec futuro antes de cambiar el destinatario. |
| Clases del bloque `ABOUT PAGE` dependen de reglas fuera del bloque (`.kicker`, `.field`, `.btn.xl`, `.fade-in`) | Ya existen en `app/globals.css` por SPEC 01/02; al portar, comprobar cada clase de `about.jsx`. |
| Reglas portadas chocan con existentes (`.field`, `.divider`, `@keyframes shake`) | Revisar duplicados al portar; mantener la versión existente si ya hay una y verificar visualmente `/login`. |
| Route Handlers con `cacheComponents` (API distinta a la conocida) | Consultar la guía de Route Handlers en `node_modules/next/dist/docs/01-app/` antes del paso 5. `POST` no se cachea. |
| Endpoint público invocable sin pasar por la UI | Misma validación y honeypot en servidor; nunca confiar en la validación del cliente. |
| Abuso del formulario (spam masivo) agota la cuota de Resend | Honeypot + límites de longitud. Rate limit/captcha queda para otro spec. |

## Lo que **no** entra en este spec

- Persistencia de mensajes en base de datos.
- Correo de confirmación al remitente.
- Rate limit o captcha.
- Plantilla HTML / React Email.
- Dominio verificado en Resend.
- Link `Acerca de` en el Footer.

Cada uno, si llega, va en su propio spec.
