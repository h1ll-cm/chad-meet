'use client'
import { useTracks } from '@livekit/components-react'
import { Participant, Track } from 'livekit-client'
import { VideoTrack as VideoTrackComponent, AudioTrack } from '@livekit/components-react'

interface ParticipantsGridProps {
  participants: Participant[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
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

function ParticipantTile({ participant }: { participant: Participant }) {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, participant }])
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, participant }])
  const audioTracks = useTracks([{ source: Track.Source.Microphone, participant }])

  const hasCamera = cameraTracks.length > 0 && cameraTracks[0].track?.isEnabled
  const hasScreen = screenTracks.length > 0 && screenTracks[0].track?.isEnabled
  const isSpeaking = audioTracks.length > 0 && audioTracks[0].track?.isEnabled && !audioTracks[0].publication.isMuted
  const isLocal = participant.isLocal

  const displayMode = hasCamera && hasScreen ? 'both' : hasCamera ? 'camera' : hasScreen ? 'screen' : 'avatar'

  console.log(`👤 ${participant.identity}: режим=${displayMode}, 📹=${hasCamera}, 🖥️=${hasScreen}, 🎤=${isSpeaking}`)

  return (
    <div style={{
      background: '#1a1a1a',
      borderRadius: '12px',
      padding: '12px',
      border: isSpeaking ? '3px solid #00ff00' : '2px solid #333',
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

      {/* Видео область */}
      <div style={{
        minHeight: '250px',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        {displayMode === 'both' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: '8px',
            height: '280px'
          }}>
            {cameraTracks.map((trackRef) => (
              <VideoTile key="camera" trackRef={trackRef} type="camera" isSpeaking={isSpeaking} />
            ))}
            {screenTracks.map((trackRef) => (
              <VideoTile key="screen" trackRef={trackRef} type="screen" isSpeaking={false} />
            ))}
          </div>
        )}

        {displayMode === 'camera' && cameraTracks.map((trackRef) => (
          <VideoTile key="camera" trackRef={trackRef} type="camera" isSpeaking={isSpeaking} height="280px" />
        ))}

        {displayMode === 'screen' && screenTracks.map((trackRef) => (
          <VideoTile key="screen" trackRef={trackRef} type="screen" isSpeaking={false} height="280px" />
        ))}

        {displayMode === 'avatar' && (
          <div style={{
            height: '280px',
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
              transform: isSpeaking ? 'scale(1.1)' : 'scale(1)'
            }}>
              {participant.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>

      {/* Аудио трек для звука (только для remote) */}
      {!isLocal && audioTracks.map((trackRef) => (
        <AudioTrack key="audio" trackRef={trackRef} />
      ))}
    </div>
  )
}

function VideoTile({ 
  trackRef, 
  type, 
  isSpeaking,
  height = '100%' 
}: { 
  trackRef: any
  type: 'camera' | 'screen'
  isSpeaking: boolean
  height?: string
}) {
  return (
    <div style={{ position: 'relative', height, width: '100%' }}>
      <VideoTrackComponent 
        trackRef={trackRef}
        style={{ 
          width: '100%', 
          height: '100%',
          borderRadius: '6px',
          objectFit: type === 'screen' ? 'contain' : 'cover',
          background: type === 'screen' ? '#000' : '#333'
        }}
      />
      
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
    </div>
  )
}
