import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterOutlet } from '@angular/router';
import {
    STATUS_LABELS,
    STATUS_OPTIONS,
} from 'app/modules/admin/employees/employees.constants';
import { EmployeesService } from 'app/modules/admin/employees/employees.service';
import { Employee, StatusFilter } from 'app/modules/admin/employees/employees.types';

@Component({
    selector: 'employee-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './employee-list.component.html',
    imports: [
        CommonModule,
        FormsModule,
        RouterOutlet,
        MatButtonModule,
        MatButtonToggleModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatProgressSpinnerModule,
    ],
})
export class EmployeeListComponent {
    private readonly _router = inject(Router);
    readonly service = inject(EmployeesService);

    readonly statusOptions = STATUS_OPTIONS;
    readonly statusLabels = STATUS_LABELS;

    onSearch(value: string): void {
        this.service.setSearchQuery(value ?? '');
    }

    onStatusFilter(value: StatusFilter): void {
        this.service.setStatusFilter(value);
    }

    openEmployee(emp: Employee): void {
        this.service.setSelectedId(emp.id);
        this._router.navigate(['/employees', emp.id]);
    }

    createNew(): void {
        this.service.setSelectedId(null);
        this._router.navigate(['/employees', 'new']);
    }

    trackById(_index: number, emp: Employee): string {
        return emp.id;
    }
}
