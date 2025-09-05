'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Room, RoomEvent, RemoteParticipant, LocalParticipant } from 'livekit-client'
import RoomComponent from './RoomComponent'

export default function RoomPage() {
  const searchParams = useSearchParams()
  const participantName = searchParams?.get('name') || 'User'
  const [room, setRoom] = useState<Room | null>(null)
  const [isConnecting, setIsConnecting] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const connectToRoom = async () => {
      try {
        setIsConnecting(true)
        
        // Получаем токен
        const response = await fetch('/api/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roomName: 'ChadMeetings',
            participantName: participantName
          })
        })

        const { token } = await response.json()

        // Подключаемся к комнате
        const room = new Room()
        
        await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880', token)
        
        setRoom(room)
        setIsConnecting(false)
        
      } catch (err) {
        console.error('Ошибка подключения:', err)
        setError('Не удалось подключиться к комнате')
        setIsConnecting(false)
      }
    }

    connectToRoom()

    return () => {
      room?.disconnect()
    }
  }, [participantName])

  if (isConnecting) {
    return (
      <div className="container">
        <p>Подключение к комнате...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container">
        <p>Ошибка: {error}</p>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="container">
        <p>Комната не найдена</p>
      </div>
    )
  }

  return <RoomComponent room={room} />
}
