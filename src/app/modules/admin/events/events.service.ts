import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { EVENTS_API_BASE, EVENT_STATUS_COLORS } from 'app/modules/admin/events/events.constants';
import {
    EVENT_STATUS_VALUES,
    EventCreatePayload,
    EventItem,
    EventStatus,
    EventUpdatePayload,
} from 'app/modules/admin/events/events.types';
import { Observable, throwError } from 'rxjs';
import { catchError, finalize, map, tap } from 'rxjs/operators';

interface ApiEnvelope<T> {
    statusCode?: number;
    metaData?: unknown;
    count?: number;
    data: T;
}

function unwrapList<T>(res: ApiEnvelope<T[]> | T[]): T[] {
    if (Array.isArray(res)) {
        return res;
    }
    return Array.isArray(res?.data) ? res.data : [];
}

function unwrapOne<T>(res: ApiEnvelope<T> | T): T {
    if (res && typeof res === 'object' && 'data' in (res as object)) {
        return (res as ApiEnvelope<T>).data;
    }
    return res as T;
}

export interface CalendarEventInput {
    id: string;
    title: string;
    start: string;
    end: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    classNames: string[];
    extendedProps: {
        eventId: number;
        status: EventStatus;
        deleted: boolean;
    };
}

@Injectable({ providedIn: 'root' })
export class EventsService {
    private readonly _http = inject(HttpClient);

    readonly events = signal<EventItem[]>([]);
    readonly selectedId = signal<number | null>(null);
    readonly searchQuery = signal<string>('');
    readonly statusFilter = signal<Set<EventStatus>>(
        new Set<EventStatus>(EVENT_STATUS_VALUES),
    );
    readonly showDeleted = signal<boolean>(false);
    readonly visibleRange = signal<{ start: string; end: string } | null>(null);
    readonly loading = signal<boolean>(false);
    readonly error = signal<string | null>(null);

    readonly selected = computed<EventItem | null>(() => {
        const id = this.selectedId();
        if (id == null) {
            return null;
        }
        return this.events().find((e) => e.id === id) ?? null;
    });

    readonly filteredList = computed<EventItem[]>(() => {
        const query = this.searchQuery().trim().toLowerCase();
        const statuses = this.statusFilter();
        const showDeleted = this.showDeleted();
        const range = this.visibleRange();

        return this.events()
            .filter((e) => {
                if (!showDeleted && e.deletedAt !== null) {
                    return false;
                }
                if (!statuses.has(e.status)) {
                    return false;
                }
                if (query) {
                    const haystack = `${e.name} ${e.clientName} ${e.location}`.toLowerCase();
                    if (!haystack.includes(query)) {
                        return false;
                    }
                }
                if (range) {
                    const rs = new Date(range.start).getTime();
                    const re = new Date(range.end).getTime();
                    const es = new Date(e.startDate).getTime();
                    const ee = new Date(e.endDate).getTime();
                    if (ee < rs || es > re) {
                        return false;
                    }
                }
                return true;
            })
            .sort(
                (a, b) =>
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime(),
            );
    });

    readonly calendarEvents = computed<CalendarEventInput[]>(() =>
        this.filteredList().map((e) => {
            const color = EVENT_STATUS_COLORS[e.status];
            const deleted = e.deletedAt !== null;
            return {
                id: String(e.id),
                title: e.name,
                start: e.startDate,
                end: e.endDate,
                backgroundColor: color.bg,
                borderColor: color.border,
                textColor: color.text,
                classNames: deleted ? ['event-deleted'] : [],
                extendedProps: {
                    eventId: e.id,
                    status: e.status,
                    deleted,
                },
            };
        }),
    );

    readonly countsByStatus = computed<Record<EventStatus, number>>(() => {
        const counts: Record<EventStatus, number> = {
            draft: 0,
            confirmed: 0,
            in_progress: 0,
            completed: 0,
            cancelled: 0,
        };
        for (const e of this.filteredList()) {
            counts[e.status]++;
        }
        return counts;
    });

    setSearchQuery(value: string): void {
        this.searchQuery.set(value);
    }

    setStatusFilter(value: Set<EventStatus>): void {
        this.statusFilter.set(new Set(value));
    }

    toggleStatusFilter(status: EventStatus): void {
        const next = new Set(this.statusFilter());
        if (next.has(status)) {
            next.delete(status);
        } else {
            next.add(status);
        }
        this.statusFilter.set(next);
    }

    setShowDeleted(value: boolean): void {
        this.showDeleted.set(value);
    }

    setVisibleRange(range: { start: string; end: string } | null): void {
        this.visibleRange.set(range);
    }

    setSelectedId(id: number | null): void {
        this.selectedId.set(id);
    }

    loadAll(): Observable<EventItem[]> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .get<ApiEnvelope<EventItem[]> | EventItem[]>(`${EVENTS_API_BASE}/events`)
            .pipe(
                map((res) => unwrapList<EventItem>(res)),
                tap((list) => this.events.set(list)),
                catchError((err) => {
                    this.error.set('No se pudo cargar la lista de eventos.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    loadOne(id: number): Observable<EventItem> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .get<ApiEnvelope<EventItem> | EventItem>(`${EVENTS_API_BASE}/events/${id}`)
            .pipe(
                map((res) => unwrapOne<EventItem>(res)),
                tap((e) => this._upsert(e)),
                catchError((err) => {
                    this.error.set('No se pudo cargar el evento.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    create(payload: EventCreatePayload): Observable<EventItem> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .post<ApiEnvelope<EventItem> | EventItem>(
                `${EVENTS_API_BASE}/events`,
                payload,
            )
            .pipe(
                map((res) => unwrapOne<EventItem>(res)),
                tap((e) => {
                    this.events.update((list) => [...list, e]);
                    this.selectedId.set(e.id);
                }),
                catchError((err) => {
                    this.error.set('No se pudo crear el evento.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    update(id: number, payload: EventUpdatePayload): Observable<EventItem> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .patch<ApiEnvelope<EventItem> | EventItem>(
                `${EVENTS_API_BASE}/events/${id}`,
                payload,
            )
            .pipe(
                map((res) => unwrapOne<EventItem>(res)),
                tap((e) => this._upsert(e)),
                catchError((err) => {
                    this.error.set('No se pudo actualizar el evento.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    remove(id: number): Observable<EventItem> {
        this.loading.set(true);
        this.error.set(null);
        return this._http
            .delete<ApiEnvelope<EventItem> | EventItem>(
                `${EVENTS_API_BASE}/events/${id}`,
            )
            .pipe(
                map((res) => unwrapOne<EventItem>(res)),
                tap((e) => {
                    this.events.update((list) =>
                        list.map((it) =>
                            it.id === id
                                ? {
                                      ...it,
                                      deletedAt:
                                          e?.deletedAt ?? new Date().toISOString(),
                                  }
                                : it,
                        ),
                    );
                }),
                catchError((err) => {
                    this.error.set('No se pudo eliminar el evento.');
                    return throwError(() => err);
                }),
                finalize(() => this.loading.set(false)),
            );
    }

    private _upsert(e: EventItem): void {
        this.events.update((list) => {
            const idx = list.findIndex((x) => x.id === e.id);
            if (idx === -1) {
                return [...list, e];
            }
            const copy = list.slice();
            copy[idx] = e;
            return copy;
        });
    }
}
