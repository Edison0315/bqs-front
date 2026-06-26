import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Output,
    ViewChild,
    computed,
    effect,
    inject,
} from '@angular/core';
import { FullCalendarComponent, FullCalendarModule } from '@fullcalendar/angular';
import {
    CalendarOptions,
    DateSelectArg,
    DatesSetArg,
    EventClickArg,
} from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import { EventsService } from 'app/modules/admin/events/events.service';

export interface CreateRequest {
    startDate: string;
    endDate: string;
}

@Component({
    selector: 'event-calendar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FullCalendarModule],
    template: `
        <full-calendar #fc [options]="options()"></full-calendar>
    `,
    styles: [
        `
            :host {
                display: block;
                width: 100%;
                height: 100%;
            }

            ::ng-deep .event-deleted {
                opacity: 0.5;
                border-style: dashed !important;
            }

            ::ng-deep .fc {
                height: 100%;
            }
        `,
    ],
})
export class EventCalendarComponent {
    private readonly _service = inject(EventsService);

    @Output() readonly createRequested = new EventEmitter<CreateRequest>();
    @Output() readonly editRequested = new EventEmitter<number>();

    @ViewChild('fc') private _fc?: FullCalendarComponent;

    constructor() {
        effect(() => {
            const events = this._service.calendarEvents();
            const api = this._fc?.getApi();
            if (!api) {
                return;
            }
            api.removeAllEvents();
            for (const e of events) {
                api.addEvent(e);
            }
        });
    }

    readonly options = computed<CalendarOptions>(() => ({
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'dayGridMonth',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek',
        },
        height: '100%',
        editable: false,
        selectable: true,
        dateClick: (arg: DateClickArg) => this._onDateClick(arg),
        select: (arg: DateSelectArg) => this._onSelect(arg),
        eventClick: (arg: EventClickArg) => this._onEventClick(arg),
        datesSet: (arg: DatesSetArg) => this._onDatesSet(arg),
    }));

    private _onDateClick(arg: DateClickArg): void {
        const start = arg.date;
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        this.createRequested.emit({
            startDate: start.toISOString(),
            endDate: end.toISOString(),
        });
    }

    private _onSelect(arg: DateSelectArg): void {
        this.createRequested.emit({
            startDate: arg.start.toISOString(),
            endDate: arg.end.toISOString(),
        });
    }

    private _onEventClick(arg: EventClickArg): void {
        const props = arg.event.extendedProps as { eventId?: number };
        if (props.eventId != null) {
            this.editRequested.emit(props.eventId);
        }
    }

    private _onDatesSet(arg: DatesSetArg): void {
        this._service.setVisibleRange({
            start: arg.start.toISOString(),
            end: arg.end.toISOString(),
        });
    }
}
