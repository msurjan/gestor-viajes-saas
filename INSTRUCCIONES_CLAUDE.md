# Instrucciones para ClaudeCode - Gestor Viajes

**Contexto General para Claude:**
"Hola Claude. Estamos construyendo 'Gestor Viajes', una plataforma para gestionar visitas a terreno, eventos mineros y congresos en Latam. Nuestro stack es Next.js (App Router), Tailwind CSS y Supabase (PostgreSQL). Ya tengo el esqueleto inicial de Next.js. El objetivo es crear la interfaz y conectar la base de datos para los módulos de Eventos, Logística, Proveedores, Gastos y Conocimiento."

## Paso 1: Configuración de Supabase
1. **Pídele a ClaudeCode:**
   > "Por favor, verifica si `@supabase/supabase-js` está instalado en `package.json`. Si no lo está, instálalo. Luego, crea un archivo de configuración en `src/utils/supabase.ts` (o `src/lib/supabase.ts`) exportando un cliente de Supabase usando variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`."
2. **Acción tuya (Usuario):**
   - Asegúrate de haber obtenido tu URL y anon key desde Supabase (Project Settings) y haber creado un archivo `.env.local` en la raíz de tu proyecto con esas variables.

## Paso 2: Ejecución de Scripts SQL
1. **Pídele a ClaudeCode:**
   > "Tenemos el siguiente script de tablas SQL. Por favor configúralo en un archivo llamado `schema.sql` en la raíz para que me sirva de respaldo y revisa que la estructura tenga sentido para nuestro MVP. Las tablas son:
   > - `eventos` (con `id`, `nombre`, `ubicacion`, `fecha_inicio`, `fecha_fin`, `tipo`, `costo_estimado`, `estado`, etc.)
   > - `proveedores`
   > - `logistica` (relacionado con evento_id)
   > - `gastos` (relacionado con evento_id)
   > ¿Puedes generar sugerencias completas de esquemas SQL para las tablas que faltaban estructurar a detalle en nuestra conversación previa?"
2. **Acción tuya (Usuario):**
   - Copia los scripts SQL finales que te dé ClaudeCode, ve a la sección "SQL Editor" en el panel de control web de Supabase y córrelos para crear las tablas en la nube.

## Paso 3: Construcción del Dashboard y Módulo de Eventos (CRUD)
1. **Pídele a ClaudeCode:**
   > "Ahora quiero que modifiques `src/app/page.tsx` para que sea un Dashboard principal atractivo y moderno (usa colores sobrios pero llamativos, algo corporativo para minería pero moderno). Deberá tener navegación lateral (Sidebar) o un Header superior hacia los distintos módulos. 
   > 
   > Empecemos desarrollando el Módulo de Eventos. Crea las páginas o los componentes cliente necesarios (`src/app/eventos/page.tsx`, `src/app/eventos/nuevo/page.tsx`) para poder listar (Read), crear (Create), editar (Update) y eliminar (Delete) eventos, conectándose con Supabase usando las Server Actions de Next.js o llamados fetch al cliente de Supabase que creamos."

## Paso 4: Módulo de Logística y Gastos
1. **Pídele a ClaudeCode:**
   > "Para cada evento creado, necesitamos un panel interno (ej: `/eventos/[id]`). En esta vista detallada, implementa secciones para:
   > 1. Gestionar 'Logística' (Vuelos, Alojamiento).
   > 2. Cargar o registrar 'Gastos' (rendición de lucas).
   > Diseña los formularios para guardar esta información en las tablas `logistica` y `gastos`, respetando la relación con el `evento_id` respectivo."

## Paso 5: Módulo de Gestión del Conocimiento
1. **Pídele a ClaudeCode:**
   > "Por último, necesitamos una sección de bitácora estilo Wiki/CRM en la vista detallada del Evento. Implementa un textarea amplio o un editor que permita guardar 'notas', 'contactos hechos', 'ideas' e 'inquietudes' post-evento. Asegúrate de añadir una tabla adicional si es necesario (ej: `notas_evento`) o usar una columna de texto enriquecido/JSON en la tabla `eventos` o `relatos_evento`."

## Notas para iterar:
- Después de cada comando, puedes probar la app corriendo `npm run dev` en una terminal y viendo los resultados en http://localhost:3000.
- Si ves algo que no te gusta, dale el feedback directo a ClaudeCode (ej. *"Haz el botón más grande", "cambia los colores a un estilo más oscuro"*).
