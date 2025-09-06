'use client'
import { useEffect, useRef, useState } from 'react'
import { LocalParticipant, RemoteParticipant, Track, LocalVideoTrack } from 'livekit-client'

interface ParticipantsGridProps {
  participants: (LocalParticipant | RemoteParticipant)[]
}

export default function ParticipantsGrid({ participants }: ParticipantsGridProps) {
  const [allTiles, setAllTiles] = useState<JSX.Element[]>([])

  useEffect(() => {
    const tiles = []
    for (const participant of participants) {
      tiles.push(<ParticipantTile key={participant.identity + '-camera'} participant={participant} trackType="camera" />)
      
      // Добавляем отдельный тайл для экраншаринга, если он включён
      if (participant.getTrackPublication(Track.Source.ScreenShare)?.track) {
        tiles.push(<ParticipantTile key={participant.identity + '-screen'} participant={participant} trackType="screen" />)
      }
    }
    setAllTiles(tiles)
  }, [participants])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '10px',
      padding: '1rem',
      height: '100%',
      overflow: 'auto'
    }}>
      {allTiles}
    </div>
  )
}

function ParticipantTile({ participant, trackType }: { participant: LocalParticipant | RemoteParticipant; trackType: 'camera' | 'screen' }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasTrack, setHasTrack] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isLocal = participant instanceof LocalParticipant

  useEffect(() => {
    const source = trackType === 'camera' ? Track.Source.Camera : Track.Source.ScreenShare

    const updateTrack = () => {
      console.log(`Обновление трека ${trackType} для ${participant.name || participant.identity} (${isLocal ? 'локальный' : 'удалённый'})`)

      const publication = participant.getTrackPublication(source)
      const track = publication?.track as LocalVideoTrack | undefined

      if (track && videoRef.current) {
        console.log(`Подключаем ${trackType} для ${participant.name || participant.identity}`)

        // Очищаем предыдущее подключение
        videoRef.current.srcObject = null

        if (isLocal) {
          // Для локального участника создаём новый MediaStream
          const mediaStreamTrack = track.mediaStreamTrack
          if (mediaStreamTrack) {
            const stream = new MediaStream([mediaStreamTrack])
            videoRef.current.srcObject = stream
            console.log(`Локальный ${trackType} подключён через MediaStream`)
          }
        } else {
          // Для удалённых участников используем attach
          track.attach(videoRef.current)
          console.log(`Удалённый ${trackType} подключён через attach`)
        }
        setHasTrack(true)
      } else {
        console.log(`Отключаем ${trackType} для ${participant.name || participant.identity}`)
        if (videoRef.current) {
          videoRef.current.srcObject = null
        }
        setHasTrack(false)
      }

      // Проверка микрофона (только для камеры-тайла)
      if (trackType === 'camera') {
        const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
        const hasAudio = audioPublication?.track && !audioPublication.isMuted
        setIsSpeaking(hasAudio || false)
      }
    }

    // Запускаем сразу
    updateTrack()

    // Слушаем события
    const events = ['trackPublished', 'trackUnpublished', 'trackSubscribed', 'trackUnsubscribed', 'trackMuted', 'trackUnmuted', 'localTrackPublished', 'localTrackUnpublished']
    const listeners = events.map(event => {
      const listener = () => setTimeout(updateTrack, 100)
      participant.on(event as any, listener)
      return { event, listener }
    })

    // Проверяем каждые 500мс
    const interval = setInterval(updateTrack, 500)

    return () => {
      listeners.forEach(({ event, listener }) => participant.off(event as any, listener))
      clearInterval(interval)
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
    }
  }, [participant, isLocal, trackType])

  if (!hasTrack) return null

  const isScreen = trackType === 'screen'
  const title = isScreen ? 'демонстрация экрана' : 'камера'
  const borderColor = isSpeaking && !isScreen ? '#00ff00' : 'transparent'
  const borderWidth = '2px'

  return (
    <div style={{
      background: '#000',
      borderRadius: '8px',
      overflow: 'hidden',
      position: 'relative',
      minHeight: '200px',
      border: `${borderWidth} solid ${borderColor}`,
      transition: 'border 0.3s ease'
    }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal || isSpeaking}  // Мьют для локального, чтобы не эхо
        style={{ width: '100%', height: '100%', objectFit: isScreen ? 'contain' : 'cover' }}
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
        {participant.name || participant.identity} ({title})
        {isLocal && ' (вы)'}
        {isSpeaking && !isScreen && ' 🎤'}
      </div>
    </div>
  )
}
