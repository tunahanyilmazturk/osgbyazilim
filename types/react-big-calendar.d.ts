declare module "react-big-calendar" {
  import * as React from "react";

  // Minimal typings to satisfy TypeScript in this project
  export type View = "month" | "week" | "day" | "agenda" | string;

  export type SlotInfo = any;

  export interface CalendarProps<TEvent = any> extends React.HTMLAttributes<HTMLDivElement> {
    events?: TEvent[];
    date?: Date;
    view?: View;
    onView?: (view: View) => void;
    onNavigate?: (newDate: Date, view: View, action: any) => void;
    localizer: any;
    selectable?: boolean;
    resizable?: boolean;
    popup?: boolean;
    startAccessor?: string | ((event: TEvent) => Date);
    endAccessor?: string | ((event: TEvent) => Date);
    titleAccessor?: string | ((event: TEvent) => string);
    eventPropGetter?: (event: TEvent, start: Date, end: Date, isSelected: boolean) => {
      style?: React.CSSProperties;
      className?: string;
    };

    // Props used in this project (calendar/page.tsx)
    messages?: any;
    views?: View[] | { [K in View]?: boolean };
    step?: number;
    showMultiDayTimes?: boolean;
    formats?: any;
    draggableAccessor?: ((event: TEvent) => boolean) | string;
    onSelectEvent?: (event: TEvent, e: React.SyntheticEvent<HTMLElement>) => void;
    onSelectSlot?: (slotInfo: SlotInfo) => void;
    onEventDrop?: (args: { event: TEvent; start: Date; end: Date; allDay?: boolean }) => void;
    onEventResize?: (args: { event: TEvent; start: Date; end: Date; allDay?: boolean }) => void;
  }

  export const Calendar: React.ComponentType<CalendarProps>;

  export function momentLocalizer(moment: any): any;
}
