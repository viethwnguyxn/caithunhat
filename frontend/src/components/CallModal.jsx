import { useEffect, useRef, useState } from 'react'
import api from '../services/api'

const avatarFor = (partner) =>
  partner?.avatar_url ||
  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`

export default function CallModal({
  callSession,
  callClient,
  currentUserId,
  callError,
  onEndCall,
}) {
  const [callStatus, setCallStatus] = useState(
    callSession.mode === 'outgoing' ? 'calling' : 'incoming'
  )
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteMediaRef = useRef(null)
  const callRef = useRef(null)
  const mediaTracksRef = useRef(new Set())
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const ringIntervalRef = useRef(null)
  const ringContextRef = useRef(null)
  const ringTimeoutRef = useRef(null)
  const endCallRef = useRef(null)
  const finalizeTimeoutRef = useRef(null)
  const durationTimerRef = useRef(null)
  const durationRef = useRef(0)
  const statusRef = useRef(callSession.mode === 'outgoing' ? 'calling' : 'incoming')
  const callStartedRef = useRef(false)
  const finalizedRef = useRef(false)
  const endingReasonRef = useRef(null)

  const isVideoCall = callSession.callType === 'video'
  const partner = callSession.partner

  const updateStatus = (status) => {
    statusRef.current = status
    setCallStatus(status)
  }

  const stopRinging = () => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current)
      ringIntervalRef.current = null
    }
    if (ringContextRef.current) {
      ringContextRef.current.close().catch((error) => {
        console.warn('Không thể đóng âm thanh chuông:', error)
      })
      ringContextRef.current = null
    }
  }

  const playRing = (incoming) => {
    stopRinging()
    const playTone = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return
        const context = ringContextRef.current || new AudioContext()
        ringContextRef.current = context
        if (context.state === 'suspended') {
          context.resume().catch((error) => {
            console.warn('Không thể kích hoạt âm thanh chuông:', error)
          })
        }

        const now = context.currentTime
        const frequencies = incoming ? [523.25, 659.25, 783.99] : [440]
        frequencies.forEach((frequency, index) => {
          const oscillator = context.createOscillator()
          const gain = context.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.setValueAtTime(frequency, now)
          gain.gain.setValueAtTime(incoming ? 0.06 : 0.04, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
          oscillator.connect(gain)
          gain.connect(context.destination)
          oscillator.start(now + index * 0.02)
          oscillator.stop(now + 0.45)
        })
      } catch (error) {
        console.warn('Không thể phát âm thanh chuông:', error)
      }
    }

    playTone()
    ringIntervalRef.current = setInterval(playTone, incoming ? 2000 : 3500)
  }

  const cleanupMedia = () => {
    stopRinging()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop())
      remoteStreamRef.current = null
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    if (remoteMediaRef.current) {
      remoteMediaRef.current.pause()
      remoteMediaRef.current.srcObject = null
    }
    mediaTracksRef.current.forEach((track) => {
      try {
        track.detachAndRemove()
      } catch (error) {
        console.warn('Không thể gỡ media track Stringee:', error)
      }
    })
    mediaTracksRef.current.clear()
    localVideoRef.current?.replaceChildren()
    remoteVideoRef.current?.replaceChildren()
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    if (finalizeTimeoutRef.current) clearTimeout(finalizeTimeoutRef.current)
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
  }

  const recordCallResult = async (reason) => {
    if (callSession.mode !== 'outgoing') return

    let outcome = null
    if (reason === 'busy') outcome = 'busy'
    else if (reason === 'declined') outcome = 'declined'
    else if (reason === 'no_answer') outcome = 'missed'
    else if (durationRef.current > 0 || statusRef.current === 'connected') {
      outcome = 'completed'
    }
    if (!outcome) return true

    try {
      await api.post(`/api/calls/${callSession.conversationId}/events`, {
        call_type: callSession.callType,
        outcome,
        duration_seconds: durationRef.current,
      })
      return true
    } catch (error) {
      console.error('Không thể lưu lịch sử cuộc gọi:', error)
      setErrorMessage('Cuộc gọi đã kết thúc nhưng không thể lưu lịch sử.')
      return false
    }
  }

  const finalizeCall = async (reason, shouldRecord) => {
    if (finalizedRef.current) return
    finalizedRef.current = true
    const recorded = !shouldRecord || (await recordCallResult(reason))
    cleanupMedia()
    if (!recorded) {
      updateStatus('ended')
      finalizeTimeoutRef.current = setTimeout(() => {
        onEndCall({ duration: durationRef.current, reason })
      }, 2500)
      return
    }
    onEndCall({ duration: durationRef.current, reason })
  }

  const finalizeCallRef = useRef(finalizeCall)
  finalizeCallRef.current = finalizeCall

  const attachCallEvents = (call) => {
    callRef.current = call
    const attachVideoTrack = (track, container, isLocal) => {
      if (!container) return
      const element = track.attach()
      element.autoplay = true
      element.playsInline = true
      element.muted = isLocal
      element.style.width = '100%'
      element.style.height = '100%'
      element.style.objectFit = 'cover'
      if (isLocal) element.style.transform = 'scaleX(-1)'
      container.appendChild(element)
      mediaTracksRef.current.add(track)
    }

    if (isVideoCall) {
      call.on('addlocaltrack', (track) => {
        attachVideoTrack(track, localVideoRef.current, true)
      })
      call.on('addremotetrack', (track) => {
        attachVideoTrack(track, remoteVideoRef.current, false)
      })
      call.on('removelocaltrack', (track) => {
        mediaTracksRef.current.delete(track)
        track.detachAndRemove()
      })
      call.on('removeremotetrack', (track) => {
        mediaTracksRef.current.delete(track)
        track.detachAndRemove()
      })
    }

    call.on('addlocalstream', (stream) => {
      localStreamRef.current = stream
    })
    call.on('addremotestream', (stream) => {
      remoteStreamRef.current = stream
      stopRinging()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)

      if (remoteMediaRef.current) {
        remoteMediaRef.current.srcObject = stream
        remoteMediaRef.current.play().catch((error) => {
          console.error('Không thể phát media đối phương:', error)
          setErrorMessage('Trình duyệt chưa phát được âm thanh. Hãy kiểm tra quyền âm thanh và thử lại.')
        })
      }
    })
    call.on('signalingstate', (state) => {
      console.info('Stringee signalingstate:', state)
      if (state?.code === 3) {
        updateStatus('connected')
        stopRinging()
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
      } else if (state?.code === 5) {
        endingReasonRef.current = 'busy'
        setErrorMessage('Đối phương đang bận hoặc đã từ chối cuộc gọi.')
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
        finalizeTimeoutRef.current = setTimeout(() => {
          void finalizeCallRef.current('busy', true)
        }, 2000)
      } else if (state?.code === 6) {
        const connected = statusRef.current === 'connected'
        const reason =
          endingReasonRef.current || (connected ? 'remote_ended' : 'no_answer')
        void finalizeCallRef.current(reason, true)
      }
    })
    call.on('mediastate', (state) => {
      console.info('Stringee mediastate:', state)
    })
    call.on('error', (info) => {
      console.error('Stringee call error:', info)
      setErrorMessage(info?.message || 'Cuộc gọi gặp lỗi.')
    })
    call.on('otherdevice', (data) => {
      if (data?.type === 'CALL_END') {
        void finalizeCallRef.current('remote_ended', true)
      }
    })
  }

  useEffect(() => {
    if (callSession.mode === 'incoming' && callSession.stringeeCall) {
      if (callRef.current !== callSession.stringeeCall) {
        attachCallEvents(callSession.stringeeCall)
      }
      return
    }
    if (callSession.mode !== 'outgoing' || !callClient || callStartedRef.current) return

    let isCancelled = false
    callStartedRef.current = true
    import('stringee')
    .then(({ StringeeCall, StringeeCall2 }) => {
        if (isCancelled) return
      const CallConstructor = isVideoCall ? StringeeCall2 : StringeeCall
      const call = isVideoCall
        ? new CallConstructor(
            callClient,
            String(currentUserId),
            String(partner?.id),
            true
          )
        : new CallConstructor(callClient, String(currentUserId), String(partner?.id))
      attachCallEvents(call)
        call.makeCall((result) => {
          if (result?.r !== 0) {
            const message = result?.message || 'Stringee không thể bắt đầu cuộc gọi.'
            console.error('Stringee makeCall thất bại:', result)
            setErrorMessage(message)
            finalizeTimeoutRef.current = setTimeout(() => {
              void finalizeCallRef.current('error', false)
            }, 2500)
          }
        })
      })
      .catch((error) => {
        if (isCancelled) return
        console.error('Không thể khởi tạo cuộc gọi Stringee:', error)
        setErrorMessage(error.message || 'Không thể khởi tạo cuộc gọi.')
        setTimeout(() => {
          void finalizeCallRef.current('error', false)
        }, 2500)
      })

    return () => {
      isCancelled = true
    }
  }, [callClient, callSession, currentUserId, isVideoCall, partner?.id])

  useEffect(() => {
    if (callError && callSession.mode === 'outgoing' && !callStartedRef.current) {
      setErrorMessage(callError)
      const timeout = setTimeout(() => {
        void finalizeCallRef.current('error', false)
      }, 3000)
      return () => clearTimeout(timeout)
    }
  }, [callError, callSession.mode])

  useEffect(() => {
    if (callStatus === 'incoming') {
      playRing(true)
    } else if (callStatus === 'calling' || callStatus === 'ringing') {
      playRing(false)
      ringTimeoutRef.current = setTimeout(() => {
        endCallRef.current?.('no_answer')
      }, 45000)
    } else {
      stopRinging()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    }

    return () => {
      stopRinging()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    }
  }, [callStatus])

  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => {
        durationRef.current += 1
        setDuration(durationRef.current)
      }, 1000)
    } else if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
  }, [callStatus])

  useEffect(
    () => () => {
      cleanupMedia()
    },
    []
  )

  const handleAcceptCall = () => {
    const call = callRef.current
    if (!call) {
      setErrorMessage('Không tìm thấy phiên gọi Stringee.')
      return
    }
    updateStatus('connecting')
    call.answer((result) => {
      if (result?.r !== 0) {
        const message = result?.message || 'Không thể trả lời cuộc gọi.'
        console.error('Stringee answer thất bại:', result)
        setErrorMessage(message)
      }
    })
  }

  const handleRejectCall = () => {
    const call = callRef.current
    if (call) {
      call.reject((result) => {
        if (result?.r !== 0) {
          console.error('Stringee reject thất bại:', result)
        }
      })
    }
    void finalizeCall('declined', false)
  }

  const handleEndCall = (reason = 'user_hangup') => {
    const finalReason =
      reason === 'user_hangup' &&
      callSession.mode === 'outgoing' &&
      statusRef.current !== 'connected'
        ? 'no_answer'
        : reason
    const call = callRef.current
    if (call) {
      call.hangup((result) => {
        if (result?.r !== 0) {
          console.error('Stringee hangup thất bại:', result)
        }
      })
    }
    void finalizeCall(finalReason, true)
  }
  endCallRef.current = handleEndCall

  const toggleMute = () => {
    const nextMuted = !isMuted
    callRef.current?.mute(nextMuted)
    setIsMuted(nextMuted)
  }

  const toggleCamera = () => {
    const nextCameraOff = !isCameraOff
    callRef.current?.enableLocalVideo(!nextCameraOff)
    setIsCameraOff(nextCameraOff)
  }

  const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainder = seconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
  }

  const statusText =
    callStatus === 'connected'
      ? formatDuration(duration)
      : callStatus === 'connecting'
      ? 'Đang kết nối...'
      : errorMessage || (callStatus === 'incoming' ? 'Cuộc gọi đến' : 'Đang đổ chuông...')

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        color: '#fff',
        fontFamily: 'inherit',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {isVideoCall ? (
        <audio ref={remoteMediaRef} autoPlay playsInline />
      ) : (
        <video
          ref={remoteMediaRef}
          autoPlay
          playsInline
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      )}

      {callStatus === 'incoming' ? (
        <section
          style={{
            width: 'min(380px, 100%)',
            padding: 36,
            textAlign: 'center',
            border: '1px solid #334155',
            borderRadius: 24,
            background: '#1e293b',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,.5)',
          }}
        >
          <img
            src={avatarFor(partner)}
            alt=""
            style={{
              width: 100,
              height: 100,
              margin: '0 auto 20px',
              border: '3px solid #00ff88',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>
            {partner?.display_name || partner?.username}
          </h2>
          <p style={{ margin: '0 0 28px', color: '#94a3b8' }}>
            {isVideoCall ? 'Cuộc gọi video đến' : 'Cuộc gọi thoại đến'}
          </p>
          {errorMessage && <p role="alert">{errorMessage}</p>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <button type="button" onClick={handleRejectCall} style={buttonStyle('#ef4444')} title="Từ chối cuộc gọi">
              ✕
            </button>
            <button type="button" onClick={handleAcceptCall} style={buttonStyle('#10b981')} title="Trả lời cuộc gọi">
              📞
            </button>
          </div>
        </section>
      ) : (
        <section
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            width: 'min(960px, 100%)',
            minHeight: isVideoCall ? 'min(680px, 85vh)' : 440,
            overflow: 'hidden',
            border: '1px solid #1e293b',
            borderRadius: 24,
            background: '#0f172a',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,.7)',
          }}
        >
          <header
            style={{
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '20px 24px',
              background: 'linear-gradient(to bottom, rgba(0,0,0,.8), transparent)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src={avatarFor(partner)} alt="" style={avatarStyle(40)} />
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>
                  {partner?.display_name || partner?.username}
                </h3>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{statusText}</span>
              </div>
            </div>
            {callStatus === 'connected' && <span style={liveStyle}>● LIVE</span>}
          </header>

          <main
            style={{
              position: 'relative',
              display: 'flex',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: isVideoCall ? 280 : 220,
              overflow: 'hidden',
              background: '#090d16',
            }}
          >
            {isVideoCall ? (
              <>
                <div
                  ref={remoteVideoRef}
                  style={{ position: 'absolute', inset: 0 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    width: 140,
                    height: 190,
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,.2)',
                    borderRadius: 16,
                    background: '#1e293b',
                  }}
                >
                  <div
                    ref={localVideoRef}
                    style={{
                      display: isCameraOff ? 'none' : 'block',
                      width: '100%',
                      height: '100%',
                    }}
                  />
                  {isCameraOff && <div style={{ padding: 16, color: '#94a3b8' }}>Camera tắt</div>}
                </div>
              </>
            ) : (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <img
                  src={avatarFor(partner)}
                  alt=""
                  style={{
                    ...avatarStyle(130),
                    marginBottom: 20,
                    border: '3px solid #00ff88',
                  }}
                />
                <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>
                  {partner?.display_name || partner?.username}
                </h3>
                <p style={{ margin: 0, color: '#94a3b8' }}>
                  {errorMessage || statusText}
                </p>
              </div>
            )}
          </main>

          <footer style={{ display: 'flex', justifyContent: 'center', gap: 20, padding: 24 }}>
            <button
              type="button"
              onClick={toggleMute}
              style={buttonStyle(isMuted ? '#ef4444' : 'rgba(255,255,255,.15)')}
              title={isMuted ? 'Bật mic' : 'Tắt mic'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>
            {isVideoCall && (
              <button
                type="button"
                onClick={toggleCamera}
                style={buttonStyle(isCameraOff ? '#ef4444' : 'rgba(255,255,255,.15)')}
                title={isCameraOff ? 'Bật camera' : 'Tắt camera'}
              >
                {isCameraOff ? '🚫' : '📷'}
              </button>
            )}
            <button
              type="button"
              onClick={() => handleEndCall('user_hangup')}
              style={buttonStyle('#ef4444')}
              title="Kết thúc cuộc gọi"
            >
              📞
            </button>
          </footer>
        </section>
      )}
    </div>
  )
}

function buttonStyle(backgroundColor) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    padding: 0,
    border: 0,
    borderRadius: '50%',
    backgroundColor,
    color: '#fff',
    fontSize: 22,
    cursor: 'pointer',
  }
}

function avatarStyle(size) {
  return {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
  }
}

const liveStyle = {
  padding: '4px 10px',
  borderRadius: 20,
  backgroundColor: '#10b981',
  color: '#fff',
  fontSize: 11,
  fontWeight: 700,
}
