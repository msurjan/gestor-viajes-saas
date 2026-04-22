'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin     from '@fullcalendar/daygrid'
import listPlugin        from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import multiMonthPlugin  from '@fullcalendar/multimonth'
import type { EventClickArg, EventInput } from '@fullcalendar/core'

interface Props {
  events:       EventInput[]
  onEventClick: (arg: EventClickArg) => void
}

export default function CalendarioWrapper({ events, onEventClick }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, listPlugin, interactionPlugin, multiMonthPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left:   'prev,next today',
        center: 'title',
        right:  'multiMonthYear,dayGridMonth,listMonth',
      }}
      buttonText={{
        today: 'Hoy',
        month: 'Mes',
        list:  'Lista',
        year:  'Año',
      }}
      views={{
        multiMonthYear: {
          type:               'multiMonth',
          duration:           { months: 12 },
          multiMonthMinWidth: 220,
          multiMonthMaxColumns: 3,
          dayMaxEvents:       2,
        },
        dayGridMonth: {
          dayMaxEvents: 4,
        },
        listMonth: {
          listDayFormat:     { weekday: 'long', day: 'numeric', month: 'long' },
          listDaySideFormat: false,
        },
      }}
      events={events}
      eventClick={onEventClick}
      height="auto"
      displayEventTime={false}
      eventDisplay="block"
      eventBorderColor="transparent"
      moreLinkText={n => `+${n} más`}
      noEventsText="Sin eventos en este período."
      eventClassNames="cursor-pointer rounded text-xs font-semibold px-1.5 py-0.5 shadow-sm"
      locale="es"
      firstDay={1}
    />
  )
}
