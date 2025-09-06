'use client'
import { useState, useEffect, useRef } from 'react'
import { Room, RoomEvent, DataPublishOptions } from 'livekit-client'

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
      try {
        const decoder = new TextDecoder()
        const data = JSON.parse(decoder.decode(payload))
        
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            from: participant?.name || participant?.identity || 'Неизвестный',
            message: data.message,
            timestamp: Date.now()
          }])
        }
      } catch (error) {
        console.error('Ошибка обработки сообщения:', error)
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
      message: inputMessage.trim()
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(JSON.stringify(messageData))

    try {
      // Используем новый API без DataPacket_Kind
      const options: DataPublishOptions = {
        reliable: true
      }
      
      await room.localParticipant.publishData(data, options)
      
      // Добавляем своё сообщение
      setMessages(prev => [...prev, {
        from: 'Вы',
        message: inputMessage.trim(),
        timestamp: Date.now()
      }])
      
      setInputMessage('')
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error)
      
      // Fallback: попробуем без options
      try {
        await room.localParticipant.publishData(data)
        setMessages(prev => [...prev, {
          from: 'Вы',
          message: inputMessage.trim(),
          timestamp: Date.now()
        }])
        setInputMessage('')
      } catch (fallbackError) {
        console.error('Fallback тоже не сработал:', fallbackError)
      }
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
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
        fontWeight: 'bold',
        fontSize: '1.2rem'
      }}>
        💬 Чат
      </div>
      
      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {messages.length === 0 ? (
          <div style={{
            color: '#666',
            textAlign: 'center',
            marginTop: '2rem',
            fontStyle: 'italic'
          }}>
            Сообщений пока нет...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{
              padding: '0.75rem',
              background: msg.from === 'Вы' ? '#007acc22' : '#333',
              borderRadius: '8px',
              color: 'white',
              borderLeft: msg.from === 'Вы' ? '3px solid #007acc' : '3px solid #666'
            }}>
              <div style={{ 
                fontSize: '0.8rem', 
                color: '#aaa',
                marginBottom: '0.25rem',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontWeight: 'bold' }}>{msg.from}</span>
                <span>{formatTime(msg.timestamp)}</span>
              </div>
              <div style={{ wordWrap: 'break-word' }}>{msg.message}</div>
            </div>
          ))
        )}
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
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder="Введите сообщение..."
          maxLength={500}
          style={{
            flex: 1,
            padding: '0.75rem',
            border: '1px solid #444',
            borderRadius: '8px',
            background: '#333',
            color: 'white',
            fontSize: '1rem',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!inputMessage.trim()}
          style={{
            padding: '0.75rem 1.5rem',
            background: inputMessage.trim() ? '#007acc' : '#555',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            transition: 'background 0.2s'
          }}
        >
          📤 Отправить
        </button>
      </div>
    </div>
  )
}
