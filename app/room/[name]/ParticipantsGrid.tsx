'use client'
import { useEffect, useRef } from 'react'
import { LocalParticipant, RemoteParticipant } from 'livekit-client'
import { useVideo } from './VideoContext'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  const { participants: videoParticipants } = useVideo()

  const tiles = []
  
  // Создаём тайлы для каждого участника
  videoParticipants.forEach((participant, id) => {
    // Основной тайл (камера или аватар)
    tiles.push(
      <ParticipantTile 
        key={`${id}-main`} 
        participant={participant}
        type="main"
      />
    )
    
    // Тайл экраншаринга (если есть)
    if (participant.hasScreen && participant.screenElement) {
      tiles.push(
        <ParticipantTile 
          key={`${id}-screen`} 
          participant={participant}
          type="screen"
        />
      )
    }
  })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {tiles}
    </div>
  )
}

function ParticipantTile({ participant, type }: { 
  participant: any
  type: 'main' | 'screen'
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const videoElement = type === 'main' ? participant.cameraElement : participant.screenElement
    
    if (videoElement) {
      // Очищаем контейнер
      containerRef.current.innerHTML = ''
      
      // Добавляем видео элемент
      videoElement.style.width = '100%'
      videoElement.style.height = '100%'
      videoElement.style.objectFit = type === 'screen' ? 'contain' : 'cover'
      
      containerRef.current.appendChild(videoElement)
    }
  }, [participant, type])

  const hasVideo = type === 'main' ? participant.hasCamera : participant.hasScreen
  const borderColor = participant.isSpeaking && type === 'main' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: type === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: type === 'screen' ? '300px' : '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease'
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        {!hasVideo && type === 'main' && (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: participant.isSpeaking ? '#00aa00' : '#007acc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white',
              transition: 'background 0.3s ease'
            }}>
              {participant.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
        )}
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {participant.name}
        {type === 'screen' && ' (экран)'}
        {participant.isLocal && ' (вы)'}
        {participant.isSpeaking && type === 'main' && ' 🎤'}
      </div>
    </div>
  )
}
