'use client'
import { LiveKitRoom } from '@livekit/components-react'
import { Room } from 'livekit-client'
import RoomComponent from '../../components/RoomComponent'

// Это пример; замените на вашу логику генерации токена и URL сервера
const serverUrl = 'wss://your-livekit-server-url' // Укажите ваш LiveKit server URL
const token = 'your-generated-token' // Генерируйте токен на сервере

export default function RoomPage() {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      audio={true}
      video={true}
      screen={true}
      connect={true}
      onConnected={(room: Room) => {
        console.log('📡 Подключено к комнате')
      }}
      onDisconnected={() => {
        console.log('🚫 Отключено от комнаты')
      }}
    >
      <RoomComponent />
    </LiveKitRoom>
  )
}
