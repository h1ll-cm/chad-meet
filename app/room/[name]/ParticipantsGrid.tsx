'use client'
import { useEffect, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'
import { 
  ParticipantTile as LiveKitParticipantTile,
  TrackReferenceOrPlaceholder,
  useTracks
} from '@livekit/components-react'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  // Получаем все треки автоматически
  const videoTracks = useTracks([Track.Source.Camera])
  const screenTracks = useTracks([Track.Source.ScreenShare])
  
  console.log('📺 Найденные видео треки:', videoTracks.length)
  console.log('🖥️ Найденные экран треки:', screenTracks.length)

  const allTracks: TrackReferenceOrPlaceholder[] = [
    ...videoTracks,
    ...screenTracks
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {allTracks.map((trackRef, index) => {
        if (trackRef.publication?.track) {
          const isScreen = trackRef.source === Track.Source.ScreenShare
          const participant = trackRef.participant
          
          console.log(`🎬 Отображаем трек:`, {
            source: trackRef.source,
            participant: participant.name,
            isLocal: participant instanceof LocalParticipant
          })

          return (
            <div
              key={`${trackRef.participant.identity}-${trackRef.source}-${index}`}
              style={{
                background: isScreen ? '#000' : '#222',
                borderRadius: '8px',
                overflow: 'hidden',
                position: 'relative',
                minHeight: isScreen ? '300px' : '200px'
              }}
            >
              <LiveKitParticipantTile
                trackRef={trackRef}
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
                {isScreen && ' (экран)'}
                {participant instanceof LocalParticipant && ' (вы)'}
              </div>
            </div>
          )
        }

        // Показываем аватары для участников без видео
        return (
          <ParticipantAvatar 
            key={`avatar-${index}`} 
            participant={trackRef.participant} 
          />
        )
      })}

      {/* Добавляем аватары для участников без треков */}
      {participants.map(participant => {
        const hasVideoTrack = videoTracks.some(t => t.participant === participant)
        const hasScreenTrack = screenTracks.some(t => t.participant === participant)
        
        if (!hasVideoTrack && !hasScreenTrack) {
          return (
            <ParticipantAvatar 
              key={`no-tracks-${participant.identity}`} 
              participant={participant} 
            />
          )
        }
        return null
      })}
    </div>
  )
}

function ParticipantAvatar({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [isSpeaking, setIsSpeaking] = useState(false)

  useEffect(() => {
    const checkAudio = () => {
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      setIsSpeaking(!!audioPublication?.track && !audioPublication.isMuted)
    }

    checkAudio()
    
    const events = ['trackMuted', 'trackUnmuted', 'trackPublished', 'trackUnpublished']
    events.forEach(event => participant.on(event as any, checkAudio))
    
    const interval = setInterval(checkAudio, 1000)

    return () => {
      events.forEach(event => participant.off(event as any, checkAudio))
      clearInterval(interval)
    }
  }, [participant])

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
      border: isSpeaking ? '2px solid #00ff00' : '2px solid transparent',
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
        {participant instanceof LocalParticipant && ' (вы)'}
        {isSpeaking && ' 🎤'}
      </div>
    </div>
  )
}
