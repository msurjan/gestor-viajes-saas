'use client'

import FullCalendar from '@fullcalendar/react'
import dayGridPlugin  from '@fullcalendar/daygrid'
import listPlugin     from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg, EventInput } from '@fullcalendar/core'

interface Props {
  events:       EventInput[]
  onEventClick: (arg: EventClickArg) => void
}

export default function CalendarioWrapper({ events, onEventClick }: Props) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, listPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{
        left:   'prev,next today',
        center: 'title',
        right:  'dayGridMonth,listMonth',
      }}
      buttonText={{ today: 'Hoy', month: 'Mes', list: 'Lista' }}
      events={events}
      eventClick={onEventClick}
      height="auto"
      aspectRatio={1.8}
      eventDisplay="block"
      eventBorderColor="transparent"
      dayMaxEvents={3}
      moreLinkText={n => `+${n} más`}
      noEventsText="Sin eventos en este período."
      eventClassNames="cursor-pointer rounded-md text-xs font-medium px-1"
      // Localize months/days in Spanish
      locale="es"
      firstDay={1}
    />
  )
}
