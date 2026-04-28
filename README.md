# EQUIDATA

Proyecto Next.js (App Router + TypeScript) con Firebase Auth, Firestore y Storage.

## Ejecutar en local

1. Instala dependencias:

```bash
npm install
```

2. Configura variables de entorno:

Copia `.env.example` a `.env.local` y configura:

- Firebase: Obtén las claves de tu proyecto Firebase.
- Stripe: Crea una cuenta en Stripe y obtén las claves.

3. Inicia el servidor:

```bash
npm run dev
```

4. Abre `http://localhost:3000`.

## Configuración de Pagos (Stripe)

1. Crea una cuenta en [Stripe](https://stripe.com).

2. Obtén las claves API:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_SECRET_KEY`

3. Configura webhook:
   - URL: `https://tu-dominio.com/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`
   - Obtén el `STRIPE_WEBHOOK_SECRET`

4. Agrega las variables a `.env.local`.

## Planes de Suscripción

- **Básico**: $24.99/mes - Hasta 20 caballos, 3 módulos.
- **Profesional**: $49.99/mes - Hasta 50 caballos, todas las funcionalidades.
- **Ilimitado**: $79.99/mes - Caballos ilimitados, todas las funcionalidades.

Los límites se verifican en `lib/utils/planLimits.ts`.

## Rutas principales

- ` /login`
- ` /register`
- ` /dashboard/rider`
- ` /dashboard/pro`
- ` /dashboard/center`
- ` /dashboard/center/stables`
- ` /dashboard/center/arenas`
- ` /dashboard/center/feed`
- ` /dashboard/center/tasks`
- ` /dashboard/center/billing`

## Dashboard de centro (RBAC)

Se agregaron hooks reutilizables:

- `lib/hooks/useAuthUser.ts`
- `lib/hooks/useRequireCenterRole.ts`

Reglas:

- En `production`: solo `CENTER_OWNER` o `CENTER_ADMIN` pueden entrar a ` /dashboard/center/*`.
- En `development`: se permite acceso para pruebas locales (bypass), sin redirecciones forzadas.

## Redirects entre dashboards (DEV vs PROD)

Se unifico helper de entorno en:

- `lib/env.ts` (`isDev()`)

Comportamiento:

- Sin sesion: siempre redirect a `/login` (DEV y PROD).
- Con sesion en `development`: puedes abrir manualmente ` /dashboard/rider`, ` /dashboard/pro` y ` /dashboard/center` sin redirect automatico por rol.
- Con sesion en `production`: se mantiene redirect automatico al dashboard correspondiente segun rol.

## Estrategia de centerId activo

El `centerId` activo se resuelve con este orden:

1. `users/{uid}.centerId` (si existe y pertenece al usuario).
2. Valor guardado en `localStorage` (`equidata:active-center:{uid}`).
3. Primer centro donde el usuario es `CENTER_OWNER`.
4. Si no, primer centro donde es `CENTER_ADMIN`.

Fuentes de membresia soportadas:

- `centers/{centerId}.ownerUid` (nuevo)
- `centers/{centerId}.ownerId` (legacy)
- `centers/{centerId}.admins[]`
- `centers/{centerId}/members/{uid}` con `role = CENTER_OWNER | CENTER_ADMIN` y `status = active`

## Modulo de Piensos (`/dashboard/center/feed`)

Incluye:

- CRUD completo de inventario de pienso (`onSnapshot` realtime).
- Validaciones de negocio:
  - `maxStock > 0`
  - `currentStock >= 0`
  - `currentStock <= maxStock`
  - `adjustFeedStock(delta)` no permite bajar de `0` ni superar `maxStock`
- Estados de `loading`, `empty`, `error`.
- Modal para "Anadir pienso".
- Acciones por item: anadir stock, consumir stock, editar y eliminar.
- Barra de progreso `rounded-full`.

Coleccion usada:

- `centers/{centerId}/feedItems/{feedItemId}`

Campos guardados:

- `name`
- `unit`
- `maxStock`
- `currentStock`
- `minStock`
- `supplier`
- `createdAt`
- `updatedAt`

## Firestore indexes

Para esta fase no se requiere indice compuesto nuevo para `feedItems`.

Si aparece error de indice en otras consultas del proyecto, crea el indice desde el link que devuelve Firestore en consola.

## Notas de validacion

- `npx tsc --noEmit` pasa.
- El lint global del repo ya tiene errores previos en archivos no tocados (`any` explicito en pantallas legacy).
- Lint en archivos nuevos/modificados de esta entrega: OK.
