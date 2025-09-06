'use client'
import { useEffect, useState } from 'react'
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
        <ParticipantVideo key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantVideo({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [tiles, setTiles] = useState<JSX.Element[]>([])
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    console.log(`🔄 Обновление участника ${participant.name} (${isLocal ? 'локальный' : 'удалённый'})`)

    const updateParticipant = async () => {
      const newTiles: JSX.Element[] = []

      // Проверяем аудио
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      const speaking = !!audioPublication?.track && !audioPublication.isMuted
      setIsSpeaking(speaking)

      if (isLocal) {
        // Локальный участник
        const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
        const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track

        console.log(`🏠 Локальные треки: камера=${!!cameraTrack}, экран=${!!screenTrack}`)

        // Камера
        if (cameraTrack) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            newTiles.push(
              <LocalVideoTile 
                key="local-camera"
                stream={stream}
                participant={participant}
                type="camera"
                isSpeaking={speaking}
              />
            )
            console.log(`✅ Локальная камера добавлена`)
          } catch (error) {
            console.error(`❌ Ошибка получения камеры:`, error)
            // Показываем аватар
            newTiles.push(
              <AvatarTile 
                key="local-camera-avatar"
                participant={participant}
                isSpeaking={speaking}
              />
            )
          }
        } else {
          // Аватар если нет камеры
          newTiles.push(
            <AvatarTile 
              key="local-avatar"
              participant={participant}
              isSpeaking={speaking}
            />
          )
        }

        // Экран
        if (screenTrack) {
          try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
            newTiles.push(
              <LocalVideoTile 
                key="local-screen"
                stream={stream}
                participant={participant}
                type="screen"
                isSpeaking={false}
              />
            )
            console.log(`✅ Локальный экран добавлен`)
          } catch (error) {
            console.error(`❌ Ошибка получения экрана:`, error)
          }
        }

      } else {
        // Удалённый участник
        const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
        const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track

        console.log(`👥 Удалённые треки: камера=${!!cameraTrack}, экран=${!!screenTrack}`)

        // Камера
        if (cameraTrack) {
          newTiles.push(
            <RemoteVideoTile 
              key="remote-camera"
              track={cameraTrack}
              participant={participant}
              type="camera"
              isSpeaking={speaking}
            />
          )
        } else {
          // Аватар если нет камеры
          newTiles.push(
            <AvatarTile 
              key="remote-avatar"
              participant={participant}
              isSpeaking={speaking}
            />
          )
        }

        // Экран
        if (screenTrack) {
          newTiles.push(
            <RemoteVideoTile 
              key="remote-screen"
              track={screenTrack}
              participant={participant}
              type="screen"
              isSpeaking={false}
            />
          )
        }
      }

      setTiles(newTiles)
    }

    updateParticipant()

    // Слушаем изменения
    const events = [
      'trackPublished', 'trackUnpublished',
      'trackSubscribed', 'trackUnsubscribed',
      'localTrackPublished', 'localTrackUnpublished'
    ]
    events.forEach(event => {
      participant.on(event as any, updateParticipant)
    })

    const interval = setInterval(updateParticipant, 3000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateParticipant)
      })
      clearInterval(interval)
    }
  }, [participant, isLocal])

  return <>{tiles}</>
}

function LocalVideoTile({ 
  stream, 
  participant, 
  type, 
  isSpeaking 
}: {
  stream: MediaStream
  participant: LocalParticipant
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    console.log(`📺 Создаём локальное видео ${type} для ${participant.name}`)
    
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = type === 'screen' ? 'contain' : 'cover'
    video.style.borderRadius = '8px'

    video.srcObject = stream
    
    video.onloadedmetadata = () => {
      console.log(`✅ Метаданные загружены для локального ${type}`)
      video.play().catch(e => console.error('Ошибка автовоспроизведения:', e))
    }

    setVideoElement(video)

    return () => {
      stream.getTracks().forEach(track => track.stop())
      video.srcObject = null
    }
  }, [stream, participant.name, type])

  useEffect(() => {
    const container = document.getElementById(`local-${type}-${participant.identity}`)
    if (container && videoElement) {
      container.innerHTML = ''
      container.appendChild(videoElement)
      console.log(`🎬 Локальное видео ${type} добавлено в контейнер`)
    }
  }, [videoElement, participant.identity, type])

  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: type === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: type === 'screen' ? '300px' : '200px',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      <div 
        id={`local-${type}-${participant.identity}`}
        style={{ width: '100%', height: '100%' }}
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
        {participant.name || participant.identity}
        {type === 'screen' && ' (экран)'}
        {' (вы)'}
        {isSpeaking && type === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}

function RemoteVideoTile({ 
  track, 
  participant, 
  type, 
  isSpeaking 
}: {
  track: any
  participant: RemoteParticipant
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)

  useEffect(() => {
    console.log(`📺 Создаём удалённое видео ${type} для ${participant.name}`)
    
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = false
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = type === 'screen' ? 'contain' : 'cover'

    try {
      track.attach(video)
      setVideoElement(video)
      console.log(`✅ Удалённый ${type} трек подключён`)
    } catch (error) {
      console.error(`❌ Ошибка подключения удалённого ${type}:`, error)
    }

    return () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }
  }, [track, participant.name, type])

  useEffect(() => {
    const container = document.getElementById(`remote-${type}-${participant.identity}`)
    if (container && videoElement) {
      container.innerHTML = ''
      container.appendChild(videoElement)
      console.log(`🎬 Удалённое видео ${type} добавлено в контейнер`)
    }
  }, [videoElement, participant.identity, type])

  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: type === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: type === 'screen' ? '300px' : '200px',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      <div 
        id={`remote-${type}-${participant.identity}`}
        style={{ width: '100%', height: '100%' }}
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
        {participant.name || participant.identity}
        {type === 'screen' && ' (экран)'}
        {isSpeaking && type === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}

function AvatarTile({ participant, isSpeaking }: { 
  participant: LocalParticipant | RemoteParticipant
  isSpeaking: boolean 
}) {
  const isLocal = participant instanceof LocalParticipant
  const borderColor = isSpeaking ? '#00ff00' : 'transparent'

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
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
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
        {isLocal && ' (вы)'}
        {isSpeaking && ' 🎤'}
      </div>
    </div>
  )
}
