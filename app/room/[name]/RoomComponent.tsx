'use client'
import { Room } from 'livekit-client'
import { useParticipants } from '@livekit/components-react'
import ParticipantsGrid from './ParticipantsGrid'
import ControlsComponent from './ControlsComponent'
import ChatComponent from './ChatComponent'

interface RoomComponentProps {
  room: Room
}

export default function RoomComponent({ room }: RoomComponentProps) {
  const participants = useParticipants({ room })

  console.log(`🏠 Участники в комнате: ${participants.length}`)

  return (
    <div className="room-container" style={{
      display: 'grid',
      gridTemplateColumns: '3fr 1fr',
      height: '100vh',
      background: '#111'
    }}>
      <div className="participants-section">
        <ParticipantsGrid participants={participants} />
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
