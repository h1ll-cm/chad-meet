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
        <ParticipantTile key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantTile({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const screenRef = useRef<HTMLVideoElement>(null)
  const [hasVideo, setHasVideo] = useState(false)
  const [hasScreen, setHasScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)

  useEffect(() => {
    const updateTracks = () => {
      // Проверяем камеру
      const videoPublication = participant.getTrackPublication(Track.Source.Camera)
      const videoTrack = videoPublication?.track
      
      if (videoTrack && videoRef.current && !videoRef.current.srcObject) {
        videoTrack.attach(videoRef.current)
        setHasVideo(true)
      } else if (!videoTrack) {
        setHasVideo(false)
      } else if (videoTrack) {
        setHasVideo(true)
      }

      // Проверяем экраншаринг
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      if (screenTrack && screenRef.current) {
        if (screenRef.current.srcObject !== screenTrack.mediaStream) {
          screenTrack.attach(screenRef.current)
        }
        setHasScreen(true)
      } else {
        setHasScreen(false)
      }

      // Проверяем микрофон для индикации
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      if (audioPublication?.track) {
        setupAudioLevelDetection(audioPublication.track as any)
      }
    }

    const setupAudioLevelDetection = (audioTrack: any) => {
      if (!audioTrack.mediaStream) return

      try {
        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(audioTrack.mediaStream)
        const analyser = audioContext.createAnalyser()
        
        analyser.fftSize = 256
        source.connect(analyser)
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount)
        
        const checkAudioLevel = () => {
          analyser.getByteFrequencyData(dataArray)
          
          // Вычисляем средний уровень звука
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
          setAudioLevel(average)
          
          // Считаем что человек говорит, если уровень выше 30
          const speaking = average > 30
          setIsSpeaking(speaking)
          
          if (speaking) {
            console.log(`${participant.name || participant.identity} говорит (уровень: ${Math.round(average)})`)
          }
        }
        
        const interval = setInterval(checkAudioLevel, 100) // Проверяем каждые 100мс
        
        return () => {
          clearInterval(interval)
          audioContext.close()
        }
      } catch (error) {
        console.log('Не удалось настроить детекцию звука:', error)
      }
    }

    // Запускаем сразу
    updateTracks()

    // Слушаем события
    participant.on('trackPublished', updateTracks)
    participant.on('trackUnpublished', updateTracks)
    participant.on('trackSubscribed', updateTracks)
    participant.on('trackUnsubscribed', updateTracks)
    participant.on('trackMuted', updateTracks)
    participant.on('trackUnmuted', updateTracks)

    // Обновляем каждую секунду
    const interval = setInterval(updateTracks, 1000)

    return () => {
      participant.off('trackPublished', updateTracks)
      participant.off('trackUnpublished', updateTracks)
      participant.off('trackSubscribed', updateTracks)
      participant.off('trackUnsubscribed', updateTracks)
      participant.off('trackMuted', updateTracks)
      participant.off('trackUnmuted', updateTracks)
      clearInterval(interval)
    }
  }, [participant, hasScreen])

  // Определяем цвет рамки
  const borderColor = isSpeaking ? '#00ff00' : 'transparent'
  const borderWidth = isSpeaking ? '3px' : '1px'

  // Приоритет экраншарингу
  if (hasScreen) {
    return (
      <div style={{
        background: '#000',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        minHeight: '300px',
        border: `${borderWidth} solid ${borderColor}`,
        transition: 'border 0.2s ease'
      }}>
        <video
          ref={screenRef}
          autoPlay
          playsInline
          muted={false}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
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
          {participant.name || participant.identity} (демонстрация экрана)
          {isSpeaking && ' 🗣️'}
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: '#222',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `${borderWidth} solid ${borderColor}`,
      transition: 'border 0.2s ease'
    }}>
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant instanceof LocalParticipant}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: isSpeaking ? '#00aa00' : '#007acc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2rem',
          color: 'white',
          transition: 'background 0.2s ease'
        }}>
          {participant.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      )}
      
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '0.8rem'
      }}>
        {participant.name || participant.identity}
        {participant instanceof LocalParticipant ? ' (вы)' : ''}
        {isSpeaking && ' 🗣️'}
      </div>
      
      {/* Индикатор уровня звука */}
      {audioLevel > 0 && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0,255,0,0.7)',
          width: `${Math.min(audioLevel * 2, 100)}px`,
          height: '4px',
          borderRadius: '2px',
          transition: 'width 0.1s ease'
        }} />
      )}
    </div>
  )
}
