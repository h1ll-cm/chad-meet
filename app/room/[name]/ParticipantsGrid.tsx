'use client'
import { 
  ParticipantTile,
  VideoTrack,
  AudioTrack,
  useParticipants,
  useTracks
} from '@livekit/components-react'
import { Track, Participant } from 'livekit-client'
import { useEffect, useState } from 'react'

interface ParticipantsGridProps {
  participants: Participant[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  // Получаем все видео и экран треки
  const videoTracks = useTracks([Track.Source.Camera], { updateOnlyOn: [] })
  const screenTracks = useTracks([Track.Source.ScreenShare], { updateOnlyOn: [] })
  
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {/* Отображаем всех участников с камерой */}
      {participants.map((participant) => {
        const videoTrack = participant.getTrackPublication(Track.Source.Camera)
        const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone)
        
        const isSpeaking = audioTrack?.track && !audioTrack.isMuted
        
        return (
          <div key={participant.identity + '-video'}>
            <ParticipantVideoTile 
              participant={participant}
              trackType="camera"
              isSpeaking={isSpeaking}
            />
          </div>
        )
      })}

      {/* Отдельно отображаем экраншаринг */}
      {participants.map((participant) => {
        const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)
        if (!screenTrack?.track) return null
        
        return (
          <div key={participant.identity + '-screen'}>
            <ParticipantVideoTile 
              participant={participant}
              trackType="screen"
              isSpeaking={false}
            />
          </div>
        )
      })}
    </div>
  )
}

function ParticipantVideoTile({ 
  participant, 
  trackType, 
  isSpeaking 
}: { 
  participant: Participant
  trackType: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const source = trackType === 'camera' ? Track.Source.Camera : Track.Source.ScreenShare
  const publication = participant.getTrackPublication(source)
  
  if (!publication?.track) {
    // Показываем аватар только для камеры
    if (trackType === 'camera') {
      return (
        <div style={{
          background: '#222',
          borderRadius: '8px',
          position: 'relative',
          minHeight: '200px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isSpeaking ? '2px solid #00ff00' : '1px solid transparent',
          transition: 'border 0.3s ease'
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
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '0.8rem'
          }}>
            {participant.name || participant.identity}
            {isSpeaking && ' 🎤'}
          </div>
        </div>
      )
    }
    return null
  }

  const isScreen = trackType === 'screen'
  const title = isScreen ? ' (экран)' : ''

  return (
    <div style={{
      background: isScreen ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: isScreen ? '300px' : '200px',
      border: isSpeaking && !isScreen ? '2px solid #00ff00' : '1px solid transparent',
      transition: 'border 0.3s ease'
    }}>
      <VideoTrack 
        participant={participant} 
        source={source}
        style={{ 
          width: '100%', 
          height: '100%', 
          objectFit: isScreen ? 'contain' : 'cover' 
        }}
      />
      
      {!isScreen && (
        <AudioTrack 
          participant={participant} 
          source={Track.Source.Microphone}
        />
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
        {participant.name || participant.identity}{title}
        {isSpeaking && !isScreen && ' 🎤'}
      </div>
    </div>
  )
}
