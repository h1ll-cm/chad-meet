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
        console.log('Подключаемся к комнате...', participantName)
        
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
        console.log('Получен токен:', token ? 'Есть' : 'Нет')

        const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL
        console.log('LiveKit URL:', livekitUrl)

        // Подключаемся к комнате
        const room = new Room()
        
        await room.connect(livekitUrl!, token)
        console.log('Подключились к комнате успешно')
        
        setRoom(room)
        setIsConnecting(false)
        
      } catch (err) {
        console.error('Ошибка подключения:', err)
        setError(`Не удалось подключиться: ${err}`)
        setIsConnecting(false)
      }
    }

    connectToRoom()

    return () => {
      if (room) {
        room.disconnect()
      }
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
        <p>Проверьте консоль браузера для подробностей</p>
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
