'use client'
import { useState, useEffect } from 'react'
import { Room, Track } from 'livekit-client'

interface VideoControlsProps {
  room: Room | null
}

export default function VideoControls({ room }: VideoControlsProps) {
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isMicOn, setIsMicOn] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  const toggleCamera = async () => {
    if (!room) return
    
    try {
      await room.localParticipant.setCameraEnabled(!isCameraOn)
      setIsCameraOn(!isCameraOn)
    } catch (error) {
      console.error('Ошибка камеры:', error)
    }
  }

  const toggleMicrophone = async () => {
    if (!room) return
    
    try {
      await room.localParticipant.setMicrophoneEnabled(!isMicOn)
      setIsMicOn(!isMicOn)
    } catch (error) {
      console.error('Ошибка микрофона:', error)
    }
  }

  const toggleScreenShare = async () => {
    if (!room) return
    
    try {
      await room.localParticipant.setScreenShareEnabled(!isScreenSharing)
      setIsScreenSharing(!isScreenSharing)
    } catch (error) {
      console.error('Ошибка демонстрации экрана:', error)
    }
  }

  const leaveRoom = () => {
    if (room) {
      room.disconnect()
      window.location.href = '/'
    }
  }

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      <button
        onClick={toggleCamera}
        style={{
          padding: '0.75rem 1.5rem',
          background: isCameraOn ? '#dc3545' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        {isCameraOn ? '📹 Выключить камеру' : '📷 Включить камеру'}
      </button>

      <button
        onClick={toggleMicrophone}
        style={{
          padding: '0.75rem 1.5rem',
          background: isMicOn ? '#dc3545' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        {isMicOn ? '🎤 Выключить микрофон' : '🔇 Включить микрофон'}
      </button>

      <button
        onClick={toggleScreenShare}
        style={{
          padding: '0.75rem 1.5rem',
          background: isScreenSharing ? '#dc3545' : '#007acc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        {isScreenSharing ? '🛑 Остановить экран' : '🖥️ Показать экран'}
      </button>

      <button
        onClick={leaveRoom}
        style={{
          padding: '0.75rem 1.5rem',
          background: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '1rem'
        }}
      >
        📤 Выйти
      </button>
    </div>
  )
}
