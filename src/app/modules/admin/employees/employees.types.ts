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

export interface Employee {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
    date_of_birth: string;
    document: string;
    hire_date: string;
    skills: EmployeeSkill[];
    languages: EmployeeLanguage[];
    status: EmployeeStatus;
    hourly_rate: number;
}

export type EmployeeCreatePayload = Omit<Employee, 'id'>;
export type EmployeeUpdatePayload = Partial<Omit<Employee, 'id'>>;

export type StatusFilter = EmployeeStatus | 'all';
