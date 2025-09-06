'use client'
import { useState, useEffect } from 'react'
import { Room, TrackSource, LocalTrackPublication } from 'livekit-client'

interface ControlsComponentProps {
  room: Room
}

export default function ControlsComponent({ room }: ControlsComponentProps) {
  const localParticipant = room.localParticipant

  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [micEnabled, setMicEnabled] = useState(false)
  const [screenEnabled, setScreenEnabled] = useState(false)

  useEffect(() => {
    // Автоматическое обновление состояний
    const updateStates = () => {
      setCameraEnabled(localParticipant.isCameraEnabled)
      setMicEnabled(localParticipant.isMicrophoneEnabled)
      setScreenEnabled(!!localParticipant.getTrackPublication(Track.Source.ScreenShare))
    }

    updateStates()

    const events = [
      'localTrackPublished', 'localTrackUnpublished',
      'trackMuted', 'trackUnmuted'
    ]

    events.forEach(event => {
      localParticipant.on(event as any, updateStates)
    })

    return () => {
      events.forEach(event => {
        localParticipant.off(event as any, updateStates)
      })
    }
  }, [localParticipant])

  const toggleCamera = async () => {
    if (cameraEnabled) {
      localParticipant.setCameraEnabled(false)
    } else {
      await localParticipant.setCameraEnabled(true)
    }
    setCameraEnabled(!cameraEnabled)
  }

  const toggleMic = async () => {
    if (micEnabled) {
      localParticipant.setMicrophoneEnabled(false)
    } else {
      await localParticipant.setMicrophoneEnabled(true)
    }
    setMicEnabled(!micEnabled)
  }

  const toggleScreen = async () => {
    if (screenEnabled) {
      const screenPub = localParticipant.getTrackPublication(Track.Source.ScreenShare)
      if (screenPub) {
        await localParticipant.unpublishTrack(screenPub.track)
      }
      setScreenEnabled(false)
    } else {
      const tracks = await room.localParticipant.publishTracks([{
        source: Track.Source.ScreenShare,
        video: true,
        audio: true  // Опционально, если нужен звук экрана
      }])
      setScreenEnabled(!!tracks.length)
    }
  }

  return (
    <div style={{
      background: '#222',
      borderRadius: '8px',
      padding: '1rem',
      display: 'flex',
      justifyContent: 'space-around'
    }}>
      <button 
        onClick={toggleCamera} 
        style={{
          background: cameraEnabled ? '#00ff00' : '#ff0000',
          color: 'white',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {cameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
      </button>

      <button 
        onClick={toggleMic} 
        style={{
          background: micEnabled ? '#00ff00' : '#ff0000',
          color: 'white',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {micEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
      </button>

      <button 
        onClick={toggleScreen} 
        style={{
          background: screenEnabled ? '#00ff00' : '#ff0000',
          color: 'white',
          padding: '0.5rem 1rem',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {screenEnabled ? 'Остановить экран' : 'Поделиться экраном'}
      </button>
    </div>
  )
}
