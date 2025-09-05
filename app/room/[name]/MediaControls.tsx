'use client'
import { Room, Track } from 'livekit-client'

interface MediaControlsProps {
  room: Room
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isVideoEnabled: boolean
  setIsVideoEnabled: (enabled: boolean) => void
  isScreenSharing: boolean
  setIsScreenSharing: (sharing: boolean) => void
  onToggleChat: () => void
}

export default function MediaControls({
  room,
  isMuted,
  setIsMuted,
  isVideoEnabled,
  setIsVideoEnabled,
  isScreenSharing,
  setIsScreenSharing,
  onToggleChat
}: MediaControlsProps) {

  const toggleMicrophone = async () => {
    await room.localParticipant.setMicrophoneEnabled(!isMuted)
    setIsMuted(!isMuted)
  }

  const toggleCamera = async () => {
    await room.localParticipant.setCameraEnabled(!isVideoEnabled)
    setIsVideoEnabled(!isVideoEnabled)
  }

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await room.localParticipant.setScreenShareEnabled(false)
      setIsScreenSharing(false)
    } else {
      await room.localParticipant.setScreenShareEnabled(true)
      setIsScreenSharing(true)
    }
  }

  return (
    <div style={{
      padding: '1rem',
      borderTop: '1px solid #333',
      display: 'flex',
      justifyContent: 'center',
      gap: '1rem',
      background: '#111'
    }}>
      <button
        onClick={toggleMicrophone}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: isMuted ? '#dc3545' : '#28a745',
          color: 'white'
        }}
      >
        {isMuted ? '🔇 Включить микрофон' : '🎤 Выключить микрофон'}
      </button>

      <button
        onClick={toggleCamera}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: isVideoEnabled ? '#28a745' : '#dc3545',
          color: 'white'
        }}
      >
        {isVideoEnabled ? '📹 Выключить камеру' : '📹 Включить камеру'}
      </button>

      <button
        onClick={toggleScreenShare}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: isScreenSharing ? '#dc3545' : '#007acc',
          color: 'white'
        }}
      >
        {isScreenSharing ? '🛑 Остановить показ' : '🖥️ Показать экран'}
      </button>

      <button
        onClick={onToggleChat}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
          background: '#6c757d',
          color: 'white'
        }}
      >
        💬 Чат
      </button>
    </div>
  )
}
