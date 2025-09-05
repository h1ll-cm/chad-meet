'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [name, setName] = useState('')
  const router = useRouter()

  const joinRoom = () => {
    if (name.trim()) {
      router.push(`/room/meeting?name=${encodeURIComponent(name)}`)
    }
  }

  return (
    <div className="container">
      <div className="join-form">
        <h1>Chad Meet</h1>
        <p style={{marginBottom: '1rem'}}>Войти в комнату</p>
        <input
          type="text"
          placeholder="Введите ваше имя"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
        />
        <button onClick={joinRoom}>
          Войти в комнату
        </button>
      </div>
    </div>
  )
}
