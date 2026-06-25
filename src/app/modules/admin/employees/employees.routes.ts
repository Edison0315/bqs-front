import { Routes } from '@angular/router';
import { EmployeesComponent } from 'app/modules/admin/employees/employees.component';
import { EmployeeDetailsComponent } from 'app/modules/admin/employees/employee-details/employee-details.component';
import { EmployeeListComponent } from 'app/modules/admin/employees/employee-list/employee-list.component';

export default [
    {
        path: '',
        component: EmployeesComponent,
        children: [
            {
                path: '',
                component: EmployeeListComponent,
                children: [
                    {
                        path: 'new',
                        component: EmployeeDetailsComponent,
                    },
                    {
                        path: ':id',
                        component: EmployeeDetailsComponent,
                    },
                ],
            },
        ],
    },
] as Routes;
