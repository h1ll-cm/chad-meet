'use client'
import { useEffect, useRef, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {participants.map((participant) => (
        <div key={participant.identity}>
          <ParticipantTile participant={participant} trackType="camera" />
          <ParticipantTile participant={participant} trackType="screen" />
        </div>
      ))}
    </div>
  )
}

function ParticipantTile({ participant, trackType }: { 
  participant: LocalParticipant | RemoteParticipant
  trackType: 'camera' | 'screen'
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    let cleanupFn: (() => void) | null = null

    const setupVideo = async () => {
      if (!containerRef.current) return

      const source = trackType === 'camera' ? Track.Source.Camera : Track.Source.ScreenShare
      const publication = participant.getTrackPublication(source)
      const track = publication?.track

      console.log(`🔄 Настройка ${trackType} для ${participant.name}:`, {
        hasTrack: !!track,
        isLocal,
        container: !!containerRef.current
      })

      // Очистка предыдущего видео
      if (videoRef.current) {
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current)
        }
        videoRef.current = null
      }

      if (!track) {
        console.log(`❌ Нет трека ${trackType} для ${participant.name}`)
        setHasVideo(false)
        return
      }

      // Создаём новый видео элемент
      const video = document.createElement('video')
      video.autoplay = true
      video.playsInline = true
      video.muted = true // Всегда muted, чтобы избежать эхо
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = trackType === 'screen' ? 'contain' : 'cover'
      video.style.borderRadius = '8px'

      videoRef.current = video

      try {
        let success = false

        if (isLocal) {
          console.log(`🏠 Локальный ${trackType}, пробуем все способы`)
          
          // Способ 1: Прямой доступ к MediaStream
          if ((track as any).mediaStream) {
            video.srcObject = (track as any).mediaStream
            success = true
            console.log(`✅ Способ 1 успешен для ${trackType}`)
          }

          // Способ 2: MediaStreamTrack
          if (!success && (track as any).mediaStreamTrack) {
            const stream = new MediaStream([(track as any).mediaStreamTrack])
            video.srcObject = stream
            success = true
            console.log(`✅ Способ 2 успешен для ${trackType}`)
          }

          // Способ 3: getUserMedia заново (для камеры)
          if (!success && trackType === 'camera') {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: false 
              })
              video.srcObject = stream
              success = true
              console.log(`✅ Способ 3 (getUserMedia) успешен для камеры`)
              
              cleanupFn = () => {
                stream.getTracks().forEach(track => track.stop())
              }
            } catch (e) {
              console.log('⚠️ getUserMedia не сработал:', e)
            }
          }

          // Способ 4: getDisplayMedia заново (для экрана)
          if (!success && trackType === 'screen') {
            try {
              const stream = await navigator.mediaDevices.getDisplayMedia({ 
                video: true, 
                audio: false 
              })
              video.srcObject = stream
              success = true
              console.log(`✅ Способ 4 (getDisplayMedia) успешен для экрана`)
              
              cleanupFn = () => {
                stream.getTracks().forEach(track => track.stop())
              }
            } catch (e) {
              console.log('⚠️ getDisplayMedia не сработал:', e)
            }
          }

          // Способ 5: Fallback attach
          if (!success) {
            track.attach(video)
            success = true
            console.log(`✅ Способ 5 (attach) успешен для ${trackType}`)
          }

        } else {
          // Удалённый участник - просто attach
          track.attach(video)
          success = true
          console.log(`✅ Удалённый ${trackType} подключён`)
        }

        if (success) {
          containerRef.current.appendChild(video)
          setHasVideo(true)
          console.log(`🎉 ${trackType} отображается для ${participant.name}`)
        }

      } catch (error) {
        console.error(`💥 Критическая ошибка ${trackType}:`, error)
        setHasVideo(false)
      }

      // Проверка микрофона
      if (trackType === 'camera') {
        const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
        setIsSpeaking(!!audioPublication?.track && !audioPublication.isMuted)
      }
    }

    setupVideo()

    // Слушаем изменения
    const events = ['trackPublished', 'trackUnpublished', 'trackSubscribed', 'trackUnsubscribed']
    events.forEach(event => {
      participant.on(event as any, setupVideo)
    })

    // Проверяем каждые 3 секунды
    const interval = setInterval(setupVideo, 3000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, setupVideo)
      })
      clearInterval(interval)
      
      if (cleanupFn) cleanupFn()
      
      if (videoRef.current) {
        if (videoRef.current.parentNode) {
          videoRef.current.parentNode.removeChild(videoRef.current)
        }
        videoRef.current = null
      }
    }
  }, [participant, trackType, isLocal])

  // Не показываем экран-тайл если нет экрана
  if (trackType === 'screen' && !hasVideo) {
    return null
  }

  const borderColor = isSpeaking && trackType === 'camera' ? '#00ff00' : 'transparent'

  return (
    <div style={{
      background: trackType === 'screen' ? '#000' : '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: trackType === 'screen' ? '300px' : '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `2px solid ${borderColor}`,
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        {!hasVideo && trackType === 'camera' && (
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
              background: isSpeaking ? '#00aa00' : '#007acc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              color: 'white'
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
        {participant.name || participant.identity}
        {trackType === 'screen' && ' (экран)'}
        {isLocal && ' (вы)'}
        {isSpeaking && trackType === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}
