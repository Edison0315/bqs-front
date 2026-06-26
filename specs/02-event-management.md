# 02 — Event management

- **State:** Approved
- **Date:** 2026-06-26
- **Dependencies:** 01-employee-management (patrón módulo lazy, signal store, backend `localhost:3000`, labels ES hardcoded)
- **Objective:** CRUD de eventos comerciales con vista híbrida calendario + lista lateral y edición vía modal, contra REST backend `localhost:3000`, dentro del layout autenticado, estado con Angular Signals.

## Scope

### In
- Nuevo módulo lazy en `src/app/modules/admin/events/` bajo layout autenticado.
- Vista híbrida: calendario (FullCalendar via `@fullcalendar/angular`, ya presente en template Fuse) + panel lateral con lista de eventos del rango visible y detalle resumido.
- Operaciones:
  - List (`GET /events`) — sin paginación, sin query params.
  - View detalle (`GET /events/:id`).
  - Create (`POST /events`) — vía modal Material Dialog desde click en celda de calendario o botón "Nuevo".
  - Edit (`PUT /events/:id`) — vía mismo modal abierto desde click en bloque del calendario o fila de lista.
  - Soft-delete (`DELETE /events/:id`) — server setea `deletedAt`; UI mantiene evento visible con badge "Eliminado" y filtro para ocultar/mostrar.
- Filtros cliente-side:
  - Búsqueda por `name`, `clientName`, `location` (case-insensitive).
  - Multi-select por `status` (5 valores).
  - Toggle "Mostrar eliminados".
- Cambio libre de `status` entre los 5 valores desde el formulario (sin máquina de estados).
- Reactive form con validaciones acordadas.
- Signal store en `EventsService` (`signal` + `computed`, HTTP devuelve `Observable` y patchea signals).
- Entrada de navegación "Eventos" con icono `heroicons_outline:calendar-days` en todas las variantes de layout.

### Not in
- Vista timeline/Gantt (descartada en favor del híbrido calendario+lista).
- Drag-and-drop para mover/redimensionar eventos en el calendario (solo click → modal).
- Recurrencia (eventos repetitivos).
- Relaciones con empleados u otras entidades (sin `assigned_employees`, sin clientes como entidad).
- Server-side pagination, sorting, search.
- Notificaciones, recordatorios, invitaciones por email.
- i18n via Transloco (labels ES hardcoded).
- Auth/roles (igual que spec 01).
- Bulk operations (multi-delete, import/export).
- Audit log / historial de cambios.
- Tests unitarios / E2E (`skipTests: true` por defecto).
- Hard delete o restauración (undelete) desde UI.
- Adjuntos / archivos.
- Vistas guardadas / filtros persistentes entre sesiones.

## Data model

### Enum

```ts
// src/app/modules/admin/events/events.types.ts

export type EventStatus =
  | 'draft'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export const EVENT_STATUS_VALUES: readonly EventStatus[] = [
  'draft',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
];
```

### Entity (alineado con backend, camelCase)

```ts
export interface EventItem {
  id: number;
  name: string;
  description: string;
  startDate: string;        // ISO datetime
  endDate: string;          // ISO datetime
  location: string;
  status: EventStatus;
  clientName: string;
  expectedAttendees: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null; // null = activo, ISO = soft-deleted
}

export type EventCreatePayload = Omit<
  EventItem,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;
export type EventUpdatePayload = Partial<EventCreatePayload>;
```

Nota: nombre de tipo `EventItem` (no `Event`) para evitar colisión con `Event` global del DOM.

### Validation rules (reactive form)

| Field               | Rule                                                       |
|---------------------|------------------------------------------------------------|
| `name`              | required, trim, min 2 chars                                |
| `description`       | optional, max 2000 chars                                   |
| `startDate`         | required, valid ISO datetime                               |
| `endDate`           | required, valid ISO datetime, ≥ `startDate`                |
| `location`          | required, trim, min 2 chars                                |
| `status`            | required, valor de `EVENT_STATUS_VALUES`                   |
| `clientName`        | required, trim, min 2 chars                                |
| `expectedAttendees` | required, integer ≥ 0                                      |
| `notes`             | optional, max 2000 chars                                   |

Cross-field validator: `endDate >= startDate` a nivel de FormGroup.

### Signal store shape (`EventsService`)

```ts
readonly events           = signal<EventItem[]>([]);
readonly selectedId       = signal<number | null>(null);
readonly searchQuery      = signal<string>('');
readonly statusFilter     = signal<Set<EventStatus>>(new Set(EVENT_STATUS_VALUES));
readonly showDeleted      = signal<boolean>(false);
readonly visibleRange     = signal<{ start: string; end: string } | null>(null);
readonly loading          = signal<boolean>(false);
readonly error            = signal<string | null>(null);

readonly selected         = computed(() => /* lookup by selectedId */);
readonly filteredList     = computed(() => /* search + statusFilter + showDeleted + visibleRange */);
readonly calendarEvents   = computed(() => /* map filteredList → FullCalendar EventInput */);
readonly countsByStatus   = computed(() => /* { draft: n, confirmed: n, ... } */);
```

### UI labels (Spanish, hardcoded en `events.constants.ts`)

| Key             | Label         | Color (hint para chip / calendario) |
|-----------------|---------------|--------------------------------------|
| `draft`         | Borrador      | gray                                 |
| `confirmed`     | Confirmado    | blue                                 |
| `in_progress`   | En curso      | amber                                |
| `completed`     | Completado    | green                                |
| `cancelled`     | Cancelado     | red                                  |

Badge adicional para soft-deleted: label "Eliminado", color slate, derivado de `deletedAt !== null` (no es un status).

## Implementation plan

Cada paso deja la app compilando y `npm start` ejecutable.

1. **Tipos y constantes**
   - Crear `src/app/modules/admin/events/events.types.ts` con `EventStatus`, `EVENT_STATUS_VALUES`, `EventItem`, `EventCreatePayload`, `EventUpdatePayload`.
   - Crear `events.constants.ts` con `EVENT_STATUS_LABELS` (es) y `EVENT_STATUS_COLORS`.

2. **Service con signal store**
   - `events.service.ts` (`providedIn: 'root'`).
   - Inyecta `HttpClient`, base `http://localhost:3000`.
   - Signals: `events`, `selectedId`, `searchQuery`, `statusFilter`, `showDeleted`, `visibleRange`, `loading`, `error`.
   - Computed: `selected`, `filteredList`, `calendarEvents`, `countsByStatus`.
   - Métodos (devuelven `Observable`, patchean signals on success):
     - `loadAll()` → `GET /events`
     - `loadOne(id)` → `GET /events/:id`
     - `create(payload)` → `POST /events`, push al signal `events`.
     - `update(id, payload)` → `PUT /events/:id`, replace en signal.
     - `remove(id)` → `DELETE /events/:id`, patchea entrada local con `deletedAt = response.deletedAt` (sin sacar de la lista).

3. **Routes y lazy module**
   - `events.routes.ts` con ruta `''` apuntando a `EventsComponent` (container híbrido). Modal se gestiona como overlay, no como ruta hija.
   - Wire `loadChildren` en `app.routes.ts` bajo admin autenticado, path `events`.

4. **Container híbrido**
   - `events.component.ts` standalone. Layout: barra superior con filtros (search input, multi-select status, toggle "Mostrar eliminados", botón "Nuevo") + grid: calendario izquierda (≈70%), lista lateral derecha (≈30%).
   - `effect()` o `ngOnInit`: dispara `loadAll()`.
   - Lee `calendarEvents()` y `filteredList()` del service.

5. **Calendario (FullCalendar)**
   - `event-calendar.component.ts` standalone, envuelve `FullCalendarModule` (`@fullcalendar/angular`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction`).
   - Vistas habilitadas: `dayGridMonth`, `timeGridWeek`. Sin drag-and-drop (`editable: false`).
   - `events: calendarEvents()` (input desde computed del service).
   - Handler `dateClick` → abre modal en modo "crear" prefijando `startDate`/`endDate` con la celda.
   - Handler `eventClick` → abre modal en modo "editar" con `id` seleccionado.
   - Handler `datesSet` → escribe `visibleRange` en el service.
   - Color del bloque tomado de `EVENT_STATUS_COLORS`; bloques con `deletedAt !== null` con opacidad reducida + borde discontinuo.

6. **Lista lateral**
   - `event-list.component.ts` standalone, signal-driven.
   - Renderiza `filteredList()` ordenado por `startDate` asc.
   - Cada fila: `name`, fecha corta, chip status, badge "Eliminado" si aplica.
   - Click fila → abre modal en modo "editar".

7. **Modal de detalle/edición/creación**
   - `event-form-dialog.component.ts` standalone, `MatDialog`.
   - Recibe `{ mode: 'create' | 'edit'; id?: number; defaults?: Partial<EventItem> }`.
   - Reactive form con validators de la sección Data model + cross-field `endDate ≥ startDate`.
   - Selects/inputs Material: `name`, `clientName`, `location` (text), `description`/`notes` (textarea), `startDate`/`endDate` (datetime picker Luxon), `status` (select con labels ES + color), `expectedAttendees` (number).
   - Botones:
     - Crear: "Guardar" → `create()`, cierra modal, refresca via signal.
     - Editar: "Guardar" → `update()`; "Eliminar" → confirm dialog → `remove()`; "Cerrar" descarta.
   - Si entrada tiene `deletedAt !== null`: formulario en modo solo-lectura, botón "Eliminar" oculto, badge "Eliminado" visible en header del modal.

8. **Filtros en barra superior**
   - Input search bindea `searchQuery` (debounce 200ms vía `rxjs` o `effect` con `setTimeout`).
   - Chip group multi-select para status bindea `statusFilter` (Set).
   - Toggle "Mostrar eliminados" bindea `showDeleted`.
   - Contadores por status renderizados desde `countsByStatus()`.

9. **Entrada de navegación**
   - Editar `src/app/mock-api/common/navigation/data.ts`: añadir item `id: 'events'`, `title: 'Eventos'`, `type: 'basic'`, `icon: 'heroicons_outline:calendar-days'`, `link: '/events'`.
   - Añadir a arrays `default`, `compact`, `futuristic`, `horizontal`.

10. **Wire y smoke-test**
    - Verificar dependencias FullCalendar ya instaladas (`package.json`). Si faltan, `npm i @fullcalendar/angular @fullcalendar/core @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction`.
    - `npm start`, login, navegar a Eventos, verificar:
      - `GET /events` se dispara una vez.
      - Calendario muestra bloques con colores por status.
      - Click celda → modal crear → `POST` → bloque aparece.
      - Click bloque → modal editar → `PUT` → bloque actualiza.
      - Botón eliminar → `DELETE` → bloque queda con estilo "eliminado".
      - Toggle "Mostrar eliminados" oculta/muestra correctamente.

## Acceptance criteria

- [ ] Menú de navegación muestra entrada "Eventos" con icono `calendar-days` en las 4 variantes de layout (default/compact/futuristic/horizontal).
- [ ] Click en "Eventos" navega a `/events` dentro del layout autenticado.
- [ ] Al cargar la vista, `GET http://localhost:3000/events` se dispara exactamente una vez y popula el signal `events`.
- [ ] Vista híbrida renderiza calendario (≈70% ancho) y lista lateral (≈30% ancho) simultáneamente.
- [ ] Calendario soporta vistas `dayGridMonth` y `timeGridWeek`, alternables desde su toolbar.
- [ ] Cada bloque del calendario usa el color definido en `EVENT_STATUS_COLORS` según `status`.
- [ ] Eventos con `deletedAt !== null` se muestran con opacidad reducida y borde discontinuo en el calendario, y con badge "Eliminado" en la lista.
- [ ] Click en celda vacía del calendario abre modal en modo "crear" con `startDate`/`endDate` prefijados desde la celda.
- [ ] Click en bloque del calendario abre modal en modo "editar" con el formulario poblado.
- [ ] Click en fila de la lista lateral abre modal en modo "editar".
- [ ] Botón "Nuevo" en barra superior abre modal en modo "crear" sin prefijos.
- [ ] Modal "crear" envía `POST /events` y, al éxito, cierra y el bloque aparece en calendario y lista sin recargar página.
- [ ] Modal "editar" envía `PUT /events/:id` y, al éxito, reemplaza la entrada en el signal sin recarga.
- [ ] Botón "Eliminar" muestra confirm dialog; al aceptar envía `DELETE /events/:id` y patchea `deletedAt` local con el valor devuelto por el server.
- [ ] Eventos con `deletedAt !== null` abren el modal en modo solo-lectura y sin botón "Eliminar".
- [ ] Input de búsqueda filtra `filteredList()` por `name`, `clientName`, `location` case-insensitive, cliente-side.
- [ ] Chip group multi-select de status filtra calendario y lista (los 5 status seleccionados por defecto).
- [ ] Toggle "Mostrar eliminados" oculta/muestra eventos soft-deleted en calendario y lista.
- [ ] Contadores por status en barra superior reflejan `countsByStatus()` y se actualizan con cada filtro/create/update/delete.
- [ ] Validators bloquean submit y muestran error a nivel de campo: `name` min 2, `location` min 2, `clientName` min 2, `expectedAttendees` ≥ 0 entero, `startDate`/`endDate` requeridos, `endDate ≥ startDate`, `status` válido.
- [ ] Cambio de `status` permitido libremente entre los 5 valores desde el select del modal (sin máquina de estados).
- [ ] Signals `loading` y `error` se reflejan visualmente (spinner durante fetch, banner/snackbar en fallo HTTP).
- [ ] No se usa `BehaviorSubject` / `Subject` para estado; todo el estado reactivo va por `signal` / `computed`.
- [ ] Identificadores, archivos y comentarios en inglés; labels de UI y datos en español.
- [ ] `npm run build` pasa sin errores ni violaciones de presupuesto.

## Decisions taken and discarded

### Taken

- **Dominio: eventos comerciales** (banquetes/catering), coherente con `waiter`/`kitchen_staff` del spec 01. Razón: alineación con vertical de negocio existente.
- **Vista híbrida calendario + lista lateral.** Razón: edición sin perder contexto temporal, evita pantalla aparte de detalle.
- **FullCalendar (`@fullcalendar/angular`).** Razón: ya usado por módulo `calendar` del template Fuse; reusar librería evita añadir dependencia nueva.
- **Modal Material Dialog para crear/editar.** Razón: requerido explícitamente; encaja con interacción tipo calendario (click → popup).
- **Soft-delete: `DELETE /events/:id`, server setea `deletedAt`.** UI mantiene evento visible con badge "Eliminado" y toggle para filtrar. Razón: backend ya implementa soft-delete; mostrar permite revisar histórico sin endpoint de restore.
- **Status libre entre 5 valores** desde el select del modal. Razón: requerimiento explícito, simplifica UX.
- **Filtros 100% cliente-side** (search, status multi-select, showDeleted, rango visible). Razón: backend sin query params, lista esperada pequeña.
- **camelCase en interfaz `EventItem`** (no snake_case). Razón: backend devuelve camelCase, evitar mapper.
- **`id: number`.** Razón: backend lo devuelve así.
- **Nombre de tipo `EventItem`** (no `Event`). Razón: evitar shadow del tipo global `Event` del DOM.
- **Signals sobre RxJS para estado.** HTTP devuelve `Observable` y se patchea signal. Razón: convención del proyecto fijada en spec 01.
- **Labels ES hardcoded en `events.constants.ts`.** Razón: convención del proyecto fijada en spec 01.
- **Sin tests en este spec.** Razón: `skipTests: true` por defecto.
- **Entrada de menú en las 4 variantes de layout.** Razón: evita menú invisible al cambiar layout (mismo criterio que spec 01).

### Discarded

- **Vista timeline/Gantt pura.** Descartado en favor del híbrido calendario+lista.
- **Ruta dedicada `/events/:id` con master-detail.** Descartado: modal sobre calendario es la interacción elegida.
- **Drag-and-drop para mover/redimensionar bloques.** Descartado para MVP; requiere `PUT` automático y manejo de conflictos.
- **Eventos recurrentes.** Descartado; fuera de scope.
- **Asignación de empleados al evento (`assignedEmployees: Employee[]`).** Descartado: usuario indicó "sin relaciones por ahora". Posible follow-up spec.
- **Cliente como entidad propia con FK.** Descartado: backend usa `clientName` como string libre.
- **Máquina de estados forzando transiciones** (draft→confirmed→…). Descartado: usuario pidió cambio libre.
- **MockApi handlers para eventos.** Descartado: backend real existe.
- **Server-side pagination/search.** Descartado: backend no soporta query params.
- **Transloco i18n.** Descartado: requerimiento single-language (spec 01).
- **Hard delete / endpoint de restore desde UI.** Descartado para MVP.
- **Notificaciones, recordatorios, invitaciones email.** Descartado; fuera de scope.
- **Drag de creación (click-drag para definir rango en `timeGridWeek`).** Descartado para MVP; usar prefill desde `dateClick` + ajuste manual en formulario.

## Identified risks

- **CORS en `localhost:3000`.** Dev en `localhost:4200`; backend debe permitirlo o configurar `proxy.conf.json`. Mitigación: validar en primer run, añadir proxy si bloquea (mismo riesgo que spec 01).
- **Mismatch de formato de fechas.** Backend devuelve `startDate`/`endDate` como string; FullCalendar y formulario Material esperan formatos específicos (ISO con/sin zona). Mitigación: normalizar a ISO 8601 con offset al enviar; parsear con Luxon (`MAT_LUXON_DATE_ADAPTER` ya configurado) al leer.
- **Zona horaria.** Eventos cruzando medianoche o creados en zona distinta a la de visualización pueden caer en celdas inesperadas. Mitigación: decidir si fechas son locales o UTC; documentar en `EventsService` y normalizar consistentemente.
- **Volumen creciente sin paginación.** `GET /events` carga todo; degrada cuando supera unos cientos. Mitigación: spec posterior con paginación + filtro server-side por rango visible.
- **FullCalendar pesado.** Plugins `daygrid`+`timegrid`+`interaction` aumentan bundle inicial; puede chocar con presupuesto 5MB de `angular.json`. Mitigación: cargar via lazy module (ya lo es); revisar bundle tras integración; mover a vista separada si excede.
- **Colisión de tipo `Event` global.** Importar `Event` desde el módulo sombrearía el DOM `Event`. Mitigación: usar `EventItem` como nombre de la entidad (decisión tomada).
- **Soft-delete invisible para el usuario.** Click "Eliminar" no quita el bloque del calendario (queda con opacidad). Usuarios pueden pensar que el delete falló. Mitigación: snackbar "Evento marcado como eliminado" tras `DELETE` exitoso; toggle "Mostrar eliminados" visible y discoverable.
- **Edición de evento eliminado.** Si modal se abre sobre evento con `deletedAt !== null`, formulario es solo-lectura; usuario puede frustrarse sin entender por qué. Mitigación: banner explícito en header del modal y tooltip en bloques del calendario.
- **Cross-field validator `endDate ≥ startDate`.** Si usuario edita primero `endDate`, validator marca error hasta que ajusta `startDate`. Mitigación: marcar error a nivel de FormGroup y mostrar mensaje claro fuera de los inputs individuales.
- **`expectedAttendees = 0`.** Validador acepta 0; semánticamente raro para evento comercial. Mitigación: aceptar 0 (puede representar evento interno/recordatorio) y no añadir regla extra; revisar si negocio lo objeta.
- **Drift entre labels y enums.** Añadir status al backend sin actualizar `EVENT_STATUS_LABELS`/`COLORS` rompe la UI silenciosamente. Mitigación: mapas junto al type en `events.constants.ts`; review obligatorio si se toca uno.
- **Race conditions create/list.** `loadAll()` corriendo durante `POST` puede sobrescribir el optimistic push. Mitigación: no hacer `loadAll()` tras create/update; confiar en respuesta server y patchear signal.
- **Filtro por `visibleRange` puede ocultar eventos** si la lista lateral usa el mismo `filteredList()` que el calendario. Mitigación: decidir si la lista lateral respeta el rango visible (recomendado) o muestra todos los filtrados; documentar comportamiento.
