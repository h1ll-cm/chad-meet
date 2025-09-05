'use client'
import { useEffect, useRef } from 'react'
import { LocalParticipant, RemoteParticipant, Track, TrackPublication } from 'livekit-client'

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
        <ParticipantTile key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantTile({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const handleTrackSubscribed = (track: any) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current)
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current)
      }
    }

    const handleTrackUnsubscribed = (track: any) => {
      track.detach()
    }

    // Подписываемся на существующие треки
    participant.trackPublications.forEach((trackPub: TrackPublication) => {
      if (trackPub.track) {
        handleTrackSubscribed(trackPub.track)
      }
    })

    // Слушаем новые треки
    participant.on('trackSubscribed', handleTrackSubscribed)
    participant.on('trackUnsubscribed', handleTrackUnsubscribed)

    return () => {
      participant.off('trackSubscribed', handleTrackSubscribed)
      participant.off('trackUnsubscribed', handleTrackUnsubscribed)
    }
  }, [participant])

  const hasVideo = Array.from(participant.trackPublications.values()).some(
    (track: TrackPublication) => track.kind === Track.Kind.Video && track.track
  )

  return (
    <div style={{
      background: '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant instanceof LocalParticipant}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#007acc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white'
        }}>
          {participant.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
      
      <audio ref={audioRef} autoPlay />
      
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
      </div>
    </div>
  )
}
