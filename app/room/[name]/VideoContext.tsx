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
  const videoElements = useRef<Map<string, { camera?: HTMLVideoElement, screen?: HTMLVideoElement }>>(new Map())

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
    
    console.log(`🔄 Подключение ${trackType} для ${participant.name}:`, {
      hasTrack: !!track,
      isLocal,
      isSubscribed: publication?.isSubscribed,
      trackState: track?.getState?.()
    })

    if (!track) {
      console.log(`❌ Нет трека ${trackType} для ${participant.name}`)
      updateParticipant(participant.identity, {
        [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: false,
        [trackType === 'camera' ? 'cameraElement' : 'screenElement']: null
      })
      return
    }

    // Получаем или создаём видео элемент
    const participantElements = videoElements.current.get(participant.identity) || {}
    let video = participantElements[trackType as keyof typeof participantElements]
    
    if (!video) {
      video = document.createElement('video')
      video.autoplay = true
      video.playsInline = true
      video.muted = isLocal
      participantElements[trackType as keyof typeof participantElements] = video
      videoElements.current.set(participant.identity, participantElements)
      console.log(`📺 Создан новый видео элемент ${trackType} для ${participant.name}`)
    }

    // Очищаем предыдущее подключение
    if (video.srcObject) {
      const oldStream = video.srcObject as MediaStream
      oldStream.getTracks().forEach(track => track.stop())
      video.srcObject = null
    }

    try {
      let success = false

      if (isLocal) {
        console.log(`🏠 Локальный участник ${participant.name}, пробуем разные способы подключения ${trackType}`)
        
        // Способ 1: Прямой MediaStream
        const directStream = (track as any).mediaStream
        if (directStream && !success) {
          video.srcObject = directStream
          success = true
          console.log(`✅ Способ 1: MediaStream для ${trackType}`)
        }

        // Способ 2: MediaStreamTrack
        if (!success) {
          const mediaStreamTrack = (track as any).mediaStreamTrack || (track as any)._mediaStreamTrack
          if (mediaStreamTrack) {
            const stream = new MediaStream([mediaStreamTrack])
            video.srcObject = stream
            success = true
            console.log(`✅ Способ 2: MediaStreamTrack для ${trackType}`)
          }
        }

        // Способ 3: Получаем MediaStream из track
        if (!success && (track as any).getMediaStreamTrack) {
          try {
            const mediaStreamTrack = (track as any).getMediaStreamTrack()
            if (mediaStreamTrack) {
              const stream = new MediaStream([mediaStreamTrack])
              video.srcObject = stream
              success = true
              console.log(`✅ Способ 3: getMediaStreamTrack для ${trackType}`)
            }
          } catch (e) {
            console.log(`⚠️ Способ 3 не сработал: ${e}`)
          }
        }

        // Способ 4: Ищем в свойствах track
        if (!success) {
          const trackKeys = Object.keys(track)
          console.log(`🔍 Свойства track:`, trackKeys)
          
          for (const key of trackKeys) {
            const value = (track as any)[key]
            if (value && value.constructor && value.constructor.name === 'MediaStreamTrack') {
              const stream = new MediaStream([value])
              video.srcObject = stream
              success = true
              console.log(`✅ Способ 4: Найден MediaStreamTrack в ${key}`)
              break
            }
          }
        }

        // Способ 5: Fallback через attach
        if (!success) {
          track.attach(video)
          success = true
          console.log(`✅ Способ 5: Fallback attach для ${trackType}`)
        }

      } else {
        // Для удалённого участника
        track.attach(video)
        success = true
        console.log(`✅ Удалённый ${trackType} подключён через attach`)
      }

      if (success) {
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

        console.log(`🎉 ${trackType} успешно подключён для ${participant.name}`)
      }

    } catch (error) {
      console.error(`💥 Ошибка подключения ${trackType}:`, error)
      updateParticipant(participant.identity, {
        [trackType === 'camera' ? 'hasCamera' : 'hasScreen']: false,
        [trackType === 'camera' ? 'cameraElement' : 'screenElement']: null
      })
    }
  }

  const detachTrack = (participant: LocalParticipant | RemoteParticipant, source: Track.Source) => {
    const trackType = source === Track.Source.Camera ? 'camera' : 'screen'
    const participantTracks = trackRefs.current.get(participant.identity)
    const track = participantTracks?.[trackType === 'camera' ? 'camera' : 'screen']
    
    console.log(`🔌 Отключение ${trackType} для ${participant.name}`)

    if (track && !(participant instanceof LocalParticipant)) {
      try {
        const participantElements = videoElements.current.get(participant.identity)
        const video = participantElements?.[trackType as keyof typeof participantElements]
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
    console.log('🔄 Обновление всех треков')
    const allParticipants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
    
    allParticipants.forEach(participant => {
      // Проверяем камеру
      const cameraPublication = participant.getTrackPublication(Track.Source.Camera)
      const cameraTrack = cameraPublication?.track
      
      // Проверяем экран
      const screenPublication = participant.getTrackPublication(Track.Source.ScreenShare)
      const screenTrack = screenPublication?.track
      
      // Проверяем аудио
      const audioPublication = participant.getTrackPublication(Track.Source.Microphone)
      const audioTrack = audioPublication?.track

      console.log(`👤 ${participant.name}: камера=${!!cameraTrack}, экран=${!!screenTrack}, аудио=${!!audioTrack}`)

      // Обрабатываем камеру
      if (cameraTrack) {
        attachTrack(participant, Track.Source.Camera)
      } else {
        detachTrack(participant, Track.Source.Camera)
      }

      // Обрабатываем экран
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
    console.log('🚀 Инициализация VideoProvider')
    
    // Слушаем события комнаты
    const events = [
      'trackPublished', 'trackUnpublished',
      'trackSubscribed', 'trackUnsubscribed', 
      'trackMuted', 'trackUnmuted',
      'localTrackPublished', 'localTrackUnpublished',
      'participantConnected', 'participantDisconnected'
    ]

    events.forEach(event => {
      room.on(event as any, (publication?: any) => {
        console.log(`📡 Событие ${event}:`, publication?.source || 'неизвестно')
        setTimeout(updateAllTracks, 100) // Небольшая задержка для обработки
      })
    })

    // Первоначальное обновление
    setTimeout(updateAllTracks, 500)

    // Регулярная проверка каждую секунду
    const interval = setInterval(updateAllTracks, 1000)

    return () => {
      console.log('🛑 Очистка VideoProvider')
      events.forEach(event => {
        room.off(event as any, updateAllTracks)
      })
      clearInterval(interval)
      
      // Очищаем видео элементы
      videoElements.current.forEach((elements) => {
        Object.values(elements).forEach(video => {
          if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            video.srcObject = null
          }
        })
      })
      videoElements.current.clear()
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
