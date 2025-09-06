'use client'
import { useEffect, useRef, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  const [refreshKey, setRefreshKey] = useState(0)

  // Принудительно обновляем сетку каждые 3 секунды
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const tiles = []
  
  participants.forEach(participant => {
    // Основной тайл участника (камера)
    tiles.push({
      key: `${participant.identity}-main-${refreshKey}`,
      participant,
      type: 'main'
    })
    
    // Отдельный тайл для экраншаринга (всегда добавляем, но показываем только если есть трек)
    tiles.push({
      key: `${participant.identity}-screen-${refreshKey}`,
      participant,
      type: 'screen'
    })
  })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {tiles.map(tile => (
        <ParticipantTile 
          key={tile.key} 
          participant={tile.participant} 
          type={tile.type}
        />
      ))}
    </div>
  )
}

function ParticipantTile({ participant, type }: { 
  participant: LocalParticipant | RemoteParticipant
  type: 'main' | 'screen' 
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [forceUpdate, setForceUpdate] = useState(0)
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const updateVideo = () => {
      if (!videoRef.current) return

      const source = type === 'screen' ? Track.Source.ScreenShare : Track.Source.Camera
      const publication = participant.getTrackPublication(source)
      const track = publication?.track

      console.log(`Проверка ${type} для ${participant.name}:`, {
        hasTrack: !!track,
        isLocal,
        isSubscribed: publication?.isSubscribed,
        trackKind: track?.kind
      })

      if (track) {
        try {
          // Очищаем предыдущее подключение
          if (videoRef.current.srcObject) {
            videoRef.current.srcObject = null
          }

          if (isLocal) {
            // Для локального участника используем MediaStream
            const mediaStream = (track as any).mediaStream || (track as any)._mediaStream
            if (mediaStream) {
              videoRef.current.srcObject = mediaStream
              console.log(`✅ ${type} подключён через MediaStream для ${participant.name}`)
            } else {
              // Fallback - создаём MediaStream из MediaStreamTrack
              const mediaStreamTrack = (track as any).mediaStreamTrack || (track as any)._mediaStreamTrack
              if (mediaStreamTrack) {
                const stream = new MediaStream([mediaStreamTrack])
                videoRef.current.srcObject = stream
                console.log(`✅ ${type} подключён через MediaStreamTrack для ${participant.name}`)
              } else {
                // Последний fallback
                track.attach(videoRef.current)
                console.log(`✅ ${type} подключён через attach (fallback) для ${participant.name}`)
              }
            }
          } else {
            // Для удалённого участника
            track.attach(videoRef.current)
            console.log(`✅ ${type} подключён через attach для ${participant.name}`)
          }
          
          setHasVideo(true)
          setForceUpdate(prev => prev + 1)
        } catch (error) {
          console.error(`❌ Ошибка подключения ${type}:`, error)
          setHasVideo(false)
        }
      } else {
        console.log(`❌ Нет трека ${type} для ${participant.name}`)
        setHasVideo(false)
      }

      // Проверка микрофона (только для основного тайла)
      if (type === 'main') {
        const audioPub = participant.getTrackPublication(Track.Source.Microphone)
        setIsSpeaking(!!audioPub?.track && !audioPub.isMuted)
      }
    }

    // Первоначальное обновление
    updateVideo()

    // Слушаем все события
    const events = [
      'trackPublished', 'trackUnpublished', 
      'trackSubscribed', 'trackUnsubscribed',
      'trackMuted', 'trackUnmuted',
      'localTrackPublished', 'localTrackUnpublished'
    ]

    events.forEach(event => {
      participant.on(event as any, () => {
        console.log(`Событие ${event} для ${participant.name}`)
        setTimeout(updateVideo, 200)
      })
    })

    // Активная проверка каждую секунду
    intervalId = setInterval(updateVideo, 1000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateVideo)
      })
      clearInterval(intervalId)
    }
  }, [participant, type, isLocal, forceUpdate])

  // Не показываем экран-тайл если нет видео
  if (type === 'screen' && !hasVideo) {
    return null
  }

  const borderColor = isSpeaking && type === 'main' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: type === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: type === 'screen' ? '300px' : '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease'
    }}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: type === 'screen' ? 'contain' : 'cover' 
          }}
        />
      ) : (
        type === 'main' && (
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
        )
      )}
      
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
        {participant.name || participant.identity}
        {type === 'screen' && ' (экран)'}
        {isLocal && ' (вы)'}
        {isSpeaking && type === 'main' && ' 🎤'}
      </div>
    </div>
  )
}
