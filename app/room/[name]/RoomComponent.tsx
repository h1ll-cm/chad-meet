'use client'
import { useState, useEffect } from 'react'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant, Track } from 'livekit-client'
import MediaControls from './MediaControls'
import ParticipantsGrid from './ParticipantsGrid'
import Chat from './Chat'

interface RoomComponentProps {
  room: Room
}

export default function RoomComponent({ room }: RoomComponentProps) {
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>([])
  const [showChat, setShowChat] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [isVideoEnabled, setIsVideoEnabled] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  useEffect(() => {
    const updateParticipants = () => {
      const remoteParticipants = Array.from(room.participants.values())
      const allParticipants = [room.localParticipant, ...remoteParticipants]
      setParticipants(allParticipants)
    }

    // Изначально обновляем список
    updateParticipants()

    // Слушаем события
    room.on(RoomEvent.ParticipantConnected, updateParticipants)
    room.on(RoomEvent.ParticipantDisconnected, updateParticipants)
    room.on(RoomEvent.LocalTrackPublished, updateParticipants)
    room.on(RoomEvent.LocalTrackUnpublished, updateParticipants)
    room.on(RoomEvent.TrackSubscribed, updateParticipants)
    room.on(RoomEvent.TrackUnsubscribed, updateParticipants)

    return () => {
      room.off(RoomEvent.ParticipantConnected, updateParticipants)
      room.off(RoomEvent.ParticipantDisconnected, updateParticipants)
      room.off(RoomEvent.LocalTrackPublished, updateParticipants)
      room.off(RoomEvent.LocalTrackUnpublished, updateParticipants)
      room.off(RoomEvent.TrackSubscribed, updateParticipants)
      room.off(RoomEvent.TrackUnsubscribed, updateParticipants)
    }
  }, [room])

  return (
    <div className="room-container">
      <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #333' }}>
            <h2>Chad Meetings - {participants.length} участников</h2>
          </div>
          
          <div style={{ flex: 1, position: 'relative' }}>
            <ParticipantsGrid participants={participants} />
          </div>

          <MediaControls
            room={room}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            isVideoEnabled={isVideoEnabled}
            setIsVideoEnabled={setIsVideoEnabled}
            isScreenSharing={isScreenSharing}
            setIsScreenSharing={setIsScreenSharing}
            onToggleChat={() => setShowChat(!showChat)}
          />
        </div>

        {showChat && (
          <div style={{ width: '300px', borderLeft: '1px solid #333' }}>
            <Chat room={room} />
          </div>
        )}
      </div>
    </div>
  )
}
