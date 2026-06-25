import {
    EmployeeLanguage,
    EmployeeSkill,
    EmployeeStatus,
} from 'app/modules/admin/employees/employees.types';

export const SKILL_LABELS: Record<EmployeeSkill, string> = {
    waiter: 'Camarero',
    kitchen_staff: 'Personal de cocina',
    room_coordinator: 'Coordinador de sala',
    receptionist: 'Recepcionista',
};

export const LANGUAGE_LABELS: Record<EmployeeLanguage, string> = {
    spanish: 'Español',
    english: 'Inglés',
    catalan: 'Catalán',
    portuguese: 'Portugués',
    french: 'Francés',
    italian: 'Italiano',
};

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
    active: 'Activo',
    inactive: 'Inactivo',
};

export const SKILL_OPTIONS: EmployeeSkill[] = [
    'waiter',
    'kitchen_staff',
    'room_coordinator',
    'receptionist',
];

export const LANGUAGE_OPTIONS: EmployeeLanguage[] = [
    'spanish',
    'english',
    'catalan',
    'portuguese',
    'french',
    'italian',
];

export const STATUS_OPTIONS: EmployeeStatus[] = ['active', 'inactive'];

export const EMPLOYEES_API_BASE = 'http://localhost:3000/employees';
