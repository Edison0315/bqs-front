import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    OnDestroy,
    OnInit,
    computed,
    inject,
    signal,
} from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import {
    LANGUAGE_LABELS,
    LANGUAGE_OPTIONS,
    SKILL_LABELS,
    SKILL_OPTIONS,
    STATUS_LABELS,
    STATUS_OPTIONS,
} from 'app/modules/admin/employees/employees.constants';
import { EmployeesService } from 'app/modules/admin/employees/employees.service';
import {
    Employee,
    EmployeeCreatePayload,
} from 'app/modules/admin/employees/employees.types';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'employee-details',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './employee-details.component.html',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatDatepickerModule,
        MatDialogModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
    ],
})
export class EmployeeDetailsComponent implements OnInit, OnDestroy {
    private readonly _fb = inject(FormBuilder);
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _confirm = inject(FuseConfirmationService);
    private readonly _dialog = inject(MatDialog);
    readonly service = inject(EmployeesService);

    private readonly _destroy$ = new Subject<void>();

    readonly skillOptions = SKILL_OPTIONS;
    readonly languageOptions = LANGUAGE_OPTIONS;
    readonly statusOptions = STATUS_OPTIONS;
    readonly skillLabels = SKILL_LABELS;
    readonly languageLabels = LANGUAGE_LABELS;
    readonly statusLabels = STATUS_LABELS;

    readonly isCreateMode = signal<boolean>(false);
    readonly currentId = signal<string | null>(null);

    readonly today = new Date();

    form: FormGroup = this._fb.group({
        full_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone_number: ['', [Validators.required, Validators.minLength(4)]],
        date_of_birth: [null, [Validators.required, this._maxToday]],
        document: ['', [Validators.required, Validators.minLength(3)]],
        hire_date: [null, [Validators.required, this._maxToday]],
        skills: [[], [Validators.required, this._minArrayLength(1)]],
        languages: [[], [Validators.required, this._minArrayLength(1)]],
        status: ['active', [Validators.required]],
        hourly_rate: [null, [Validators.required, Validators.min(0.0001)]],
    });

    readonly title = computed(() =>
        this.isCreateMode() ? 'Nuevo empleado' : 'Editar empleado',
    );

    ngOnInit(): void {
        this._route.params
            .pipe(takeUntil(this._destroy$))
            .subscribe((params) => {
                const id = params['id'] as string | undefined;
                if (!id || id === 'new') {
                    this.isCreateMode.set(true);
                    this.currentId.set(null);
                    this.service.setSelectedId(null);
                    this._resetEmpty();
                    return;
                }
                this.isCreateMode.set(false);
                this.currentId.set(id);
                this.service.setSelectedId(id);

                const cached = this.service
                    .employees()
                    .find((e) => e.id === id);
                if (cached) {
                    this._patchForm(cached);
                } else {
                    this.service.loadOne(id).subscribe((emp) => this._patchForm(emp));
                }
            });
    }

    ngOnDestroy(): void {
        this._destroy$.next();
        this._destroy$.complete();
    }

    save(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        const value = this._serialize();

        if (this.isCreateMode()) {
            this.service.create(value).subscribe((emp) => {
                this._router.navigate(['/employees', emp.id]);
            });
        } else {
            const id = this.currentId();
            if (!id) {
                return;
            }
            this.service.update(id, value).subscribe((emp) => this._patchForm(emp));
        }
    }

    cancel(): void {
        if (this.isCreateMode()) {
            this._router.navigate(['/employees']);
            return;
        }
        const id = this.currentId();
        const cached = id
            ? this.service.employees().find((e) => e.id === id)
            : null;
        if (cached) {
            this._patchForm(cached);
        }
    }

    remove(): void {
        const id = this.currentId();
        if (!id) {
            return;
        }
        const ref = this._confirm.open({
            title: 'Eliminar empleado',
            message:
                '¿Seguro que quieres eliminar este empleado? Quedará marcado como inactivo.',
            actions: {
                confirm: { label: 'Eliminar', color: 'warn' },
                cancel: { label: 'Cancelar' },
            },
        });
        ref.afterClosed().subscribe((result) => {
            if (result !== 'confirmed') {
                return;
            }
            this.service.remove(id).subscribe(() => {
                this.service.loadAll().subscribe();
                this._router.navigate(['/employees']);
            });
        });
    }

    private _patchForm(emp: Employee): void {
        this.form.reset({
            full_name: emp.full_name,
            email: emp.email,
            phone_number: emp.phone_number,
            date_of_birth: emp.date_of_birth ? new Date(emp.date_of_birth) : null,
            document: emp.document,
            hire_date: emp.hire_date ? new Date(emp.hire_date) : null,
            skills: emp.skills ?? [],
            languages: emp.languages ?? [],
            status: emp.status,
            hourly_rate: emp.hourly_rate,
        });
    }

    private _resetEmpty(): void {
        this.form.reset({
            full_name: '',
            email: '',
            phone_number: '',
            date_of_birth: null,
            document: '',
            hire_date: null,
            skills: [],
            languages: [],
            status: 'active',
            hourly_rate: null,
        });
    }

    private _serialize(): EmployeeCreatePayload {
        const v = this.form.value;
        return {
            full_name: (v.full_name ?? '').trim(),
            email: (v.email ?? '').trim(),
            phone_number: (v.phone_number ?? '').trim(),
            date_of_birth: this._toIsoDate(v.date_of_birth),
            document: (v.document ?? '').trim(),
            hire_date: this._toIsoDate(v.hire_date),
            skills: v.skills ?? [],
            languages: v.languages ?? [],
            status: v.status,
            hourly_rate: Number(v.hourly_rate),
        };
    }

    private _toIsoDate(value: unknown): string {
        if (!value) {
            return '';
        }
        // Luxon DateTime support
        const anyVal = value as { toISODate?: () => string; toISOString?: () => string };
        if (typeof anyVal.toISODate === 'function') {
            return anyVal.toISODate();
        }
        const d = value instanceof Date ? value : new Date(value as string);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    private _maxToday(control: { value: unknown }) {
        const v = control.value;
        if (!v) {
            return null;
        }
        const d =
            v instanceof Date
                ? v
                : typeof (v as { toJSDate?: () => Date }).toJSDate === 'function'
                  ? (v as { toJSDate: () => Date }).toJSDate()
                  : new Date(v as string);
        if (isNaN(d.getTime())) {
            return { invalidDate: true };
        }
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d.getTime() > today.getTime() ? { maxToday: true } : null;
    }

    private _minArrayLength(min: number) {
        return (control: { value: unknown }) => {
            const arr = (control.value ?? []) as unknown[];
            return Array.isArray(arr) && arr.length >= min
                ? null
                : { minArrayLength: { required: min } };
        };
    }
}
