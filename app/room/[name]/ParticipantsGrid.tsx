'use client'
import { useEffect, useState } from 'react'
import { 
  VideoTrack,
} from '@livekit/components-react'
import { 
  LocalParticipant, 
  RemoteParticipant, 
  Track,
  TrackPublication
} from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  console.log(`🏠 Всего участников: ${participants.length}`)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '15px',
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
  const [cameraTrack, setCameraTrack] = useState<TrackPublication | null>(null)
  const [screenTrack, setScreenTrack] = useState<TrackPublication | null>(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    const updateTracks = () => {
      const camera = participant.getTrackPublication(Track.Source.Camera)
      const screen = participant.getTrackPublication(Track.Source.ScreenShare)
      const audio = participant.getTrackPublication(Track.Source.Microphone)

      setCameraTrack(camera || null)
      setScreenTrack(screen || null)
      setIsSpeaking(!!audio?.track && !audio.isMuted)

      console.log(`👤 ${participant.name}: 📹=${!!camera?.track} 🖥️=${!!screen?.track} 🎤=${!!audio?.track && !audio.isMuted}`)
    }

    updateTracks()

    // Слушаем события
    const events = [
      'trackPublished', 'trackUnpublished',
      'trackSubscribed', 'trackUnsubscribed', 
      'trackMuted', 'trackUnmuted'
    ]

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
  }, [participant])

  const hasCamera = !!cameraTrack?.track
  const hasScreen = !!screenTrack?.track

  // Определяем режим отображения
  const displayMode = hasCamera && hasScreen ? 'both' : hasCamera ? 'camera' : hasScreen ? 'screen' : 'avatar'

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '12px',
      padding: '12px',
      border: isSpeaking ? '3px solid #00ff00' : '2px solid #333',
      transition: 'border 0.3s ease'
    }}>
      {/* Заголовок участника */}
      <div style={{
        color: 'white',
        fontSize: '1rem',
        marginBottom: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          background: isSpeaking ? '#00ff00' : '#666',
          transition: 'background 0.3s ease'
        }} />
        <span>{participant.name || participant.identity}</span>
        {isLocal && <span style={{ color: '#007acc' }}>(вы)</span>}
        
        <div style={{ 
          marginLeft: 'auto', 
          fontSize: '0.8rem', 
          color: '#888',
          display: 'flex',
          gap: '4px'
        }}>
          {hasCamera && '📹'}
          {hasScreen && '🖥️'}
          {!hasCamera && !hasScreen && '👤'}
        </div>
      </div>

      {/* Область видео */}
      <div style={{
        minHeight: '200px',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {displayMode === 'both' ? (
          <BothTracksDisplay 
            participant={participant}
            cameraTrack={cameraTrack}
            screenTrack={screenTrack}
            isSpeaking={isSpeaking}
          />
        ) : displayMode === 'camera' ? (
          <SingleTrackDisplay 
            trackRef={cameraTrack}
            type="camera"
            participant={participant}
            isSpeaking={isSpeaking}
          />
        ) : displayMode === 'screen' ? (
          <SingleTrackDisplay 
            trackRef={screenTrack}
            type="screen"
            participant={participant}
            isSpeaking={false}
          />
        ) : (
          <AvatarDisplay participant={participant} isSpeaking={isSpeaking} />
        )}
      </div>
    </div>
  )
}

function BothTracksDisplay({ 
  participant, 
  cameraTrack, 
  screenTrack, 
  isSpeaking 
}: {
  participant: LocalParticipant | RemoteParticipant
  cameraTrack: TrackPublication | null
  screenTrack: TrackPublication | null
  isSpeaking: boolean
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 2fr',
      gap: '8px',
      height: '280px'
    }}>
      {/* Камера (меньше) */}
      <div style={{ position: 'relative' }}>
        {cameraTrack ? (
          <VideoTrack 
            trackRef={{
              publication: cameraTrack,
              participant: participant,
              source: Track.Source.Camera
            }}
            style={{ 
              width: '100%', 
              height: '100%',
              borderRadius: '6px',
              objectFit: 'cover'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: '#333',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            📹 Нет камеры
          </div>
        )}
        
        <TrackLabel type="camera" isSpeaking={isSpeaking} />
      </div>

      {/* Экран (больше) */}
      <div style={{ position: 'relative' }}>
        {screenTrack ? (
          <VideoTrack 
            trackRef={{
              publication: screenTrack,
              participant: participant,
              source: Track.Source.ScreenShare
            }}
            style={{ 
              width: '100%', 
              height: '100%',
              borderRadius: '6px',
              objectFit: 'contain',
              background: '#000'
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            background: '#000',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            🖥️ Нет экрана
          </div>
        )}
        
        <TrackLabel type="screen" isSpeaking={false} />
      </div>
    </div>
  )
}

function SingleTrackDisplay({ 
  trackRef, 
  type, 
  participant, 
  isSpeaking 
}: {
  trackRef: TrackPublication | null
  type: 'camera' | 'screen'
  participant: LocalParticipant | RemoteParticipant
  isSpeaking: boolean
}) {
  if (!trackRef) {
    return (
      <div style={{
        width: '100%',
        height: '250px',
        background: type === 'screen' ? '#000' : '#333',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        {type === 'camera' ? '📹 Нет камеры' : '🖥️ Нет экрана'}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '250px' }}>
      <VideoTrack 
        trackRef={{
          publication: trackRef,
          participant: participant,
          source: type === 'camera' ? Track.Source.Camera : Track.Source.ScreenShare
        }}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '8px',
          objectFit: type === 'screen' ? 'contain' : 'cover',
          background: type === 'screen' ? '#000' : '#333'
        }}
      />
      
      <TrackLabel type={type} isSpeaking={isSpeaking} />
    </div>
  )
}

function TrackLabel({ type, isSpeaking }: { type: 'camera' | 'screen', isSpeaking: boolean }) {
  return (
    <>
      <div style={{
        position: 'absolute',
        top: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {type === 'camera' ? '📹 Камера' : '🖥️ Экран'}
      </div>
      
      {type === 'camera' && isSpeaking && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0,255,0,0.9)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '0.8rem'
        }}>
          🎤 Говорит
        </div>
      )}
    </>
  )
}

function AvatarDisplay({ participant, isSpeaking }: { 
  participant: LocalParticipant | RemoteParticipant
  isSpeaking: boolean 
}) {
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
        transition: 'all 0.3s ease',
        transform: isSpeaking ? 'scale(1.1)' : 'scale(1)',
        boxShadow: isSpeaking ? '0 0 25px rgba(0,255,0,0.6)' : 'none'
      }}>
        {participant.name?.charAt(0).toUpperCase() || 'U'}
      </div>
    </div>
  )
}
