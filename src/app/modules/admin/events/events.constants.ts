import { EventStatus } from 'app/modules/admin/events/events.types';

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
    draft: 'Borrador',
    confirmed: 'Confirmado',
    in_progress: 'En curso',
    completed: 'Completado',
    cancelled: 'Cancelado',
};

export const EVENT_STATUS_COLORS: Record<
    EventStatus,
    { bg: string; border: string; text: string; chip: string }
> = {
    draft: {
        bg: '#9ca3af',
        border: '#6b7280',
        text: '#ffffff',
        chip: 'gray',
    },
    confirmed: {
        bg: '#3b82f6',
        border: '#2563eb',
        text: '#ffffff',
        chip: 'blue',
    },
    in_progress: {
        bg: '#f59e0b',
        border: '#d97706',
        text: '#ffffff',
        chip: 'amber',
    },
    completed: {
        bg: '#10b981',
        border: '#059669',
        text: '#ffffff',
        chip: 'green',
    },
    cancelled: {
        bg: '#ef4444',
        border: '#dc2626',
        text: '#ffffff',
        chip: 'red',
    },
};

export const EVENT_DELETED_LABEL = 'Eliminado';
export const EVENT_DELETED_COLOR = '#64748b';

export const EVENTS_API_BASE = 'http://localhost:3000';
