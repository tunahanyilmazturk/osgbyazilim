declare module 'react-big-calendar/lib/addons/dragAndDrop' {
  import { ComponentType } from 'react';
  import { CalendarProps } from 'react-big-calendar';

  export default function withDragAndDrop<T extends object = Record<string, unknown>>(
    component: ComponentType<CalendarProps<any>>
  ): ComponentType<CalendarProps<any> & T>;
}
