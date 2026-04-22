'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapaEventos({ events, onEventClick }: { events: any[], onEventClick: (e: any) => void }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div style={{ height: '600px', width: '100%', zIndex: 0 }}>
      <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', zIndex: 0, borderRadius: '0.75rem' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {events.map((evt) => {
          const lat = evt.extendedProps?.data?.lat
          const lng = evt.extendedProps?.data?.lng
          if (lat === undefined || lng === undefined || lat === null || lng === null) return null
          
          return (
            <Marker key={evt.id} position={[lat, lng]} eventHandlers={{
              click: () => onEventClick({ event: evt })
            }}>
              <Popup>
                <div className="text-sm font-semibold text-indigo-900 leading-tight">{evt.title}</div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onEventClick({ event: evt }) }}
                  className="text-xs mt-2 text-indigo-600 font-medium hover:underline"
                >
                  Ver Ficha Completa &rarr;
                </button>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
