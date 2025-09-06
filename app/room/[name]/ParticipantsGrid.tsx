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
      gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '15px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {participants.map((participant) => (
        <ParticipantCard key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantCard({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [tracks, setTracks] = useState<{
    camera: any | null
    screen: any | null
    audio: any | null
  }>({ camera: null, screen: null, audio: null })
  
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    let mounted = true

    const updateTracks = () => {
      if (!mounted) return

      const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)

      const cameraTrack = cameraPublication?.track
      const screenTrack = screenPublication?.track
      const audioTrack = audioPublication?.track

      const newTracks = {
        camera: cameraTrack,
        screen: screenTrack,
        audio: audioTrack
      }

      const speaking = !!audioTrack && !audioPublication.isMuted

      setTracks(newTracks)
      setIsSpeaking(speaking)

      console.log(`🔄 ${participant.name}: 📹=${!!cameraTrack} 🖥️=${!!screenTrack} 🎤=${speaking}`)
    }

    // Начальное обновление
    updateTracks()

    // События для всех типов участников
    const events = [
      'trackPublished',
      'trackUnpublished', 
      'trackSubscribed',
      'trackUnsubscribed',
      'trackMuted',
      'trackUnmuted'
    ]

    events.forEach(event => {
      participant.on(event as any, updateTracks)
    })

    // Дополнительная проверка каждые 3 секунды
    const interval = setInterval(updateTracks, 3000)

    return () => {
      mounted = false
      events.forEach(event => {
        participant.off(event as any, updateTracks)
      })
      clearInterval(interval)
    }
  }, [participant])

  const hasCamera = !!tracks.camera
  const hasScreen = !!tracks.screen
  const displayMode = hasCamera && hasScreen ? 'both' : hasCamera ? 'camera' : hasScreen ? 'screen' : 'avatar'

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '12px',
      padding: '12px',
      border: isSpeaking ? '2px solid #00ff00' : '2px solid transparent',
      transition: 'border 0.3s ease'
    }}>
      {/* Заголовок */}
      <div style={{
        color: 'white',
        fontSize: '1rem',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isSpeaking ? '#00ff00' : '#666',
          transition: 'background 0.3s ease'
        }} />
        {participant.name || participant.identity}
        {isLocal && ' (вы)'}
        
        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#888' }}>
          {displayMode === 'both' && '📹🖥️'}
          {displayMode === 'camera' && '📹'}
          {displayMode === 'screen' && '🖥️'}
          {displayMode === 'avatar' && '👤'}
        </div>
      </div>

      {/* Видео область */}
      <VideoDisplay 
        participant={participant}
        tracks={tracks}
        displayMode={displayMode}
        isSpeaking={isSpeaking}
      />
    </div>
  )
}

function VideoDisplay({ 
  participant, 
  tracks, 
  displayMode, 
  isSpeaking 
}: {
  participant: LocalParticipant | RemoteParticipant
  tracks: { camera: any | null, screen: any | null, audio: any | null }
  displayMode: 'both' | 'camera' | 'screen' | 'avatar'
  isSpeaking: boolean
}) {
  const isLocal = participant instanceof LocalParticipant

  if (displayMode === 'avatar') {
    return <AvatarDisplay participant={participant} isSpeaking={isSpeaking} />
  }

  if (displayMode === 'both') {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '8px',
        height: '250px'
      }}>
        <SingleVideoDisplay
          key={`${participant.identity}-camera`}
          participant={participant}
          track={tracks.camera}
          type="camera"
          isSpeaking={isSpeaking}
        />
        <SingleVideoDisplay
          key={`${participant.identity}-screen`}
          participant={participant}
          track={tracks.screen}
          type="screen"
          isSpeaking={false}
        />
      </div>
    )
  }

  // Одиночное видео (camera или screen)
  const track = displayMode === 'camera' ? tracks.camera : tracks.screen
  return (
    <div style={{ height: '250px' }}>
      <SingleVideoDisplay
        key={`${participant.identity}-${displayMode}`}
        participant={participant}
        track={track}
        type={displayMode}
        isSpeaking={displayMode === 'camera' ? isSpeaking : false}
      />
    </div>
  )
}

function SingleVideoDisplay({ 
  participant, 
  track, 
  type, 
  isSpeaking 
}: {
  participant: LocalParticipant | RemoteParticipant
  track: any
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const isLocal = participant instanceof LocalParticipant
  const containerId = `video-${participant.identity}-${type}-${Date.now()}`

  useEffect(() => {
    if (!track) return

    console.log(`🎬 Создаём видео ${type} для ${participant.name}`)

    const container = document.getElementById(containerId)
    if (!container) {
      console.log(`❌ Контейнер не найден: ${containerId}`)
      return
    }

    // Очищаем контейнер
    container.innerHTML = ''

    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = isLocal
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = type === 'screen' ? 'contain' : 'cover'
    video.style.borderRadius = '6px'
    video.style.background = type === 'screen' ? '#000' : '#333'

    try {
      track.attach(video)
      container.appendChild(video)
      console.log(`✅ ${type} видео добавлено для ${participant.name}`)
    } catch (error) {
      console.error(`❌ Ошибка подключения ${type}:`, error)
      // Показываем заглушку
      container.innerHTML = `
        <div style="
          width: 100%; 
          height: 100%; 
          background: #333; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          color: white;
          border-radius: 6px;
        ">
          ${type === 'camera' ? '📹' : '🖥️'} Ошибка загрузки
        </div>
      `
    }

    return () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }
  }, [track, participant.identity, type, isLocal, containerId])

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: type === 'screen' ? '#000' : '#333',
      borderRadius: '8px',
      overflow: 'hidden'
    }}>
      <div id={containerId} style={{ width: '100%', height: '100%' }} />
      
      {/* Лейбл типа */}
      <div style={{
        position: 'absolute',
        top: '6px',
        left: '6px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.75rem'
      }}>
        {type === 'camera' ? '📹 Камера' : '🖥️ Экран'}
      </div>

      {/* Индикатор звука для камеры */}
      {type === 'camera' && isSpeaking && (
        <div style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          background: 'rgba(0,255,0,0.8)',
          color: 'white',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '0.75rem'
        }}>
          🎤
        </div>
      )}
    </div>
  )
}

function AvatarDisplay({ participant, isSpeaking }: { 
  participant: LocalParticipant | RemoteParticipant
  isSpeaking: boolean 
}) {
  const isLocal = participant instanceof LocalParticipant

  return (
    <div style={{
      height: '250px',
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
        transition: 'background 0.3s ease',
        boxShadow: isSpeaking ? '0 0 20px rgba(0,255,0,0.5)' : 'none'
      }}>
        {participant.name?.charAt(0).toUpperCase() || 'U'}
      </div>
    </div>
  )
}
