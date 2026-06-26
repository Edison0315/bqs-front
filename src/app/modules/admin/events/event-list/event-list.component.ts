import { DatePipe } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
    inject,
} from '@angular/core';
import {
    EVENT_DELETED_LABEL,
    EVENT_STATUS_COLORS,
    EVENT_STATUS_LABELS,
} from 'app/modules/admin/events/events.constants';
import { EventsService } from 'app/modules/admin/events/events.service';
import { EventItem, EventStatus } from 'app/modules/admin/events/events.types';

@Component({
    selector: 'event-list',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe],
    template: `
        <div class="flex flex-col gap-2">
            <div class="text-sm text-secondary font-medium mb-1">
                {{ service.filteredList().length }} eventos
            </div>

            @for (e of service.filteredList(); track e.id) {
                <button
                    type="button"
                    class="text-left rounded-md border px-3 py-2 hover:bg-hover transition-colors"
                    [class.opacity-60]="e.deletedAt !== null"
                    [class.border-dashed]="e.deletedAt !== null"
                    (click)="editRequested.emit(e.id)"
                >
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-medium truncate">{{ e.name }}</div>
                        <span
                            class="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                            [style.backgroundColor]="colors[e.status].bg"
                            [style.color]="colors[e.status].text"
                        >
                            {{ labels[e.status] }}
                        </span>
                    </div>
                    <div class="text-xs text-secondary mt-1">
                        {{ e.startDate | date: 'short' }}
                    </div>
                    @if (e.clientName || e.location) {
                        <div class="text-xs text-secondary truncate">
                            {{ e.clientName }}
                            @if (e.clientName && e.location) {
                                ·
                            }
                            {{ e.location }}
                        </div>
                    }
                    @if (e.deletedAt !== null) {
                        <div
                            class="inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-500 text-white"
                        >
                            {{ deletedLabel }}
                        </div>
                    }
                </button>
            } @empty {
                <div class="text-secondary text-sm">
                    Sin eventos para el filtro actual.
                </div>
            }
        </div>
    `,
})
export class EventListComponent {
    readonly service = inject(EventsService);
    readonly labels: Record<EventStatus, string> = EVENT_STATUS_LABELS;
    readonly colors = EVENT_STATUS_COLORS;
    readonly deletedLabel = EVENT_DELETED_LABEL;

    @Output() readonly editRequested = new EventEmitter<number>();

    trackById(_: number, e: EventItem): number {
        return e.id;
    }
}
