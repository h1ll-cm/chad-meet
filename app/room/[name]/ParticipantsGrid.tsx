'use client'
import { useEffect, useRef, useState } from 'react'
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
  const [hasVideo, setHasVideo] = useState(false)
  const [hasScreen, setHasScreen] = useState(false)

  useEffect(() => {
    const updateTracks = () => {
      // Проверяем камеру
      const videoPublication = participant.getTrackPublication(Track.Source.Camera)
      const videoTrack = videoPublication?.track
      
      if (videoTrack && videoRef.current) {
        videoTrack.attach(videoRef.current)
        setHasVideo(true)
      } else {
        setHasVideo(false)
      }

      // Проверяем экраншаринг
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      if (screenTrack && screenRef.current) {
        screenTrack.attach(screenRef.current)
        setHasScreen(true)
      } else {
        setHasScreen(false)
      }
    }

    // Запускаем сразу
    updateTracks()

    // Слушаем все события изменения треков
    participant.on('trackPublished', updateTracks)
    participant.on('trackUnpublished', updateTracks)
    participant.on('trackSubscribed', updateTracks)
    participant.on('trackUnsubscribed', updateTracks)
    participant.on('trackMuted', updateTracks)
    participant.on('trackUnmuted', updateTracks)

    // Проверяем каждые 2 секунды (для надёжности)
    const interval = setInterval(updateTracks, 2000)

    return () => {
      participant.off('trackPublished', updateTracks)
      participant.off('trackUnpublished', updateTracks)
      participant.off('trackSubscribed', updateTracks)
      participant.off('trackUnsubscribed', updateTracks)
      participant.off('trackMuted', updateTracks)
      participant.off('trackUnmuted', updateTracks)
      clearInterval(interval)
    }
  }, [participant])

  // Приоритет экраншарингу
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
          muted={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          {participant.name || participant.identity} (демонстрация экрана)
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
        {participant instanceof LocalParticipant ? ' (вы)' : ''}
      </div>
    </div>
  )
}
