# Gestor Viajes · Agenda B2B by Graiph

Plataforma de gestión de eventos y viajes corporativos. Permite a equipos B2B descubrir, catalogar, y gestionar su asistencia a eventos internacionales mediante IA (Gemini + Google Search).

---

## Perfil de Usuario (`/perfil`)

Accede desde el enlace **"Mi Perfil"** en la barra lateral izquierda, o navegando directamente a `/perfil`.

La página permite:
- Ver el email corporativo asociado a la sesión (sólo lectura).
- Editar tu **cargo estratégico** y URL de **LinkedIn**.
- Crear o editar los datos de tu **empresa** (nombre, sector industrial, país).
- Consultar tu **resumen de actividad**: cuántos eventos tienes en cada estado de asistencia (Evaluando, Confirmado Asistente, Confirmado Sponsor, Descartados).

Los cambios se guardan directamente en Supabase via `perfiles_usuarios` y `empresas`.

---

## Detalle de Evento (`/eventos/[id]`)

Accede desde el **modal de un evento** en el Dashboard — botón **"Ver detalle completo"** (sólo disponible para eventos del catálogo global).

La página de detalle muestra:
- Hero con nombre del evento, fechas, duración y ubicación.
- Descripción oficial y enlace al sitio web del organizador.
- Módulo de **Radar de Prensa Automatizado** con las últimas noticias cargadas por el cron job.
- Panel de gestión de **Mi Asistencia** (seleccionar estado + desvincularme).
- Botones de acción: Sincronizar Calendario, Bajar `.ics`, y **Compartir por email**.

### Compartir por email

El botón **"Compartir por email"** abre un modal donde puedes:
1. Ingresar la dirección del destinatario.
2. Agregar una nota personal opcional.
3. Hacer clic en **"Abrir en Email"** — esto genera un enlace `mailto:` con el asunto y el cuerpo del mensaje pre-completados con los datos del evento, y abre tu cliente de email predeterminado (Outlook, Gmail, Apple Mail, etc.).

No requiere configuración adicional de servidor de correo; utiliza el cliente de email del sistema operativo del usuario.

---

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
