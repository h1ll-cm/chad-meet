'use client'
import { useState, useEffect } from 'react'
import { Room } from 'livekit-client'
import ParticipantsGrid from './ParticipantsGrid'
import VideoControls from './VideoControls'

export default function RoomPage({ params }: { params: { name: string } }) {
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const joinRoom = async () => {
    try {
      setIsConnecting(true)
      setError(null)

      // Генерируем токен через API
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          roomName: params.name, 
          participantName: `User-${Math.random().toString(36).substr(2, 9)}` 
        })
      })
      
      if (!response.ok) {
        throw new Error('Ошибка получения токена')
      }

      const { token } = await response.json()
      
      // Подключаемся к комнате
      const newRoom = new Room()
      
      // URL сервера LiveKit (замените на ваш)
      const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server-url'
      
      await newRoom.connect(serverUrl, token)
      setRoom(newRoom)
      
      console.log('🎉 Подключено к комнате')
    } catch (error) {
      console.error('Ошибка подключения:', error)
      setError('Не удалось подключиться к комнате')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    joinRoom()

    return () => {
      if (room) {
        room.disconnect()
        console.log('🚪 Отключено от комнаты')
      }
    }
  }, [params.name])

  if (isConnecting) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          <div>Подключение к комнате...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a1a',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>❌</div>
          <div>{error}</div>
          <button 
            onClick={joinRoom}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              background: '#007acc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#0a0a0a'
    }}>
      <header style={{ 
        padding: '1rem', 
        background: '#333', 
        color: 'white',
        borderBottom: '2px solid #555'
      }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          📹 Комната: {params.name}
        </h1>
      </header>
      
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <ParticipantsGrid room={room} />
      </main>
      
      <footer style={{ 
        padding: '1rem',
        background: '#222',
        borderTop: '2px solid #555'
      }}>
        <VideoControls room={room} />
      </footer>
    </div>
  )
}
