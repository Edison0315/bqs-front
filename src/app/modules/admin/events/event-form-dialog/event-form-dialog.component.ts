import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
    MAT_DIALOG_DATA,
    MatDialog,
    MatDialogModule,
    MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
    EVENT_DELETED_LABEL,
    EVENT_STATUS_COLORS,
    EVENT_STATUS_LABELS,
} from 'app/modules/admin/events/events.constants';
import { EventsService } from 'app/modules/admin/events/events.service';
import {
    EVENT_STATUS_VALUES,
    EventCreatePayload,
    EventItem,
    EventStatus,
    EventUpdatePayload,
} from 'app/modules/admin/events/events.types';

export interface EventFormDialogData {
    mode: 'create' | 'edit';
    id?: number;
    defaults?: Partial<EventItem>;
}

function endAfterStart(group: AbstractControl): ValidationErrors | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    if (!start || !end) {
        return null;
    }
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    if (isNaN(s) || isNaN(e)) {
        return null;
    }
    return e >= s ? null : { endBeforeStart: true };
}

function toInputValue(iso: string | undefined | null): string {
    if (!iso) {
        return '';
    }
    const d = new Date(iso);
    if (isNaN(d.getTime())) {
        return '';
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromInputValue(v: string): string {
    if (!v) {
        return '';
    }
    return new Date(v).toISOString();
}

@Component({
    selector: 'event-form-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatButtonModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatSelectModule,
    ],
    template: `
        <h2 mat-dialog-title class="flex items-center gap-2">
            <span>
                {{ mode === 'create' ? 'Nuevo evento' : 'Editar evento' }}
            </span>
            @if (deleted) {
                <span
                    class="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500 text-white"
                >
                    {{ deletedLabel }}
                </span>
            }
        </h2>

        <form [formGroup]="form" (ngSubmit)="save()">
            <mat-dialog-content class="flex flex-col gap-2">
                @if (deleted) {
                    <div class="text-sm text-secondary mb-2">
                        Este evento está eliminado y se muestra en modo solo
                        lectura.
                    </div>
                }

                <mat-form-field>
                    <mat-label>Nombre</mat-label>
                    <input matInput formControlName="name" />
                    @if (form.controls.name.hasError('required')) {
                        <mat-error>Requerido</mat-error>
                    }
                    @if (form.controls.name.hasError('minlength')) {
                        <mat-error>Mínimo 2 caracteres</mat-error>
                    }
                </mat-form-field>

                <mat-form-field>
                    <mat-label>Cliente</mat-label>
                    <input matInput formControlName="clientName" />
                    @if (form.controls.clientName.hasError('required')) {
                        <mat-error>Requerido</mat-error>
                    }
                    @if (form.controls.clientName.hasError('minlength')) {
                        <mat-error>Mínimo 2 caracteres</mat-error>
                    }
                </mat-form-field>

                <mat-form-field>
                    <mat-label>Ubicación</mat-label>
                    <input matInput formControlName="location" />
                    @if (form.controls.location.hasError('required')) {
                        <mat-error>Requerido</mat-error>
                    }
                    @if (form.controls.location.hasError('minlength')) {
                        <mat-error>Mínimo 2 caracteres</mat-error>
                    }
                </mat-form-field>

                <div class="flex flex-col sm:flex-row gap-2">
                    <mat-form-field class="flex-1">
                        <mat-label>Inicio</mat-label>
                        <input
                            matInput
                            type="datetime-local"
                            formControlName="startDate"
                        />
                        @if (form.controls.startDate.hasError('required')) {
                            <mat-error>Requerido</mat-error>
                        }
                    </mat-form-field>

                    <mat-form-field class="flex-1">
                        <mat-label>Fin</mat-label>
                        <input
                            matInput
                            type="datetime-local"
                            formControlName="endDate"
                        />
                        @if (form.controls.endDate.hasError('required')) {
                            <mat-error>Requerido</mat-error>
                        }
                    </mat-form-field>
                </div>

                @if (form.hasError('endBeforeStart')) {
                    <div class="text-red-600 text-sm">
                        La fecha de fin debe ser igual o posterior al inicio.
                    </div>
                }

                <div class="flex flex-col sm:flex-row gap-2">
                    <mat-form-field class="flex-1">
                        <mat-label>Estado</mat-label>
                        <mat-select formControlName="status">
                            @for (s of statusValues; track s) {
                                <mat-option [value]="s">
                                    <span
                                        class="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                                        [style.backgroundColor]="colors[s].bg"
                                    ></span>
                                    {{ labels[s] }}
                                </mat-option>
                            }
                        </mat-select>
                    </mat-form-field>

                    <mat-form-field class="flex-1">
                        <mat-label>Asistentes esperados</mat-label>
                        <input
                            matInput
                            type="number"
                            min="0"
                            step="1"
                            formControlName="expectedAttendees"
                        />
                        @if (form.controls.expectedAttendees.hasError('required')) {
                            <mat-error>Requerido</mat-error>
                        }
                        @if (form.controls.expectedAttendees.hasError('min')) {
                            <mat-error>Debe ser ≥ 0</mat-error>
                        }
                        @if (form.controls.expectedAttendees.hasError('pattern')) {
                            <mat-error>Entero</mat-error>
                        }
                    </mat-form-field>
                </div>

                <mat-form-field>
                    <mat-label>Descripción</mat-label>
                    <textarea
                        matInput
                        rows="2"
                        maxlength="2000"
                        formControlName="description"
                    ></textarea>
                </mat-form-field>

                <mat-form-field>
                    <mat-label>Notas</mat-label>
                    <textarea
                        matInput
                        rows="2"
                        maxlength="2000"
                        formControlName="notes"
                    ></textarea>
                </mat-form-field>

                @if (errorMessage) {
                    <div
                        class="rounded-md bg-red-50 text-red-800 px-3 py-2 text-sm"
                    >
                        {{ errorMessage }}
                    </div>
                }
            </mat-dialog-content>

            <mat-dialog-actions align="end">
                @if (mode === 'edit' && !deleted) {
                    <button
                        type="button"
                        mat-button
                        color="warn"
                        [disabled]="submitting"
                        (click)="remove()"
                    >
                        Eliminar
                    </button>
                }
                <button
                    type="button"
                    mat-button
                    [disabled]="submitting"
                    (click)="cancel()"
                >
                    {{ deleted ? 'Cerrar' : 'Cancelar' }}
                </button>
                @if (!deleted) {
                    <button
                        type="submit"
                        mat-flat-button
                        color="primary"
                        [disabled]="submitting || form.invalid"
                    >
                        Guardar
                    </button>
                }
            </mat-dialog-actions>
        </form>
    `,
})
export class EventFormDialogComponent {
    private readonly _fb = inject(FormBuilder);
    private readonly _service = inject(EventsService);
    private readonly _dialog = inject(MatDialog);
    private readonly _ref = inject(MatDialogRef<EventFormDialogComponent>);

    readonly statusValues: readonly EventStatus[] = EVENT_STATUS_VALUES;
    readonly labels: Record<EventStatus, string> = EVENT_STATUS_LABELS;
    readonly colors = EVENT_STATUS_COLORS;
    readonly deletedLabel = EVENT_DELETED_LABEL;

    readonly mode: 'create' | 'edit';
    readonly id: number | undefined;
    readonly deleted: boolean;

    submitting = false;
    errorMessage: string | null = null;

    readonly form = this._fb.group(
        {
            name: ['', [Validators.required, Validators.minLength(2)]],
            description: ['', [Validators.maxLength(2000)]],
            startDate: ['', [Validators.required]],
            endDate: ['', [Validators.required]],
            location: ['', [Validators.required, Validators.minLength(2)]],
            status: ['draft' as EventStatus, [Validators.required]],
            clientName: ['', [Validators.required, Validators.minLength(2)]],
            expectedAttendees: [
                0,
                [
                    Validators.required,
                    Validators.min(0),
                    Validators.pattern(/^-?\d+$/),
                ],
            ],
            notes: ['', [Validators.maxLength(2000)]],
        },
        { validators: [endAfterStart] },
    );

    constructor(
        @Inject(MAT_DIALOG_DATA) public readonly data: EventFormDialogData,
    ) {
        this.mode = data.mode;
        this.id = data.id;

        const existing =
            data.mode === 'edit' && data.id != null
                ? this._service.events().find((e) => e.id === data.id) ?? null
                : null;

        this.deleted = !!existing && existing.deletedAt !== null;

        const source: Partial<EventItem> = existing ?? data.defaults ?? {};

        this.form.patchValue({
            name: source.name ?? '',
            description: source.description ?? '',
            startDate: toInputValue(source.startDate ?? null),
            endDate: toInputValue(source.endDate ?? null),
            location: source.location ?? '',
            status: (source.status as EventStatus) ?? 'draft',
            clientName: source.clientName ?? '',
            expectedAttendees: source.expectedAttendees ?? 0,
            notes: source.notes ?? '',
        });

        if (this.deleted) {
            this.form.disable();
        }
    }

    save(): void {
        if (this.form.invalid || this.submitting || this.deleted) {
            return;
        }
        const v = this.form.getRawValue();
        const payload: EventCreatePayload = {
            name: (v.name ?? '').trim(),
            description: v.description ?? '',
            startDate: fromInputValue(v.startDate ?? ''),
            endDate: fromInputValue(v.endDate ?? ''),
            location: (v.location ?? '').trim(),
            status: v.status as EventStatus,
            clientName: (v.clientName ?? '').trim(),
            expectedAttendees: Number(v.expectedAttendees ?? 0),
            notes: v.notes ?? '',
        };

        this.submitting = true;
        this.errorMessage = null;

        if (this.mode === 'create') {
            this._service.create(payload).subscribe({
                next: (e) => {
                    this.submitting = false;
                    this._ref.close(e);
                },
                error: () => {
                    this.submitting = false;
                    this.errorMessage = 'No se pudo guardar el evento.';
                },
            });
        } else if (this.id != null) {
            const update: EventUpdatePayload = payload;
            this._service.update(this.id, update).subscribe({
                next: (e) => {
                    this.submitting = false;
                    this._ref.close(e);
                },
                error: () => {
                    this.submitting = false;
                    this.errorMessage = 'No se pudo guardar el evento.';
                },
            });
        }
    }

    remove(): void {
        if (this.id == null || this.submitting || this.deleted) {
            return;
        }
        const confirmRef = this._dialog.open(EventConfirmDeleteComponent, {
            width: '360px',
        });
        confirmRef.afterClosed().subscribe((ok) => {
            if (!ok || this.id == null) {
                return;
            }
            this.submitting = true;
            this.errorMessage = null;
            this._service.remove(this.id).subscribe({
                next: () => {
                    this.submitting = false;
                    this._ref.close({ deleted: true });
                },
                error: () => {
                    this.submitting = false;
                    this.errorMessage = 'No se pudo eliminar el evento.';
                },
            });
        });
    }

    cancel(): void {
        this._ref.close(null);
    }
}

@Component({
    selector: 'event-confirm-delete',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatDialogModule],
    template: `
        <h2 mat-dialog-title>Eliminar evento</h2>
        <mat-dialog-content>
            <p>¿Marcar este evento como eliminado?</p>
        </mat-dialog-content>
        <mat-dialog-actions align="end">
            <button mat-button [mat-dialog-close]="false">Cancelar</button>
            <button mat-flat-button color="warn" [mat-dialog-close]="true">
                Eliminar
            </button>
        </mat-dialog-actions>
    `,
})
export class EventConfirmDeleteComponent {}
