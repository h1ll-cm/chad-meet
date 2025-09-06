'use client'
import { useEffect, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {participants.map((participant) => (
        <ParticipantContainer key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantContainer({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [hasCamera, setHasCamera] = useState(false)
  const [hasScreen, setHasScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'camera-only' | 'screen-only' | 'both'>('camera-only')

  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    const updateState = () => {
      const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
      const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track
      const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track

      const cameraActive = !!cameraTrack
      const screenActive = !!screenTrack
      const speaking = !!audioTrack && !audioTrack.isMuted

      setHasCamera(cameraActive)
      setHasScreen(screenActive)
      setIsSpeaking(speaking)

      // Определяем режим лейаута
      if (cameraActive && screenActive) {
        setLayoutMode('both')
      } else if (screenActive) {
        setLayoutMode('screen-only')
      } else {
        setLayoutMode('camera-only')
      }

      console.log(`📊 ${participant.name}: камера=${cameraActive}, экран=${screenActive}, режим=${layoutMode}`)
    }

    updateState()

    const events = [
      'trackPublished', 'trackUnpublished',
      'trackSubscribed', 'trackUnsubscribed',
      'trackMuted', 'trackUnmuted',
      'localTrackPublished', 'localTrackUnpublished'
    ]

    events.forEach(event => {
      participant.on(event as any, updateState)
    })

    const interval = setInterval(updateState, 2000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateState)
      })
      clearInterval(interval)
    }
  }, [participant, layoutMode])

  // Определяем какие компоненты показывать
  const showCamera = hasCamera || (!hasCamera && !hasScreen)
  const showScreen = hasScreen

  return (
    <div style={{
      background: '#111',
      borderRadius: '12px',
      padding: '10px',
      marginBottom: '10px'
    }}>
      {/* Заголовок участника */}
      <div style={{
        color: 'white',
        fontSize: '1rem',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: isSpeaking ? '#00ff00' : '#666'
        }} />
        {participant.name || participant.identity}
        {isLocal && ' (вы)'}
        <div style={{
          fontSize: '0.8rem',
          color: '#888',
          marginLeft: 'auto'
        }}>
          {layoutMode === 'both' && '📹 + 🖥️'}
          {layoutMode === 'camera-only' && '📹'}
          {layoutMode === 'screen-only' && '🖥️'}
        </div>
      </div>

      {/* Видео контейнер */}
      <div style={{
        display: layoutMode === 'both' ? 'grid' : 'block',
        gridTemplateColumns: layoutMode === 'both' ? '2fr 3fr' : '1fr',
        gap: layoutMode === 'both' ? '10px' : '0',
        minHeight: '200px'
      }}>
        {/* Камера */}
        {showCamera && (
          <VideoTile
            participant={participant}
            source={Track.Source.Camera}
            type="camera"
            isSpeaking={isSpeaking}
            isMain={layoutMode === 'camera-only'}
            hasVideo={hasCamera}
          />
        )}

        {/* Экран */}
        {showScreen && (
          <VideoTile
            participant={participant}
            source={Track.Source.ScreenShare}
            type="screen"
            isSpeaking={false}
            isMain={layoutMode === 'screen-only'}
            hasVideo={hasScreen}
          />
        )}
      </div>
    </div>
  )
}

function VideoTile({ 
  participant, 
  source, 
  type, 
  isSpeaking, 
  isMain, 
  hasVideo 
}: {
  participant: LocalParticipant | RemoteParticipant
  source: Track.Source
  type: 'camera' | 'screen'
  isSpeaking: boolean
  isMain: boolean
  hasVideo: boolean
}) {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null)
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    const publication = participant.getTrackPublication(source)
    const track = publication?.track

    if (!track) {
      setVideoElement(null)
      return
    }

    console.log(`🎬 Создаём видео ${type} для ${participant.name}`)

    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = isLocal || type === 'screen'
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = type === 'screen' ? 'contain' : 'cover'
    video.style.borderRadius = '8px'

    try {
      track.attach(video)
      setVideoElement(video)
      console.log(`✅ ${type} подключён для ${participant.name}`)
    } catch (error) {
      console.error(`❌ Ошибка подключения ${type}:`, error)
      setVideoElement(null)
    }

    return () => {
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
    }
  }, [participant, source, type, isLocal])

  useEffect(() => {
    const containerId = `video-${participant.identity}-${type}`
    const container = document.getElementById(containerId)
    
    if (container && videoElement) {
      container.innerHTML = ''
      container.appendChild(videoElement)
      console.log(`📺 Видео ${type} добавлено в контейнер`)
    }
  }, [videoElement, participant.identity, type])

  const height = isMain ? '300px' : '150px'
  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: type === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease'
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
              width: isMain ? '80px' : '50px',
              height: isMain ? '80px' : '50px',
              borderRadius: '50%',
              background: isSpeaking ? '#00aa00' : '#007acc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: isMain ? '2rem' : '1.2rem',
              color: 'white',
              transition: 'all 0.3s ease'
            }}>
              {participant.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
      
      {/* Лейбл */}
      <div style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {type === 'camera' ? '📹' : '🖥️'}
        {isMain && ' (главный)'}
      </div>
      
      {/* Индикатор качества */}
      <div style={{
        position: 'absolute',
        bottom: '8px',
        right: '8px',
        background: 'rgba(0,0,0,0.6)',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '0.7rem'
      }}>
        {hasVideo ? '🟢' : '🔴'}
      </div>
    </div>
  )
}
