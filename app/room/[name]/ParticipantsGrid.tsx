'use client'
import { useEffect, useRef } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
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

function ParticipantTile({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const updateTracks = () => {
      // Получаем видео с камеры
      const videoPublication = participant.getTrackPublication(Track.Source.Camera)
      if (videoPublication?.track && videoRef.current) {
        videoPublication.track.attach(videoRef.current)
      }

      // Получаем экран
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      if (screenPublication?.track && screenRef.current) {
        screenPublication.track.attach(screenRef.current)
      }
    }

    updateTracks()

    // Слушаем изменения треков
    participant.on('trackPublished', updateTracks)
    participant.on('trackUnpublished', updateTracks)
    participant.on('trackSubscribed', updateTracks)
    participant.on('trackUnsubscribed', updateTracks)

    return () => {
      participant.off('trackPublished', updateTracks)
      participant.off('trackUnpublished', updateTracks)
      participant.off('trackSubscribed', updateTracks)
      participant.off('trackUnsubscribed', updateTracks)
    }
  }, [participant])

  const videoPublication = participant.getTrackPublication(Track.Source.Camera)
  const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
  
  const hasVideo = videoPublication?.track && videoPublication?.isSubscribed
  const hasScreen = screenPublication?.track && screenPublication?.isSubscribed

  if (hasScreen) {
    return (
      <div style={{
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '300px'
      }}>
        <video
          ref={screenRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          {participant.name || participant.identity} (экран)
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant instanceof LocalParticipant}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#007acc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white'
        }}>
          {participant.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {participant.name || participant.identity}
      </div>
    </div>
  )
}
