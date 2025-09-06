'use client'
import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { LocalParticipant, RemoteParticipant, Track, Room } from 'livekit-client'

interface ParticipantState {
  id: string
  name: string
  isLocal: boolean
  hasCamera: boolean
  hasScreen: boolean
  hasAudio: boolean
  isSpeaking: boolean
  cameraElement: HTMLVideoElement | null
  screenElement: HTMLVideoElement | null
}

interface VideoContextType {
  participants: Map<string, ParticipantState>
  updateParticipant: (id: string, updates: Partial<ParticipantState>) => void
}

const VideoContext = createContext<VideoContextType | null>(null)

export function VideoProvider({ children, room }: { children: React.ReactNode, room: Room }) {
  const [participants, setParticipants] = useState<Map<string, ParticipantState>>(new Map())
  const trackRefs = useRef<Map<string, { camera?: any, screen?: any }>>(new Map())

  const updateParticipant = (id: string, updates: Partial<ParticipantState>) => {
    setParticipants(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(id) || {
        id,
        name: id,
        isLocal: false,
        hasCamera: false,
        hasScreen: false,
        hasAudio: false,
        isSpeaking: false,
        cameraElement: null,
        screenElement: null
      }
      newMap.set(id, { ...existing, ...updates })
      return newMap
    })
  }

  const attachTrack = async (participant: LocalParticipant | RemoteParticipant, source: Track.Source) => {
    const publication = participant.getTrackPublication(source)
    const track = publication?.track
    const isLocal = participant instanceof LocalParticipant
    const trackType = source === Track.Source.Camera ? 'camera' : 'screen'
    
    console.log(`Подключение ${trackType} для ${participant.name}:`, {
      hasTrack: !!track,
      isLocal,
      isSubscribed: publication?.isSubscribed
    })

    if (!track) {
      updateParticipant(participant.identity, {
        [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: false
      })
      return
    }

    // Создаём видео элемент
    const video = document.createElement('video')
    video.autoplay = true
    video.playsInline = true
    video.muted = isLocal

    try {
      if (isLocal) {
        // Для локального участника
        const mediaStreamTrack = (track as any).mediaStreamTrack
        if (mediaStreamTrack) {
          const stream = new MediaStream([mediaStreamTrack])
          video.srcObject = stream
          console.log(`✅ Локальный ${trackType} подключён`)
        } else {
          track.attach(video)
          console.log(`✅ Локальный ${trackType} подключён через attach`)
        }
      } else {
        // Для удалённого участника
        track.attach(video)
        console.log(`✅ Удалённый ${trackType} подключён`)
      }

      // Сохраняем ссылку на трек
      const participantTracks = trackRefs.current.get(participant.identity) || {}
      participantTracks[trackType === 'camera' ? 'camera' : 'screen'] = track
      trackRefs.current.set(participant.identity, participantTracks)

      updateParticipant(participant.identity, {
        name: participant.name || participant.identity,
        isLocal,
        [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: true,
        [trackType === 'camera' ? 'cameraElement' : 'screenElement']: video
      })

    } catch (error) {
      console.error(`Ошибка подключения ${trackType}:`, error)
      updateParticipant(participant.identity, {
        [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: false
      })
    }
  }

  const detachTrack = (participant: LocalParticipant | RemoteParticipant, source: Track.Source) => {
    const trackType = source === Track.Source.Camera ? 'camera' : 'screen'
    const participantTracks = trackRefs.current.get(participant.identity)
    const track = participantTracks?.[trackType === 'camera' ? 'camera' : 'screen']
    
    if (track && !(participant instanceof LocalParticipant)) {
      try {
        const video = participants.get(participant.identity)?.[trackType === 'camera' ? 'cameraElement' : 'screenElement']
        if (video) {
          track.detach(video)
        }
      } catch (error) {
        console.error(`Ошибка отключения ${trackType}:`, error)
      }
    }

    updateParticipant(participant.identity, {
      [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: false,
      [trackType === 'camera' ? 'cameraElement' : 'screenElement']: null
    })
  }

  const updateAllTracks = () => {
    const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
    
    allParticipants.forEach(participant => {
      // Проверяем камеру
      const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track
      const screenTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track
      const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track

      if (cameraTrack) {
        attachTrack(participant, Track.Source.Camera)
      } else {
        detachTrack(participant, Track.Source.Camera)
      }

      if (screenTrack) {
        attachTrack(participant, Track.Source.ScreenShare)
      } else {
        detachTrack(participant, Track.Source.ScreenShare)
      }

      // Обновляем состояние аудио
      updateParticipant(participant.identity, {
        hasAudio: !!audioTrack && !audioTrack.isMuted,
        isSpeaking: !!audioTrack && !audioTrack.isMuted
      })
    })
  }

  useEffect(() => {
    // Слушаем события комнаты
    const events = [
      'trackPublished', 'trackUnpublished',
      'trackSubscribed', 'trackUnsubscribed',
      'trackMuted', 'trackUnmuted',
      'localTrackPublished', 'localTrackUnpublished',
      'participantConnected', 'participantDisconnected'
    ]

    events.forEach(event => {
      room.on(event as any, updateAllTracks)
    })

    // Первоначальное обновление
    updateAllTracks()

    // Регулярная проверка каждые 2 секунды
    const interval = setInterval(updateAllTracks, 2000)

    return () => {
      events.forEach(event => {
        room.off(event as any, updateAllTracks)
      })
      clearInterval(interval)
    }
  }, [room])

  return (
    <VideoContext.Provider value={{ participants, updateParticipant }}>
      {children}
    </VideoContext.Provider>
  )
}

export function useVideo() {
  const context = useContext(VideoContext)
  if (!context) {
    throw new Error('useVideo must be used within VideoProvider')
  }
  return context
}
