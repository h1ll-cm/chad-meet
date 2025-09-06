'use client'
import {
  ParticipantLoop,
  ParticipantName,
  Participant,
  TrackLoop,
  VideoTrack,
  AudioTrack,
  TrackRefContext,
  useParticipants,
  useIsSpeaking,
} from '@livekit/components-react'
import { Track, Participant as LKParticipant } from 'livekit-client'

export default function ParticipantsGrid() {
  const participants = useParticipants()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '15px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      <ParticipantLoop participants={participants}>
        <ParticipantTile />
      </ParticipantLoop>
    </div>
  )
}

function ParticipantTile() {
  const participant = TrackRefContext.useTrackContext()?.participant as LKParticipant || null
  const isSpeaking = useIsSpeaking(participant)
  const isLocal = participant?.isLocal

  if (!participant) return null

  return (
    <Participant participant={participant}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '12px',
        border: isSpeaking ? '3px solid #00ff00' : '2px solid #333',
        transition: 'border 0.3s ease',
        position: 'relative'
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
          <ParticipantName participant={participant} />
          {isLocal && <span style={{ color: '#007acc' }}>(вы)</span>}
        </div>

        {/* Видео треки с автоматическим отображением camera + screen */}
        <TrackLoop>
          <TrackVideo />
        </TrackLoop>

        {/* Аудио трек для remote */}
        {!isLocal && <AudioTrack source={Track.Source.Microphone} participant={participant} />}

        {/* Аватар, если нет треков */}
        {participant.getTracks().length === 0 && (
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
    </Participant>
  )
}

function TrackVideo() {
  const trackRef = TrackRefContext.useTrackRef()
  if (trackRef.source !== Track.Source.Camera && trackRef.source !== Track.Source.ScreenShare) {
    return null
  }

  const type = trackRef.source === Track.Source.Camera ? 'camera' : 'screen'
  const isSpeaking = useIsSpeaking(trackRef.participant) && type === 'camera'
  const objectFit = type === 'screen' ? 'contain' : 'cover'
  const background = type === 'screen' ? '#000' : '#333'

  return (
    <div style={{ position: 'relative', width: '100%', height: '280px' }}>
      <VideoTrack
        {...trackRef}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '6px',
          objectFit,
          background,
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
      
      {isSpeaking && (
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
      
      {/* Если оба трека активны, отобразить в гриде */}
      {trackRef.participant.getTrack(Track.Source.Camera) && trackRef.participant.getTrack(Track.Source.ScreenShare) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 2fr',
          gap: '8px',
          height: '280px',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%'
        }}>
          {/* Камера маленькая слева, экран большой справа */}
          <VideoTrack source={Track.Source.Camera} participant={trackRef.participant} style={{ objectFit: 'cover', background: '#333' }} />
          <VideoTrack source={Track.Source.ScreenShare} participant={trackRef.participant} style={{ objectFit: 'contain', background: '#000' }} />
        </div>
      )}
    </div>
  )
}
