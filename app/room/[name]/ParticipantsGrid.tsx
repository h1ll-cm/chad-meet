'use client'
import { useEffect, useState, useRef } from 'react'
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
        <ParticipantVideo key={participant.identity} participant={participant} />
      ))}
    </div>
  )
}

function ParticipantVideo({ participant }: { participant: LocalParticipant | RemoteParticipant }) {
  const [remoteVideoElement, setRemoteVideoElement] = useState<HTMLVideoElement | null>(null)
  const [remoteScreenElement, setRemoteScreenElement] = useState<HTMLVideoElement | null>(null)
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null)
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null)
  const [hasRemoteCamera, setHasRemoteCamera] = useState(false)
  const [hasRemoteScreen, setHasRemoteScreen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const isLocal = participant instanceof LocalParticipant

  // Получаем локальные стримы прямо из браузера
  useEffect(() => {
    if (!isLocal) return

    let cameraStream: MediaStream | null = null
    let screenStream: MediaStream | null = null

    const getLocalStreams = async () => {
      // Проверяем какие треки опубликованы в LiveKit
      const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
      const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track

      console.log(`🏠 Локальные треки: камера=${!!cameraTrack}, экран=${!!screenTrack}`)

      // Если есть трек камеры в LiveKit, получаем камеру из браузера
      if (cameraTrack && !localCameraStream) {
        try {
          cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
          setLocalCameraStream(cameraStream)
          console.log(`✅ Получен локальный поток камеры`)
        } catch (error) {
          console.error(`❌ Ошибка получения камеры:`, error)
        }
      } else if (!cameraTrack && localCameraStream) {
        localCameraStream.getTracks().forEach(track => track.stop())
        setLocalCameraStream(null)
      }

      // Если есть трек экрана в LiveKit, получаем экран из браузера
      if (screenTrack && !localScreenStream) {
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
          setLocalScreenStream(screenStream)
          console.log(`✅ Получен локальный поток экрана`)
        } catch (error) {
          console.error(`❌ Ошибка получения экрана:`, error)
        }
      } else if (!screenTrack && localScreenStream) {
        localScreenStream.getTracks().forEach(track => track.stop())
        setLocalScreenStream(null)
      }
    }

    getLocalStreams()

    // Слушаем изменения треков
    const events = ['localTrackPublished', 'localTrackUnpublished']
    events.forEach(event => {
      participant.on(event as any, getLocalStreams)
    })

    const interval = setInterval(getLocalStreams, 3000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, getLocalStreams)
      })
      clearInterval(interval)
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop())
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop())
      }
    }
  }, [participant, isLocal, localCameraStream, localScreenStream])

  // Обрабатываем удалённые треки
  useEffect(() => {
    if (isLocal) return

    const updateRemoteTracks = () => {
      // Камера
      const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
      const cameraTrack = cameraPublication?.track
      
      if (cameraTrack && !remoteVideoElement) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = false
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'cover'

        try {
          cameraTrack.attach(video)
          setRemoteVideoElement(video)
          setHasRemoteCamera(true)
          console.log(`✅ Удалённая камера подключена для ${participant.name}`)
        } catch (error) {
          console.error(`❌ Ошибка подключения удалённой камеры:`, error)
        }
      } else if (!cameraTrack) {
        setHasRemoteCamera(false)
        setRemoteVideoElement(null)
      }

      // Экран
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      if (screenTrack && !remoteScreenElement) {
        const video = document.createElement('video')
        video.autoplay = true
        video.playsInline = true
        video.muted = false
        video.style.width = '100%'
        video.style.height = '100%'
        video.style.objectFit = 'contain'

        try {
          screenTrack.attach(video)
          setRemoteScreenElement(video)
          setHasRemoteScreen(true)
          console.log(`✅ Удалённый экран подключен для ${participant.name}`)
        } catch (error) {
          console.error(`❌ Ошибка подключения удалённого экрана:`, error)
        }
      } else if (!screenTrack) {
        setHasRemoteScreen(false)
        setRemoteScreenElement(null)
      }

      // Аудио
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      setIsSpeaking(!!audioPublication?.track && !audioPublication.isMuted)
    }

    updateRemoteTracks()

    const events = ['trackPublished', 'trackUnpublished', 'trackSubscribed', 'trackUnsubscribed']
    events.forEach(event => {
      participant.on(event as any, updateRemoteTracks)
    })

    const interval = setInterval(updateRemoteTracks, 2000)

    return () => {
      events.forEach(event => {
        participant.off(event as any, updateRemoteTracks)
      })
      clearInterval(interval)
    }
  }, [participant, isLocal, remoteVideoElement, remoteScreenElement])

  const tiles = []

  // Тайл камеры
  if (isLocal) {
    // Локальная камера
    tiles.push(
      <LocalVideoTile
        key="local-camera"
        stream={localCameraStream}
        participant={participant}
        type="camera"
        isSpeaking={isSpeaking}
      />
    )
    // Локальный экран
    if (localScreenStream) {
      tiles.push(
        <LocalVideoTile
          key="local-screen"
          stream={localScreenStream}
          participant={participant}
          type="screen"
          isSpeaking={false}
        />
      )
    }
  } else {
    // Удалённая камера
    tiles.push(
      <RemoteVideoTile
        key="remote-camera"
        videoElement={remoteVideoElement}
        hasVideo={hasRemoteCamera}
        participant={participant}
        type="camera"
        isSpeaking={isSpeaking}
      />
    )
    // Удалённый экран
    if (hasRemoteScreen && remoteScreenElement) {
      tiles.push(
        <RemoteVideoTile
          key="remote-screen"
          videoElement={remoteScreenElement}
          hasVideo={hasRemoteScreen}
          participant={participant}
          type="screen"
          isSpeaking={false}
        />
      )
    }
  }

  return <>{tiles}</>
}

function LocalVideoTile({ 
  stream, 
  participant, 
  type, 
  isSpeaking 
}: {
  stream: MediaStream | null
  participant: LocalParticipant
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
      console.log(`📺 Локальный ${type} поток подключен к видео элементу`)
    }
  }, [stream, type])

  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'

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
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={true}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: type === 'screen' ? 'contain' : 'cover' 
          }}
        />
      ) : (
        type === 'camera' && (
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
        )
      )}
      
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
        {type === 'screen' && ' (экран)'}
        {' (вы)'}
        {isSpeaking && type === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}

function RemoteVideoTile({ 
  videoElement, 
  hasVideo, 
  participant, 
  type, 
  isSpeaking 
}: {
  videoElement: HTMLVideoElement | null
  hasVideo: boolean
  participant: RemoteParticipant
  type: 'camera' | 'screen'
  isSpeaking: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current && videoElement && hasVideo) {
      containerRef.current.innerHTML = ''
      containerRef.current.appendChild(videoElement)
    }
  }, [videoElement, hasVideo])

  const borderColor = isSpeaking && type === 'camera' ? '#00ff00' : 'transparent'

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
      transition: 'border 0.3s ease',
      marginBottom: '10px'
    }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }}>
        {!hasVideo && type === 'camera' && (
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
        {type === 'screen' && ' (экран)'}
        {isSpeaking && type === 'camera' && ' 🎤'}
      </div>
    </div>
  )
}
