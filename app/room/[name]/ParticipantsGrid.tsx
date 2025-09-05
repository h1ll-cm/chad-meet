'use client'
import { 
  VideoTrack, 
  AudioTrack, 
  useParticipants, 
  ParticipantTile,
  useTracks
} from '@livekit/components-react'
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
        <div
          key={participant.identity}
          style={{
            background: '#222',
            borderRadius: '8px',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ParticipantTile
            participant={participant}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ))}
    </div>
  )
}
