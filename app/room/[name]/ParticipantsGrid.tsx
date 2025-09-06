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
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    const updateTracks = () => {
      // Проверяем камеру
      const videoPublication = participant.getTrackPublication(Track.Source.Camera)
      const videoTrack = videoPublication?.track
      
      if (videoTrack && videoRef.current) {
        // Для локального участника тоже подключаем видео
        if (participant instanceof LocalParticipant) {
          // Для локального участника используем mediaStream напрямую
          if (videoTrack.mediaStream) {
            videoRef.current.srcObject = videoTrack.mediaStream
          }
        } else {
          // Для удалённых участников используем attach
          videoTrack.attach(videoRef.current)
        }
        setHasVideo(true)
      } else {
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        setHasVideo(false)
      }

      // Проверяем экраншаринг
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      if (screenTrack && screenRef.current) {
        if (participant instanceof LocalParticipant) {
          // Для локального участника
          if (screenTrack.mediaStream) {
            screenRef.current.srcObject = screenTrack.mediaStream
          }
        } else {
          // Для удалённых участников
          screenTrack.attach(screenRef.current)
        }
        setHasScreen(true)
      } else {
        if (screenRef.current) {
          screenRef.current.srcObject = null
        }
        setHasScreen(false)
      }

      // Простая проверка микрофона
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      const hasAudio = audioPublication?.track && !audioPublication.isMuted
      setIsSpeaking(hasAudio || false)
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

    // Проверяем каждую секунду
    const interval = setInterval(updateTracks, 1000)

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

  // Цвет рамки: зелёный если микрофон включён
  const borderColor = isSpeaking ? '#00ff00' : 'transparent'
  const borderWidth = '2px'

  // Приоритет экраншарингу
  if (hasScreen) {
    return (
      <div style={{
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '300px',
        border: `${borderWidth} solid ${borderColor}`,
        transition: 'border 0.3s ease'
      }}>
        <video
          ref={screenRef}
          autoPlay
          playsInline
          muted={participant instanceof LocalParticipant}
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
          {isSpeaking && ' 🎤'}
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
      justifyContent: 'center',
      border: `${borderWidth} solid ${borderColor}`,
      transition: 'border 0.3s ease'
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
          background: isSpeaking ? '#00aa00' : '#007acc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white',
          transition: 'background 0.3s ease'
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
        {isSpeaking && ' 🎤'}
      </div>
    </div>
  )
}
