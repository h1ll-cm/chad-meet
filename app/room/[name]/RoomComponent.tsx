'use client'
import { useState, useEffect } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client'
import ParticipantsGrid from './ParticipantsGrid'
import ChatComponent from './ChatComponent'
import ControlsComponent from './ControlsComponent'
import { VideoProvider } from './VideoContext'

interface RoomComponentProps {
  room: Room
}

export default function RoomComponent({ room }: RoomComponentProps) {
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>([])

  useEffect(() => {
    const updateParticipants = () => {
      const allParticipants = [
        room.localParticipant,
        ...Array.from(room.remoteParticipants.values())
      ]
      setParticipants(allParticipants)
    }

    updateParticipants()

    room.on(RoomEvent.ParticipantConnected, updateParticipants)
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants)

    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipants)
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants)
    }
  }, [room])

  return (
    <VideoProvider room={room}>
      <div className="room-container">
        <div className="participants-section">
          <ParticipantsGrid participants={participants} />
        </div>
        
        <div className="controls-section">
          <ControlsComponent room={room} />
        </div>
        
        <div className="chat-section">
          <ChatComponent room={room} />
        </div>
      </div>
    </VideoProvider>
  )
}
