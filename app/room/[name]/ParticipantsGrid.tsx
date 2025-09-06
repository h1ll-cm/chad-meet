'use client'
import { useEffect, useRef, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track, LocalVideoTrack, LocalAudioTrack } from 'livekit-client'

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
  const [forceUpdate, setForceUpdate] = useState(0)

  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    const updateTracks = () => {
      console.log(`Обновление треков для ${participant.name || participant.identity} (${isLocal ? 'локальный' : 'удалённый'})`)
      
      // Проверяем камеру
      const videoPublication = participant.getTrackPublication(Track.Source.Camera)
      const videoTrack = videoPublication?.track
      
      if (videoTrack && videoRef.current) {
        console.log(`Подключаем видео для ${participant.name || participant.identity}`)
        
        // Очищаем предыдущее подключение
        if (videoRef.current.srcObject || (videoRef.current as any).track) {
          videoRef.current.srcObject = null;
          (videoRef.current as any).track = null
        }
        
        if (isLocal) {
          // Для локального участника используем MediaStream напрямую
          const localVideoTrack = videoTrack as LocalVideoTrack
          if (localVideoTrack.mediaStreamTrack) {
            const stream = new MediaStream([localVideoTrack.mediaStreamTrack])
            videoRef.current.srcObject = stream
            console.log('Локальное видео подключено через MediaStream')
          }
        } else {
          // Для удалённых участников используем attach
          videoTrack.attach(videoRef.current)
          console.log('Удалённое видео подключено через attach')
        }
        setHasVideo(true)
      } else {
        console.log(`Отключаем видео для ${participant.name || participant.identity}`)
        if (videoRef.current) {
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null
          }
          if (!isLocal && (videoRef.current as any).track) {
            videoTrack?.detach(videoRef.current)
          }
        }
        setHasVideo(false)
      }

      // Проверяем экраншаринг
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      if (screenTrack && screenRef.current) {
        console.log(`Подключаем экран для ${participant.name || participant.identity}`)
        
        // Очищаем предыдущее подключение
        if (screenRef.current.srcObject || (screenRef.current as any).track) {
          screenRef.current.srcObject = null;
          (screenRef.current as any).track = null
        }
        
        if (isLocal) {
          // Для локального участника используем MediaStream напрямую
          const localScreenTrack = screenTrack as LocalVideoTrack
          if (localScreenTrack.mediaStreamTrack) {
            const stream = new MediaStream([localScreenTrack.mediaStreamTrack])
            screenRef.current.srcObject = stream
            console.log('Локальный экран подключен через MediaStream')
          }
        } else {
          // Для удалённых участников используем attach
          screenTrack.attach(screenRef.current)
          console.log('Удалённый экран подключен через attach')
        }
        setHasScreen(true)
      } else {
        if (screenRef.current) {
          if (screenRef.current.srcObject) {
            screenRef.current.srcObject = null
          }
          if (!isLocal && (screenRef.current as any).track) {
            screenTrack?.detach(screenRef.current)
          }
        }
        setHasScreen(false)
      }

      // Проверяем микрофон
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      const hasAudio = audioPublication?.track && !audioPublication.isMuted
      setIsSpeaking(hasAudio || false)
      
      // Принудительно обновляем
      setForceUpdate(prev => prev + 1)
    }

    // Запускаем сразу
    updateTracks()

    // Слушаем события
    const onTrackPublished = (publication: any) => {
      console.log(`Трек опубликован: ${publication.source} для ${participant.name || participant.identity}`)
      setTimeout(updateTracks, 200)
    }
    
    const onTrackUnpublished = (publication: any) => {
      console.log(`Трек отключён: ${publication.source} для ${participant.name || participant.identity}`)
      setTimeout(updateTracks, 100)
    }
    
    const onTrackSubscribed = (track: any, publication: any) => {
      console.log(`Трек подписан: ${publication.source} для ${participant.name || participant.identity}`)
      setTimeout(updateTracks, 200)
    }

    participant.on('trackPublished', onTrackPublished)
    participant.on('trackUnpublished', onTrackUnpublished)
    participant.on('trackSubscribed', onTrackSubscribed)
    participant.on('trackUnsubscribed', updateTracks)
    participant.on('trackMuted', updateTracks)
    participant.on('trackUnmuted', updateTracks)
    participant.on('localTrackPublished', updateTracks)
    participant.on('localTrackUnpublished', updateTracks)

    // Проверяем каждые 800мс
    const interval = setInterval(updateTracks, 800)

    return () => {
      participant.off('trackPublished', onTrackPublished)
      participant.off('trackUnpublished', onTrackUnpublished)
      participant.off('trackSubscribed', onTrackSubscribed)
      participant.off('trackUnsubscribed', updateTracks)
      participant.off('trackMuted', updateTracks)
      participant.off('trackUnmuted', updateTracks)
      participant.off('localTrackPublished', updateTracks)
      participant.off('localTrackUnpublished', updateTracks)
      clearInterval(interval)
      
      // Очищаем видео элементы
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      if (screenRef.current) {
        screenRef.current.srcObject = null
      }
    }
  }, [participant, isLocal, forceUpdate])

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
          muted={isLocal}
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
          muted={isLocal}
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
        {isLocal ? ' (вы)' : ''}
        {isSpeaking && ' 🎤'}
      </div>
    </div>
  )
}
