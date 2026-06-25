import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EMPLOYEES_API_BASE } from 'app/modules/admin/employees/employees.constants';
import {
    Employee,
    EmployeeCreatePayload,
    EmployeeStatus,
    EmployeeUpdatePayload,
    StatusFilter,
} from 'app/modules/admin/employees/employees.types';
import { Observable, switchMap, tap, throwError } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';

interface ApiEnvelope<T> {
    statusCode?: number;
    metaData?: unknown;
    count?: number;
    data: T;
}

interface ApiEmployee {
    id: number | string;
    fullName: string;
    email: string;
    phoneNumber: string;
    dateOfBirth: string;
    document: string;
    hireDate: string;
    skills: Employee['skills'];
    languages: Employee['languages'];
    status: EmployeeStatus;
    hourlyRate: string | number;
}

function fromApi(e: ApiEmployee): Employee {
    return {
        id: String(e.id),
        full_name: e.fullName,
        email: e.email,
        phone_number: e.phoneNumber,
        date_of_birth: e.dateOfBirth,
        document: e.document,
        hire_date: e.hireDate,
        skills: e.skills ?? [],
        languages: e.languages ?? [],
        status: e.status,
        hourly_rate: Number(e.hourlyRate),
    };
}

function toApi(p: EmployeeCreatePayload | EmployeeUpdatePayload): Partial<ApiEmployee> {
    const out: Partial<ApiEmployee> = {};
    if (p.full_name !== undefined) out.fullName = p.full_name;
    if (p.email !== undefined) out.email = p.email;
    if (p.phone_number !== undefined) out.phoneNumber = p.phone_number;
    if (p.date_of_birth !== undefined) out.dateOfBirth = p.date_of_birth;
    if (p.document !== undefined) out.document = p.document;
    if (p.hire_date !== undefined) out.hireDate = p.hire_date;
    if (p.skills !== undefined) out.skills = p.skills;
    if (p.languages !== undefined) out.languages = p.languages;
    if (p.status !== undefined) out.status = p.status;
    if (p.hourly_rate !== undefined) out.hourlyRate = p.hourly_rate;
    return out;
}

function unwrapList<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) return res;
    return Array.isArray(res?.data) ? res.data : [];
}

function unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    if (res && typeof res === 'object' && 'data' in (res as object)) {
        return (res as ApiEnvelope<T>).data;
    }
    return res as T;
}

@Injectable({ providedIn: 'root' })
export class EmployeesService {
    private readonly _http = inject(HttpClient);

    readonly employees = signal<Employee[]>([]);
    readonly selectedId = signal<string | null>(null);
    readonly searchQuery = signal<string>('');
    readonly statusFilter = signal<StatusFilter>('all');
    readonly loading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    readonly selected = computed<Employee | null>(() => {
        const id = this.selectedId();
        if (!id) {
            return null;
        }
        return this.employees().find((e) => e.id === id) ?? null;
    });

    readonly filteredList = computed<Employee[]>(() => {
        const list = this.employees();
        const query = this.searchQuery().trim().toLowerCase();
        const status = this.statusFilter();

        return list.filter((emp) => {
            if (status !== 'all' && emp.status !== status) {
                return false;
            }
            if (!query) {
                return true;
            }
            return (
                emp.full_name.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query) ||
                emp.document.toLowerCase().includes(query)
            );
        });
    });

    readonly activeCount = computed<number>(
        () => this.employees().filter((e) => e.status === 'active').length,
    );

    setSearchQuery(value: string): void {
        this.searchQuery.set(value);
    }

    setStatusFilter(value: StatusFilter): void {
        this.statusFilter.set(value);
    }

    setSelectedId(id: string | null): void {
        this.selectedId.set(id);
    }

    loadAll(): Observable<Employee[]> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .get<ApiEnvelope<ApiEmployee[]> | ApiEmployee[]>(EMPLOYEES_API_BASE)
            .pipe(
                map((res) => unwrapList<ApiEmployee>(res).map(fromApi)),
                tap((list) => this.employees.set(list)),
                catchError((err) => {
                    this.error.set('No se pudo cargar la lista de empleados.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    loadOne(id: string): Observable<Employee> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .get<ApiEnvelope<ApiEmployee> | ApiEmployee>(`${EMPLOYEES_API_BASE}/${id}`)
            .pipe(
                map((res) => fromApi(unwrapOne<ApiEmployee>(res))),
                tap((emp) => this._upsert(emp)),
                catchError((err) => {
                    this.error.set('No se pudo cargar el empleado.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    create(payload: EmployeeCreatePayload): Observable<Employee> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .post<ApiEnvelope<ApiEmployee> | ApiEmployee>(EMPLOYEES_API_BASE, toApi(payload))
            .pipe(
                map((res) => fromApi(unwrapOne<ApiEmployee>(res))),
                switchMap((emp) =>
                    this._refreshList().pipe(map(() => emp)),
                ),
                tap((emp) => this.selectedId.set(emp.id)),
                catchError((err) => {
                    this.error.set('No se pudo crear el empleado.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    update(id: string, payload: EmployeeUpdatePayload): Observable<Employee> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .patch<ApiEnvelope<ApiEmployee> | ApiEmployee>(`${EMPLOYEES_API_BASE}/${id}`, toApi(payload))
            .pipe(
                switchMap(() => this._fetchOne(id)),
                tap((emp) => this._upsert(emp)),
                switchMap((emp) => this._refreshList().pipe(map(() => emp))),
                catchError((err) => {
                    this.error.set('No se pudo actualizar el empleado.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    remove(id: string): Observable<void> {
        this.loading.set(true);
        this.error.set(null);
        return this._http.delete<void>(`${EMPLOYEES_API_BASE}/${id}`).pipe(
            switchMap(() => this._refreshList()),
            map(() => void 0),
            catchError((err) => {
                this.error.set('No se pudo eliminar el empleado.');
                return throwError(() => err);
            }),
            finalize(() => this.loading.set(false)),
        );
    }

    private _fetchOne(id: string): Observable<Employee> {
        return this._http
            .get<ApiEnvelope<ApiEmployee> | ApiEmployee>(`${EMPLOYEES_API_BASE}/${id}`)
            .pipe(map((res) => fromApi(unwrapOne<ApiEmployee>(res))));
    }

    private _refreshList(): Observable<Employee[]> {
        return this._http
            .get<ApiEnvelope<ApiEmployee[]> | ApiEmployee[]>(EMPLOYEES_API_BASE)
            .pipe(
                map((res) => unwrapList<ApiEmployee>(res).map(fromApi)),
                tap((list) => this.employees.set(list)),
            );
    }

    private _upsert(emp: Employee): void {
        this.employees.update((list) => {
            const idx = list.findIndex((e) => e.id === emp.id);
            if (idx === -1) {
                return [...list, emp];
            }
            const copy = list.slice();
            copy[idx] = emp;
            return copy;
        });
    }
}

export type { EmployeeStatus };
