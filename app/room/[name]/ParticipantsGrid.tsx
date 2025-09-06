'use client'
import { useState, useEffect } from 'react'
import {
  ParticipantLoop,
  ParticipantName,
  Participant,
  TrackLoop,
  VideoTrack,
  AudioTrack,
  useIsSpeaking,
} from '@livekit/components-react'
import { Track, Participant as LKParticipant } from 'livekit-client'

export default function ParticipantsGrid() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '15px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      <ParticipantLoop>
        <ParticipantTile />
      </ParticipantLoop>
    </div>
  )
}

function ParticipantTile() {
  const [hasTracks, setHasTracks] = useState(false)
  const [updateKey, setUpdateKey] = useState(0)
  const participant = TrackLoop.useContext()?.participant as LKParticipant || null
  const isSpeaking = useIsSpeaking(participant)
  const isLocal = participant?.isLocal

  useEffect(() => {
    if (participant) {
      const handleTrackChange = () => {
        const camera = participant.getTrack(Track.Source.Camera)
        const screen = participant.getTrack(Track.Source.ScreenShare)
        setHasTracks(!!camera || !!screen)
        setUpdateKey((prev) => prev + 1)
        console.log(`🔄 Обновление треков для ${participant.identity}: camera=${!!camera}, screen=${!!screen}`)
      }

      participant.on('trackPublished', handleTrackChange)
      participant.on('trackUnpublished', handleTrackChange)
      participant.on('trackSubscribed', handleTrackChange)
      participant.on('trackUnsubscribed', handleTrackChange)

      handleTrackChange() // Initial check

      return () => {
        participant.off('trackPublished', handleTrackChange)
        participant.off('trackUnpublished', handleTrackChange)
        participant.off('trackSubscribed', handleTrackChange)
        participant.off('trackUnsubscribed', handleTrackChange)
      }
    }
  }, [participant])

  if (!participant) return null

  return (
    <Participant key={`participant-${participant.identity}-${updateKey}`} participant={participant}>
      <div style={{
        background: '#1a1a1a',
        borderRadius: '12px',
        padding: '12px',
        border: isSpeaking ? '3px solid #00ff00' : '2px solid #333',
        transition: 'border 0.3s ease',
        position: 'relative'
      }}>
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

        <div style={{
          minHeight: '280px',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          <TrackLoop participant={participant} sources={[Track.Source.Camera, Track.Source.ScreenShare]}>
            <TrackVideo hasBoth={participant.getTrack(Track.Source.Camera) && participant.getTrack(Track.Source.ScreenShare)} />
          </TrackLoop>

          {!hasTracks && (
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

        {!isLocal && <AudioTrack source={Track.Source.Microphone} participant={participant} />}
      </div>
    </Participant>
  )
}

function TrackVideo({ hasBoth }: { hasBoth: boolean }) {
  const trackRef = TrackLoop.useTrackRef()
  const type = trackRef.source === Track.Source.Camera ? 'camera' : 'screen'
  const isSpeaking = useIsSpeaking(trackRef.participant) && type === 'camera'

  if (hasBoth) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 2fr',
        gap: '8px',
        height: '280px'
      }}>
        <div style={{ position: 'relative' }}>
          <VideoTrack source={Track.Source.Camera} participant={trackRef.participant} style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#333', borderRadius: '6px' }} />
          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>📹 Камера</div>
          {isSpeaking && <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,255,0,0.9)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>🎤 Говорит</div>}
        </div>
        <div style={{ position: 'relative' }}>
          <VideoTrack source={Track.Source.ScreenShare} participant={trackRef.participant} style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', borderRadius: '6px' }} />
          <div style={{ position: 'absolute', top: '8px', left: '8px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>🖥️ Экран</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '280px', width: '100%' }}>
      <VideoTrack 
        {...trackRef}
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
