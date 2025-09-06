'use client'
import { useEffect, useRef, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  const [tiles, setTiles] = useState<any[]>([])

  useEffect(() => {
    const newTiles = []
    
    participants.forEach(participant => {
      // Основной тайл участника (камера или аватар)
      newTiles.push({
        key: `${participant.identity}-main`,
        participant,
        type: 'main'
      })
      
      // Отдельный тайл для экраншаринга
      const screenPub = participant.getTrackPublication(Track.Source.ScreenShare)
      if (screenPub?.track) {
        newTiles.push({
          key: `${participant.identity}-screen`,
          participant,
          type: 'screen'
        })
      }
    })
    
    setTiles(newTiles)
  }, [participants])

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
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    let intervalId: NodeJS.Timeout

    const updateVideo = () => {
      if (!videoRef.current) return

      const source = type === 'screen' ? Track.Source.ScreenShare : Track.Source.Camera
      const publication = participant.getTrackPublication(source)
      const track = publication?.track

      console.log(`Обновление ${type} для ${participant.name}:`, {
        hasTrack: !!track,
        isLocal,
        isSubscribed: publication?.isSubscribed
      })

      if (track) {
        try {
          // Простое прямое подключение
          track.attach(videoRef.current)
          setHasVideo(true)
          console.log(`✅ ${type} подключён для ${participant.name}`)
        } catch (error) {
          console.error(`❌ Ошибка подключения ${type}:`, error)
          setHasVideo(false)
        }
      } else {
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
      'trackMuted', 'trackUnmuted'
    ]

    events.forEach(event => {
      participant.on(event as any, updateVideo)
    })

    // Регулярная проверка каждые 2 секунды
    intervalId = setInterval(updateVideo, 2000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateVideo)
      })
      clearInterval(intervalId)
      
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach(track => track.stop())
        videoRef.current.srcObject = null
      }
    }
  }, [participant, type, isLocal])

  if (type === 'screen' && !hasVideo) {
    return null // Не показываем пустой экран-тайл
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
