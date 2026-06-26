export type EventStatus =
    | 'draft'
    | 'confirmed'
    | 'in_progress'
    | 'completed'
    | 'cancelled';

export const EVENT_STATUS_VALUES: readonly EventStatus[] = [
    'draft',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
];

export interface EventItem {
    id: number;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    location: string;
    status: EventStatus;
    clientName: string;
    expectedAttendees: number;
    notes: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
}

export type EventCreatePayload = Omit<
    EventItem,
    'id' | 'createdAt' | 'updatedAt' | 'deletedAt'
>;

export type EventUpdatePayload = Partial<EventCreatePayload>;
