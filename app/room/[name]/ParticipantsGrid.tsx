'use client'
import { useState, useEffect, useRef } from 'react'
import { 
  Room, 
  Track, 
  RemoteTrack, 
  RemoteParticipant, 
  LocalParticipant,
  Participant 
} from 'livekit-client'

interface ParticipantsGridProps {
  room: Room | null
}

export default function ParticipantsGrid({ room }: ParticipantsGridProps) {
  const [participants, setParticipants] = useState<Participant[]>([])

  useEffect(() => {
    if (!room) return

    const updateParticipants = () => {
      const remoteParticipants = Array.from(room.remoteParticipants.values())
      const allParticipants: Participant[] = room.localParticipant 
        ? [room.localParticipant, ...remoteParticipants] 
        : remoteParticipants
      setParticipants(allParticipants)
    }

    updateParticipants()

    room.on('participantConnected', updateParticipants)
    room.on('participantDisconnected', updateParticipants)
    room.on('trackPublished', updateParticipants)
    room.on('trackUnpublished', updateParticipants)
    room.on('trackSubscribed', updateParticipants)
    room.on('trackUnsubscribed', updateParticipants)

    return () => {
      room.off('participantConnected', updateParticipants)
      room.off('participantDisconnected', updateParticipants)
      room.off('trackPublished', updateParticipants)
      room.off('trackUnpublished', updateParticipants)
      room.off('trackSubscribed', updateParticipants)
      room.off('trackUnsubscribed', updateParticipants)
    }
  }, [room])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '15px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {participants.map((participant) => (
        <ParticipantTile key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantTile({ participant }: { participant: Participant }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isLocal = participant === participant.room?.localParticipant

  useEffect(() => {
    const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
    const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track

    if (cameraTrack && videoRef.current) {
      cameraTrack.attach(videoRef.current)
    }
    if (screenTrack && screenRef.current) {
      screenTrack.attach(screenRef.current)
    }

    participant.on('isSpeakingChanged', setIsSpeaking)

    return () => {
      participant.off('isSpeakingChanged', setIsSpeaking)
      if (cameraTrack && videoRef.current) {
        cameraTrack.detach(videoRef.current)
      }
      if (screenTrack && screenRef.current) {
        screenTrack.detach(screenRef.current)
      }
    }
  }, [participant])

  const cameraTrack = participant.getTrackPublication(Track.Source.Camera)
  const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)
  const hasBoth = cameraTrack && screenTrack

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '12px',
      padding: '12px',
      border: isSpeaking ? '3px solid #00ff00' : '2px solid #333',
      transition: 'border 0.3s ease',
    }}>
      <div style={{
        color: 'white',
        fontSize: '1rem',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isSpeaking ? '#00ff00' : '#666',
          transition: 'background 0.3s ease'
        }} />
        {participant.name || participant.identity}
        {isLocal && <span style={{ color: '#007acc' }}>(вы)</span>}
      </div>

      {hasBoth ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '8px',
          height: '280px'
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              background: '#333',
              borderRadius: '6px'
            }}
          />
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              background: '#000',
              borderRadius: '6px'
            }}
          />
        </div>
      ) : cameraTrack || screenTrack ? (
        <video
          ref={cameraTrack ? videoRef : screenRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{
            width: '100%',
            height: '280px',
            objectFit: cameraTrack ? 'cover' : 'contain',
            background: cameraTrack ? '#333' : '#000',
            borderRadius: '6px'
          }}
        />
      ) : (
        <div style={{
          height: '280px',
          background: '#333',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: isSpeaking ? '#00aa00' : '#007acc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
            color: 'white',
            transition: 'all 0.3s ease',
            transform: isSpeaking ? 'scale(1.1)' : 'scale(1)'
          }}>
            {participant.name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      )}
    </div>
  )
}
