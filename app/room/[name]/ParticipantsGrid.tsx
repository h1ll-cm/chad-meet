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
        <div key={participant.identity}>
          <ParticipantVideo participant={participant} />
        </div>
      ))}
    </div>
  )
}

function ParticipantVideo({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [videoElements, setVideoElements] = useState<{
    camera?: HTMLVideoElement
    screen?: HTMLVideoElement
  }>({})
  const [hasCamera, setHasCamera] = useState(false)
  const [hasScreen, setHasScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    console.log(`🔄 Настройка видео для ${participant.name} (${isLocal ? 'локальный' : 'удалённый'})`)

    const updateTracks = () => {
      // Камера
      const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
      const cameraTrack = cameraPublication?.track
      
      // Экран
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      // Аудио
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      const hasAudio = !!audioPublication?.track && !audioPublication.isMuted

      console.log(`👤 ${participant.name}: камера=${!!cameraTrack}, экран=${!!screenTrack}, аудио=${hasAudio}`)

      // Обрабатываем камеру
      if (cameraTrack && !videoElements.camera) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = isLocal
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'cover'
        video.style.borderRadius = '8px'

        console.log(`🎥 Создаём видео элемент для камеры ${participant.name}`)

        try {
          cameraTrack.attach(video)
          setVideoElements(prev => ({ ...prev, camera: video }))
          setHasCamera(true)
          console.log(`✅ Камера подключена для ${participant.name}`)
        } catch (error) {
          console.error(`❌ Ошибка подключения камеры:`, error)
        }
      } else if (!cameraTrack && videoElements.camera) {
        setHasCamera(false)
        setVideoElements(prev => ({ ...prev, camera: undefined }))
      }

      // Обрабатываем экран
      if (screenTrack && !videoElements.screen) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = isLocal
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'contain'
        video.style.borderRadius = '8px'

        console.log(`🖥️ Создаём видео элемент для экрана ${participant.name}`)

        try {
          screenTrack.attach(video)
          setVideoElements(prev => ({ ...prev, screen: video }))
          setHasScreen(true)
          console.log(`✅ Экран подключен для ${participant.name}`)
        } catch (error) {
          console.error(`❌ Ошибка подключения экрана:`, error)
        }
      } else if (!screenTrack && videoElements.screen) {
        setHasScreen(false)
        setVideoElements(prev => ({ ...prev, screen: undefined }))
      }

      setIsSpeaking(hasAudio)
    }

    updateTracks()

    // Слушаем события
    const events = ['trackPublished', 'trackUnpublished', 'trackSubscribed', 'trackUnsubscribed', 'trackMuted', 'trackUnmuted']
    events.forEach(event => {
      participant.on(event as any, updateTracks)
    })

    const interval = setInterval(updateTracks, 2000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateTracks)
      })
      clearInterval(interval)
    }
  }, [participant, isLocal])

  const tiles = []

  // Камера или аватар
  tiles.push(
    <VideoTile
      key="camera"
      videoElement={videoElements.camera}
      hasVideo={hasCamera}
      participant={participant}
      type="camera"
      isSpeaking={isSpeaking}
    />
  )

  // Экран (если есть)
  if (hasScreen && videoElements.screen) {
    tiles.push(
      <VideoTile
        key="screen"
        videoElement={videoElements.screen}
        hasVideo={hasScreen}
        participant={participant}
        type="screen"
        isSpeaking={false}
      />
    )
  }

  return <>{tiles}</>
}

function VideoTile({ 
  videoElement, 
  hasVideo, 
  participant, 
  type, 
  isSpeaking 
}: {
  videoElement?: HTMLVideoElement
  hasVideo: boolean
  participant: LocalParticipant | RemoteParticipant
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  useEffect(() => {
    const container = document.getElementById(`video-${participant.identity}-${type}`)
    
    if (container && videoElement && hasVideo) {
      // Очищаем контейнер
      container.innerHTML = ''
      // Добавляем видео
      container.appendChild(videoElement)
      console.log(`📺 Видео ${type} добавлено в DOM для ${participant.name}`)
    }
  }, [videoElement, hasVideo, participant.identity, type])

  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'
  const isLocal = participant instanceof LocalParticipant

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
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      <div 
        id={`video-${participant.identity}-${type}`}
        style={{ width: '100%', height: '100%' }}
      >
        {!hasVideo && type === 'camera' && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
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
              color: 'white'
            }}>
              {participant.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
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
        {type === 'screen' && ' (экран)'}
        {isLocal && ' (вы)'}
        {isSpeaking && type === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}
