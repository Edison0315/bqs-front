# 01 — Employee management

- **State:** Approved
- **Date:** 2026-06-25
- **Dependencies:** none (first spec)
- **Objective:** CRUD for employees (list, view, create, edit, soft-delete) against REST backend at `localhost:3000`, inside authenticated layout, state managed with Angular Signals.

## Scope

### In
- New lazy module at `src/app/modules/admin/employees/` under authenticated layout.
- Master-detail view (list on the left, detail/edit pane on the right) following Fuse `contacts` pattern.
- Operations:
  - List all employees (`GET /employees`, no pagination, no server-side search/filter).
  - Client-side search box (filters loaded list by `full_name`, `email`, `document`).
  - Client-side filter by `status` (active/inactive/all).
  - View employee detail (`GET /employees/:id`).
  - Create employee (`POST /employees`).
  - Edit employee (`PUT /employees/:id`).
  - Soft-delete employee (`DELETE /employees/:id` — server handles soft-delete internally).
- Reactive form with validation rules agreed in clarification phase.
- Multi-select inputs for `skills` and `languages` (fixed enums).
- State managed with Angular Signals (`signal`, `computed`); HTTP responses converted via `toSignal` or imperative `.set()`.
- New navigation entry "Empleados" with `heroicons_outline:users` icon.
- `EmployeesService` abstracting HTTP calls (single source of truth for the signal store).

### Not in
- Authentication/authorization changes (auth exists but unused; no role gating).
- Server-side pagination, sorting, or searching.
- Bulk operations (multi-select delete, import/export).
- Audit log / change history.
- Avatar / file upload.
- i18n via Transloco keys (UI labels hardcoded in Spanish).
- Relations to other entities (department, manager, branch).
- Unit/E2E tests (project has `skipTests: true` by default; no specs added here).
- Hard delete or undelete UI.

## Data model

### Enums

```ts
// src/app/modules/admin/employees/employees.types.ts

export type EmployeeSkill =
  | 'waiter'
  | 'kitchen_staff'
  | 'room_coordinator'
  | 'receptionist';

export type EmployeeLanguage =
  | 'spanish'
  | 'english'
  | 'catalan'
  | 'portuguese'
  | 'french'
  | 'italian';

export type EmployeeStatus = 'active' | 'inactive';
```

### Entity

```ts
export interface Employee {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  date_of_birth: string;      // ISO yyyy-MM-DD
  document: string;           // e.g. "2134324E"
  hire_date: string;          // ISO yyyy-MM-DD
  skills: EmployeeSkill[];    // min length 1
  languages: EmployeeLanguage[]; // min length 1
  status: EmployeeStatus;
  hourly_rate: number;        // decimal, > 0
}

export type EmployeeCreatePayload = Omit<Employee, 'id'>;
export type EmployeeUpdatePayload = Partial<Omit<Employee, 'id'>>;
```

### Validation rules (reactive form)

| Field           | Rule                                                |
|-----------------|-----------------------------------------------------|
| `full_name`     | required, trim, min 2 chars                         |
| `email`         | required, `Validators.email`                        |
| `phone_number`  | required, free string, min 4 chars                  |
| `date_of_birth` | required, valid date, ≤ today                       |
| `document`      | required, trim, min 3 chars                         |
| `hire_date`     | required, valid date, ≤ today                       |
| `skills`        | required, array length ≥ 1                          |
| `languages`     | required, array length ≥ 1                          |
| `status`        | required, enum value                                |
| `hourly_rate`   | required, number > 0                                |

### Signal store shape (inside `EmployeesService`)

```ts
readonly employees     = signal<Employee[]>([]);
readonly selectedId    = signal<string | null>(null);
readonly searchQuery   = signal<string>('');
readonly statusFilter  = signal<EmployeeStatus | 'all'>('all');
readonly loading       = signal<boolean>(false);
readonly error         = signal<string | null>(null);

readonly selected       = computed(() => /* lookup by selectedId */);
readonly filteredList   = computed(() => /* apply searchQuery + statusFilter */);
readonly activeCount    = computed(() => /* count status === 'active' */);
```

### UI labels (Spanish, hardcoded)

| Key                 | Label                |
|---------------------|----------------------|
| `waiter`            | Camarero             |
| `kitchen_staff`     | Personal de cocina   |
| `room_coordinator`  | Coordinador de sala  |
| `receptionist`      | Recepcionista        |
| `spanish`           | Español              |
| `english`           | Inglés               |
| `catalan`           | Catalán              |
| `portuguese`        | Portugués            |
| `french`            | Francés              |
| `italian`           | Italiano             |
| `active`            | Activo               |
| `inactive`          | Inactivo             |

## Implementation plan

Each step leaves the app compiling and runnable.

1. **Types & constants**
   - Create `src/app/modules/admin/employees/employees.types.ts` with enums, `Employee`, payload types.
   - Create `employees.constants.ts` with label maps (skills, languages, status) for Spanish UI.

2. **Service with signal store**
   - Create `employees.service.ts` (`providedIn: 'root'`).
   - Inject `HttpClient`, base URL `http://localhost:3000`.
   - Signals: `employees`, `selectedId`, `searchQuery`, `statusFilter`, `loading`, `error`.
   - Computed: `selected`, `filteredList`, `activeCount`.
   - Methods (return `Observable` but also patch signals on success):
     - `loadAll()` → `GET /employees`
     - `loadOne(id)` → `GET /employees/:id`
     - `create(payload)` → `POST /employees`
     - `update(id, payload)` → `PUT /employees/:id`
     - `remove(id)` → `DELETE /employees/:id` (server soft-deletes; refresh list after).

3. **Routes & lazy module**
   - Add `employees.routes.ts` exporting standalone routes: `''` (list+detail container), `:id` (detail), `new` (create form).
   - Wire `loadChildren` in `app.routes.ts` under the authenticated admin tree, path `employees`.

4. **List component (master pane)**
   - `employee-list.component.ts` standalone, signal-driven.
   - Renders `filteredList()`, search input bound to `searchQuery`, status filter chip group bound to `statusFilter`.
   - Row click → router navigate to `employees/:id`.
   - "New" button → navigate to `employees/new`.
   - Empty state + loading state from signals.

5. **Detail/edit component (detail pane)**
   - `employee-details.component.ts` standalone.
   - Reads `id` from route, calls `loadOne` (or reads from store cache).
   - Reactive form with all validators from data model section.
   - Multi-select Material chips/select for `skills` and `languages` (using label map).
   - Buttons: Save (calls `update`), Delete (confirm dialog → `remove`), Cancel (revert form from signal).

6. **Create form**
   - Reuse `employee-details.component.ts` in "create" mode (route `new`); on save call `create`, then navigate to new id.

7. **Container layout**
   - `employees.component.ts` master-detail shell mirroring Fuse `contacts.component.ts` (sidenav + outlet).
   - Triggers `loadAll()` on init via `effect()` or `ngOnInit`.

8. **Navigation entry**
   - Edit `src/app/mock-api/common/navigation/data.ts`: add item with `id: 'employees'`, `title: 'Empleados'`, `type: 'basic'`, `icon: 'heroicons_outline:users'`, `link: '/employees'`.
   - Add to `default`, `compact`, `futuristic`, `horizontal` arrays so it shows in every layout variant.

9. **Wire and smoke-test**
   - `npm start`, log in (or bypass via existing mock), navigate to Empleados, verify list loads from `localhost:3000`, create/edit/delete round-trip.

## Acceptance criteria

- [ ] Navigation menu shows "Empleados" entry with users icon in default layout.
- [ ] Clicking the entry routes to `/employees` inside the authenticated layout.
- [ ] On load, `GET http://localhost:3000/employees` fires exactly once and populates the list.
- [ ] List renders every employee returned by the API with at least `full_name`, `email`, `status`.
- [ ] Search input filters the rendered list by `full_name`, `email`, or `document` (case-insensitive, client-side).
- [ ] Status filter (active / inactive / all) hides/shows rows accordingly without re-fetching.
- [ ] Selecting a row navigates to `/employees/:id` and shows the detail form populated with that employee.
- [ ] "Nuevo" button navigates to `/employees/new` with an empty form.
- [ ] Save on create calls `POST /employees`, then navigates to the new record's detail route.
- [ ] Save on edit calls `PUT /employees/:id` and updates the row in the list signal without a full reload.
- [ ] Delete button shows confirm dialog; on accept calls `DELETE /employees/:id` and refreshes the list.
- [ ] All validators from the data model section block submit and display field-level errors.
- [ ] `skills` and `languages` inputs allow multi-select, require at least one, and render Spanish labels.
- [ ] Loading and error signals visibly reflect HTTP state (spinner / error banner).
- [ ] No RxJS `BehaviorSubject` or `Subject` used for state; all reactive state goes through `signal` / `computed`.
- [ ] All identifiers, file names, and comments are in English; only user-facing labels and data are in Spanish.
- [ ] `npm run build` succeeds without new errors or budget violations.

## Decisions taken and discarded

### Taken

- **Real backend over MockApi.** Endpoints hit `http://localhost:3000` directly. Reason: backend already exists, no need to maintain mock handlers in parallel.
- **Signals over RxJS for state.** `EmployeesService` exposes `signal`/`computed`; HTTP still returns `Observable` but results are pushed into signals. Reason: explicit user requirement, aligns with Angular 19 direction.
- **Soft-delete via `DELETE` verb.** Server interprets `DELETE /employees/:id` as status change to `inactive`. Front never sends `PATCH {status:'inactive'}`. Reason: keeps front API surface RESTful and server owns the semantic.
- **Master-detail layout (Fuse `contacts` pattern).** Reason: precedent exists in template, lowers cost.
- **Client-side search and status filter.** Backend has no query params, list is expected small. Reason: backend constraint + simplicity.
- **Code in English, data and UI labels in Spanish.** Hardcoded label maps, no Transloco keys. Reason: explicit user requirement, no multi-language need yet.
- **No tests in this spec.** Reason: project default is `skipTests: true`; testing strategy deferred.
- **Navigation entry added to every layout variant** (default/compact/futuristic/horizontal). Reason: avoid invisible menu when user switches layout.

### Discarded

- **MockApi handlers for employees.** Discarded because real backend exists.
- **Role-based access (RRHH gate).** Out of scope; current auth is unused per user.
- **Server-side pagination/search.** Backend does not support it; revisit when dataset grows.
- **Transloco i18n for new labels.** Single-language requirement; adding keys now would be premature.
- **Bulk actions, import/export, audit history, avatar upload.** Out of MVP scope.
- **Reusing Fuse `user-list` table style.** Discarded in favor of master-detail (more idiomatic for editing).
- **Separate `is_deleted` / `deleted_at` field.** Discarded; `status='inactive'` is the single source of truth.

## Identified risks

- **CORS at `localhost:3000`.** Dev server runs on `localhost:4200`; backend must allow it or front needs proxy config (`proxy.conf.json` + `ng serve --proxy-config`). Mitigation: confirm backend CORS on first run; add proxy file if blocked.
- **No pagination + growing dataset.** Loading all employees client-side degrades once list exceeds a few hundred rows. Mitigation: revisit with a follow-up spec adding server-side pagination when needed.
- **Auth disabled but layout requires it.** `AuthGuard` lives on the admin tree; if guard rejects unauthenticated users the route is unreachable. Mitigation: verify guard behavior or bypass in dev; do not remove guard in this spec.
- **Soft-delete invisibility.** `DELETE` returns success but record reappears in list as `inactive`. Users may think delete failed. Mitigation: after delete, force `loadAll()` and surface a toast "Empleado marcado como inactivo".
- **Hardcoded Spanish labels drift.** Enum values change → label maps go stale silently. Mitigation: keep maps in `employees.constants.ts` next to the type definitions; reviewers must update both.
- **Backend schema mismatch.** Endpoint might return different field names (camelCase vs snake_case). Mitigation: validate response shape against `Employee` interface on first integration; adjust DTO/mapper if needed.
- **Signal store memory staleness.** After create/update, server may return modified fields (timestamps, derived). Mitigation: replace store entry with server response, not with local form value.
