import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    OnInit,
    inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
    CreateRequest,
    EventCalendarComponent,
} from 'app/modules/admin/events/event-calendar/event-calendar.component';
import {
    EventFormDialogComponent,
    EventFormDialogData,
} from 'app/modules/admin/events/event-form-dialog/event-form-dialog.component';
import { EventListComponent } from 'app/modules/admin/events/event-list/event-list.component';
import {
    EVENT_STATUS_COLORS,
    EVENT_STATUS_LABELS,
} from 'app/modules/admin/events/events.constants';
import { EventsService } from 'app/modules/admin/events/events.service';
import {
    EVENT_STATUS_VALUES,
    EventStatus,
} from 'app/modules/admin/events/events.types';
import { debounceTime } from 'rxjs/operators';

@Component({
    selector: 'events',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-col flex-auto w-full h-full bg-card dark:bg-default">
            <!-- Toolbar -->
            <div class="flex flex-col gap-3 px-6 py-4 border-b">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex-1 text-2xl font-semibold tracking-tight">
                        Eventos
                    </div>
                    @if (service.loading()) {
                        <div class="text-secondary text-sm">Cargando…</div>
                    }
                    <button
                        type="button"
                        mat-flat-button
                        color="primary"
                        (click)="openCreate()"
                    >
                        Nuevo
                    </button>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <mat-form-field
                        appearance="fill"
                        class="w-full sm:w-72"
                        subscriptSizing="dynamic"
                    >
                        <mat-label>Buscar</mat-label>
                        <input
                            matInput
                            type="search"
                            placeholder="Nombre, cliente, ubicación"
                            [formControl]="searchControl"
                        />
                    </mat-form-field>

                    <div class="flex flex-wrap items-center gap-2">
                        @for (s of statusValues; track s) {
                            <button
                                type="button"
                                class="text-xs font-medium px-3 py-1 rounded-full border transition-colors"
                                [style.backgroundColor]="
                                    isActive(s) ? colors[s].bg : 'transparent'
                                "
                                [style.borderColor]="colors[s].bg"
                                [style.color]="
                                    isActive(s) ? colors[s].text : colors[s].bg
                                "
                                (click)="toggleStatus(s)"
                            >
                                {{ labels[s] }}
                                ({{ counts()[s] }})
                            </button>
                        }
                    </div>

                    <mat-slide-toggle
                        [checked]="service.showDeleted()"
                        (change)="service.setShowDeleted($event.checked)"
                    >
                        Mostrar eliminados
                    </mat-slide-toggle>
                </div>
            </div>

            @if (service.error(); as err) {
                <div
                    class="mx-6 my-3 rounded-md bg-red-50 text-red-800 px-4 py-2 text-sm"
                >
                    {{ err }}
                </div>
            }

            <!-- Grid: calendar + side list -->
            <div class="flex flex-col lg:flex-row flex-auto min-h-0">
                <div class="lg:basis-[70%] flex-auto min-h-0 p-4">
                    <event-calendar
                        (createRequested)="onCreateRequested($event)"
                        (editRequested)="onEditRequested($event)"
                    ></event-calendar>
                </div>
                <div
                    class="lg:basis-[30%] flex-none border-l overflow-y-auto p-4"
                >
                    <event-list
                        (editRequested)="onEditRequested($event)"
                    ></event-list>
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            :host {
                display: flex;
                flex: 1 1 auto;
                width: 100%;
                height: 100%;
            }
        `,
    ],
    imports: [
        EventCalendarComponent,
        EventListComponent,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSlideToggleModule,
        ReactiveFormsModule,
    ],
})
export class EventsComponent implements OnInit {
    readonly service = inject(EventsService);
    private readonly _dialog = inject(MatDialog);
    private readonly _destroyRef = inject(DestroyRef);

    readonly statusValues: readonly EventStatus[] = EVENT_STATUS_VALUES;
    readonly labels: Record<EventStatus, string> = EVENT_STATUS_LABELS;
    readonly colors = EVENT_STATUS_COLORS;
    readonly counts = this.service.countsByStatus;

    readonly searchControl = new FormControl<string>('', { nonNullable: true });

    ngOnInit(): void {
        this.searchControl.setValue(this.service.searchQuery(), {
            emitEvent: false,
        });

        this.searchControl.valueChanges
            .pipe(debounceTime(200), takeUntilDestroyed(this._destroyRef))
            .subscribe((v) => this.service.setSearchQuery(v ?? ''));

        if (this.service.events().length === 0) {
            this.service.loadAll().subscribe({ error: () => void 0 });
        }
    }

    isActive(s: EventStatus): boolean {
        return this.service.statusFilter().has(s);
    }

    toggleStatus(s: EventStatus): void {
        this.service.toggleStatusFilter(s);
    }

    openCreate(): void {
        this._openDialog({ mode: 'create' });
    }

    onCreateRequested(req: CreateRequest): void {
        this._openDialog({
            mode: 'create',
            defaults: { startDate: req.startDate, endDate: req.endDate },
        });
    }

    onEditRequested(id: number): void {
        this._openDialog({ mode: 'edit', id });
    }

    private _openDialog(data: EventFormDialogData): void {
        this._dialog.open(EventFormDialogComponent, {
            data,
            width: '640px',
            maxWidth: '95vw',
        });
    }
}
