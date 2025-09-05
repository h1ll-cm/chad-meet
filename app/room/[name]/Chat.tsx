'use client'
import { useState, useEffect, useRef } from 'react'
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client'

interface ChatProps {
  room: Room
}

interface Message {
  from: string
  message: string
  timestamp: number
}

export default function Chat({ room }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleDataReceived = (payload: Uint8Array, participant?: any) => {
      const decoder = new TextDecoder()
      const data = JSON.parse(decoder.decode(payload))
      
      if (data.type === 'chat') {
        setMessages(prev => [...prev, {
          from: participant?.name || participant?.identity || 'Неизвестный',
          message: data.message,
          timestamp: Date.now()
        }])
      }
    }

    room.on(RoomEvent.DataReceived, handleDataReceived)

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }, [room])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!inputMessage.trim()) return

    const messageData = {
      type: 'chat',
      message: inputMessage
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(messageData))

    try {
      await room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE)
      
      // Добавляем своё сообщение
      setMessages(prev => [...prev, {
        from: 'Вы',
        message: inputMessage,
        timestamp: Date.now()
      }])
      
      setInputMessage('')
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#1a1a1a'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #333',
        color: 'white',
        fontWeight: 'bold'
      }}>
        Чат
      </div>
      
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto'
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{
            marginBottom: '0.5rem',
            padding: '0.5rem',
            background: '#333',
            borderRadius: '4px',
            color: 'white'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              {msg.from}
            </div>
            <div>{msg.message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{
        padding: '1rem',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Введите сообщение..."
          style={{
            flex: 1,
            padding: '0.5rem',
            border: '1px solid #444',
            borderRadius: '4px',
            background: '#333',
            color: 'white'
          }}
        />
        <button
          onClick={sendMessage}
          style={{
            padding: '0.5rem 1rem',
            background: '#007acc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
