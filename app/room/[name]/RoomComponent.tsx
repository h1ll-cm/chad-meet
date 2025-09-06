'use client'
import ParticipantsGrid from './ParticipantsGrid'
import ControlsComponent from './ControlsComponent'
import ChatComponent from './ChatComponent'
import { useRoomContext } from '@livekit/components-react'

export default function RoomComponent() {
  const room = useRoomContext() // Получаем room из контекста LiveKitRoom

  return (
    <div className="room-container" style={{
      display: 'grid',
      gridTemplateColumns: '3fr 1fr',
      height: '100vh',
      background: '#111'
    }}>
      <div className="participants-section">
        <ParticipantsGrid />
      </div>
      
      <div className="sidebar-section" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '1rem'
      }}>
        <ControlsComponent room={room} />
        <ChatComponent room={room} />
      </div>
    </div>
  )
}
