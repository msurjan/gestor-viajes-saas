import EventoDetalleClient from './EventoDetalleClient'

export default async function EventoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EventoDetalleClient eventoId={id} />
}
