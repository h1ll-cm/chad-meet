'use client'
import { useEffect, useState } from 'react'
import { Room, RoomEvent, LocalParticipant, RemoteParticipant } from 'livekit-client'
import ParticipantsGrid from './ParticipantsGrid'
import ControlsComponent from './ControlsComponent'
import ChatComponent from './ChatComponent'

interface RoomComponentProps {
  room: Room
}

export default function RoomComponent({ room }: RoomComponentProps) {
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>(room.participants.values() as any)
  const localParticipant = room.localParticipant

  useEffect(() => {
    console.log('🛠️ Комната инициализирована с', participants.length, 'участниками')

    const updateParticipants = () => {
      setParticipants(Array.from(room.participants.values()).concat(localParticipant))
      console.log('🔄 Участники обновлены:', room.participants.size + 1)
    }

    updateParticipants()

    // Слушатели на уровне комнаты для автообновления
    const roomEvents = [
      RoomEvent.ParticipantConnected,
      RoomEvent.ParticipantDisconnected,
      RoomEvent.TrackPublished,
      RoomEvent.TrackUnpublished,
      RoomEvent.TrackSubscribed,
      RoomEvent.TrackUnsubscribed,
      RoomEvent.LocalTrackPublished,
      RoomEvent.LocalTrackUnpublished,
      RoomEvent.AudioPlaybackStatusChanged
    ]

    roomEvents.forEach(event => {
      room.on(event, updateParticipants)
    })

    // Периодическая проверка
    const interval = setInterval(updateParticipants, 2000)

    return () => {
      roomEvents.forEach(event => {
        room.off(event, updateParticipants)
      })
      clearInterval(interval)
    }
  }, [room, localParticipant])

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
