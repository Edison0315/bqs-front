import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EmployeesService } from 'app/modules/admin/employees/employees.service';

@Component({
    selector: 'employees',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="flex flex-auto w-full">
            <router-outlet></router-outlet>
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
    imports: [RouterOutlet],
})
export class EmployeesComponent implements OnInit {
    private readonly _service = inject(EmployeesService);

    ngOnInit(): void {
        if (this._service.employees().length === 0) {
            this._service.loadAll().subscribe();
        }
    }
}
