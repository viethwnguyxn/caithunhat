import { useState, useEffect, useRef } from 'react'

// Cấu hình Google STUN servers miễn phí cho WebRTC
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
}

// Bộ tạo âm thanh chuông gọi điện bằng Web Audio API an toàn, triệt tiêu tiếng tít khi ngắt máy
class CallAudioSynthesizer {
  constructor() {
    this.ctx = null
    this.intervalId = null
    this.activeOscillators = new Set()
    this.masterGain = null
  }

  ensureContext() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext
        if (AudioCtx) this.ctx = new AudioCtx()
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume()
      }
      if (this.ctx && !this.masterGain) {
        this.masterGain = this.ctx.createGain()
        this.masterGain.gain.setValueAtTime(1, this.ctx.currentTime)
        this.masterGain.connect(this.ctx.destination)
      }
    } catch (e) {}
  }

  // Âm chuông cuộc gọi đến (Nhạc chuông vui tai)
  playIncomingRing() {
    this.stop()
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return

    const playChime = () => {
      try {
        if (!this.ctx || !this.masterGain) return
        const t = this.ctx.currentTime
        const osc1 = this.ctx.createOscillator()
        const osc2 = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc1.type = 'sine'
        osc2.type = 'triangle'
        osc1.frequency.setValueAtTime(523.25, t) // C5
        osc1.frequency.exponentialRampToValueAtTime(659.25, t + 0.2) // E5
        osc2.frequency.setValueAtTime(783.99, t) // G5

        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(this.masterGain)

        this.activeOscillators.add(osc1)
        this.activeOscillators.add(osc2)

        const cleanup = () => {
          this.activeOscillators.delete(osc1)
          this.activeOscillators.delete(osc2)
          try {
            osc1.disconnect()
            osc2.disconnect()
            gain.disconnect()
          } catch (e) {}
        }
        osc1.onended = cleanup
        osc2.onended = cleanup

        osc1.start(t)
        osc2.start(t)
        osc1.stop(t + 0.5)
        osc2.stop(t + 0.5)
      } catch (e) {}
    }

    playChime()
    this.intervalId = setInterval(playChime, 2000)
  }

  // Âm chuông chờ đổ máy bên phía người gọi (Ringback tone tút... tút...)
  playOutgoingRingback() {
    this.stop()
    this.ensureContext()
    if (!this.ctx || !this.masterGain) return

    const playBeep = () => {
      try {
        if (!this.ctx || !this.masterGain) return
        const t = this.ctx.currentTime
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()

        osc.type = 'sine'
        osc.frequency.setValueAtTime(440, t)

        gain.gain.setValueAtTime(0.08, t)
        gain.gain.setValueAtTime(0.08, t + 1.0)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)

        osc.connect(gain)
        gain.connect(this.masterGain)

        this.activeOscillators.add(osc)
        osc.onended = () => {
          this.activeOscillators.delete(osc)
          try {
            osc.disconnect()
            gain.disconnect()
          } catch (e) {}
        }

        osc.start(t)
        osc.stop(t + 1.1)
      } catch (e) {}
    }

    playBeep()
    this.intervalId = setInterval(playBeep, 3500)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    // Dừng và ngắt kết nối NGAY LẬP TỨC toàn bộ oscillator đang phát
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop()
        osc.disconnect()
      } catch (e) {}
    })
    this.activeOscillators.clear()

    // Khóa master gain và ngắt kết nối khỏi destination
    if (this.masterGain && this.ctx) {
      try {
        this.masterGain.gain.cancelScheduledValues(0)
        this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime)
        this.masterGain.disconnect()
      } catch (e) {}
      this.masterGain = null
    }
  }
}

const audioSynth = new CallAudioSynthesizer()

export default function CallModal({
  callSession, // { mode: 'outgoing'|'incoming', callType: 'audio'|'video', partner, sdp, conversationId }
  onEndCall,
  onSendSignal,
  onRegisterSignalListener, // Đăng ký nhận signal trực tiếp từ WebSocket (chống mất gói tin do React state batching)
}) {
  const [callStatus, setCallStatus] = useState(
    callSession.mode === 'outgoing' ? 'calling' : callSession.mode
  ) // 'calling' | 'incoming' | 'connected' | 'ended'
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [duration, setDuration] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const remoteAudioRef = useRef(null)

  const peerConnectionRef = useRef(null)
  const localStreamRef = useRef(null)
  const remoteStreamRef = useRef(null)
  const iceCandidateQueueRef = useRef([]) // Hàng đợi ICE candidate khi remote description chưa sẵn sàng
  const ringTimeoutRef = useRef(null)
  const durationTimerRef = useRef(null)

  const isVideoCall = callSession.callType === 'video'
  const partner = callSession.partner

  // 1. Quản lý âm thanh chuông & Timeout 45s cuộc gọi
  useEffect(() => {
    if (callStatus === 'incoming') {
      audioSynth.playIncomingRing()
    } else if (callStatus === 'calling') {
      audioSynth.playOutgoingRingback()

      // Tự động hủy nếu đối phương không nhấc máy sau 45 giây (đủ thời gian cho người nhận kịp bấm)
      ringTimeoutRef.current = setTimeout(() => {
        handleEndCall('no_answer')
      }, 45000)
    } else {
      audioSynth.stop()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    }

    return () => {
      audioSynth.stop()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    }
  }, [callStatus])

  // 2. Dọn dẹp âm thanh triệt để khi component unmount
  useEffect(() => {
    return () => {
      audioSynth.stop()
    }
  }, [])

  // 3. Bộ đếm thời gian khi cuộc gọi kết nối
  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1)
      }, 1000)
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }

    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current)
    }
  }, [callStatus])

  // 4. Đồng bộ Stream vào DOM Video / Audio element (Giải quyết màn hình đen & không tiếng)
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current && isVideoCall) {
      localVideoRef.current.srcObject = localStreamRef.current
      localVideoRef.current.play().catch(() => {})
    }
  }, [callStatus, isVideoCall])

  useEffect(() => {
    if (remoteStreamRef.current) {
      if (remoteVideoRef.current && isVideoCall) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current
        remoteVideoRef.current.play().catch(() => {})
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStreamRef.current
        remoteAudioRef.current.play().catch(() => {})
      }
    }
  }, [callStatus, isVideoCall])

  // 5. Khởi tạo WebRTC PeerConnection
  const initPeerConnection = () => {
    if (peerConnectionRef.current) return peerConnectionRef.current

    const pc = new RTCPeerConnection(RTC_CONFIG)
    peerConnectionRef.current = pc

    // Gửi ICE candidate tới đối phương qua WebSocket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        onSendSignal({
          type: 'call:ice_candidate',
          candidate: event.candidate,
          call_type: callSession.callType,
        })
      }
    }

    // Nhận stream Audio/Video từ đối phương
    pc.ontrack = (event) => {
      const stream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track])
      remoteStreamRef.current = stream

      if (remoteVideoRef.current && isVideoCall) {
        remoteVideoRef.current.srcObject = stream
        remoteVideoRef.current.play().catch(() => {})
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream
        remoteAudioRef.current.play().catch(() => {})
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setCallStatus('connected')
        audioSynth.stop()
        if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
      } else if (pc.connectionState === 'failed') {
        // CHỈ ngắt cuộc gọi nếu ĐÃ KẾT NỐI mà bị rớt mạng. Tuyệt đối KHÔNG ngắt khi đang đổ chuông chờ nghe!
        if (callStatus === 'connected') {
          setTimeout(() => {
            if (peerConnectionRef.current && peerConnectionRef.current.connectionState === 'failed') {
              handleEndCall('connection_lost')
            }
          }, 4000)
        }
      }
    }

    return pc
  }

  // 6. Lấy Media Stream từ Microphone / Camera (có cơ chế fallback an toàn nếu Camera đang bận)
  const getMediaStream = async (wantVideo) => {
    try {
      if (wantVideo) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: 'user',
            },
          })
          localStreamRef.current = stream

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream
            localVideoRef.current.play().catch(() => {})
          }

          return stream
        } catch (camErr) {
          console.warn('Camera đang bận hoặc không khả dụng, tự động fallback sang Mic:', camErr)
          // Fallback sang Voice nếu Camera đang bị ứng dụng/tab khác giữ
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          localStreamRef.current = audioOnlyStream
          return audioOnlyStream
        }
      } else {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        localStreamRef.current = audioStream
        return audioStream
      }
    } catch (err) {
      console.warn('Lỗi lấy Microphone:', err)
      throw new Error('Vui lòng cấp quyền Microphone để đàm thoại.')
    }
  }

  // 7. Khởi tạo cuộc gọi đi (Outgoing Call)
  const startOutgoingCall = async () => {
    try {
      const stream = await getMediaStream(isVideoCall)
      const pc = initPeerConnection()

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      onSendSignal({
        type: 'call:offer',
        call_type: callSession.callType,
        sdp: offer,
      })
    } catch (err) {
      setErrorMessage(err.message || 'Không thể bắt đầu cuộc gọi')
      setTimeout(() => handleEndCall('error'), 3000)
    }
  }

  // 8. Chấp nhận cuộc gọi đến (Accept Call)
  const handleAcceptCall = async () => {
    audioSynth.stop()
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    setCallStatus('connected')

    try {
      const stream = await getMediaStream(isVideoCall)
      const pc = initPeerConnection()

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      if (callSession.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(callSession.sdp))

        // Áp dụng các ICE candidate đã nhận được trong lúc chờ nghe máy
        while (iceCandidateQueueRef.current.length > 0) {
          const cand = iceCandidateQueueRef.current.shift()
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand))
          } catch (e) {
            console.warn('Lỗi thêm queued ICE candidate on accept:', e)
          }
        }

        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        onSendSignal({
          type: 'call:answer',
          call_type: callSession.callType,
          sdp: answer,
        })
      }
    } catch (err) {
      setErrorMessage(err.message || 'Lỗi khi chấp nhận cuộc gọi')
      setTimeout(() => handleEndCall('error'), 3000)
    }
  }

  // 9. Từ chối cuộc gọi đến (Reject Call)
  const handleRejectCall = () => {
    audioSynth.stop()
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    onSendSignal({
      type: 'call:reject',
      call_type: callSession.callType,
      reason: 'declined',
    })
    cleanupCall()
    onEndCall({ duration: 0, reason: 'declined' })
  }

  // 10. Kết thúc cuộc gọi
  const handleEndCall = (reason = 'user_hangup') => {
    audioSynth.stop()
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    onSendSignal({
      type: 'call:end',
      call_type: callSession.callType,
      duration_seconds: duration,
      reason: reason,
    })
    cleanupCall()
    onEndCall({ duration, reason })
  }

  // Dọn dẹp Stream và PeerConnection
  const cleanupCall = () => {
    audioSynth.stop()
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop())
      remoteStreamRef.current = null
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null
      remoteAudioRef.current.pause()
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
    if (durationTimerRef.current) clearInterval(durationTimerRef.current)
  }

  // 11. Lắng nghe và xử lý trực tiếp tất cả tín hiệu WebRTC từ đối phương
  const handleIncomingSignal = async (signal) => {
    if (!signal) return
    const { type, sdp, candidate, reason } = signal
    const pc = peerConnectionRef.current

    if (type === 'call:answer') {
      if (pc) {
        try {
          if (sdp && pc.signalingState !== 'stable') {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp))
            setCallStatus('connected')
            audioSynth.stop()
            if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)

            // Áp dụng tất cả ICE candidate đang xếp hàng chờ
            while (iceCandidateQueueRef.current.length > 0) {
              const queuedCand = iceCandidateQueueRef.current.shift()
              try {
                await pc.addIceCandidate(new RTCIceCandidate(queuedCand))
              } catch (e) {
                console.warn('Lỗi áp dụng queued candidate:', e)
              }
            }
          }
        } catch (err) {
          console.error('Lỗi khi setRemoteDescription answer:', err)
        }
      }
    } else if (type === 'call:ice_candidate') {
      if (candidate) {
        // Nếu PeerConnection chưa sẵn sàng hoặc chưa có RemoteDescription -> Đưa vào hàng đợi
        if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) {
          iceCandidateQueueRef.current.push(candidate)
        } else {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.warn('Lỗi thêm ICE candidate:', e)
          }
        }
      }
    } else if (type === 'call:reject' || type === 'call:end') {
      audioSynth.stop()
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current)
      setErrorMessage(
        type === 'call:reject'
          ? (reason === 'busy' ? 'Đối phương đang bận' : 'Đối phương đã từ chối cuộc gọi')
          : 'Cuộc gọi đã kết thúc'
      )
      setTimeout(() => {
        cleanupCall()
        onEndCall({ duration, reason: reason || 'remote_ended' })
      }, 1200)
    } else if (type === 'call:error') {
      audioSynth.stop()
      setErrorMessage(signal.message || 'Lỗi cuộc gọi')
      setTimeout(() => {
        cleanupCall()
        onEndCall({ duration: 0, reason: 'error' })
      }, 2000)
    }
  }

  // Đăng ký listener nhận tín hiệu realtime từ WebSocket trong Messages.jsx
  useEffect(() => {
    if (onRegisterSignalListener) {
      const unsubscribe = onRegisterSignalListener(handleIncomingSignal)
      return () => {
        if (unsubscribe) unsubscribe()
      }
    }
  }, [onRegisterSignalListener])

  // Bắt đầu gọi nếu là người khởi xướng
  useEffect(() => {
    if (callSession.mode === 'outgoing') {
      startOutgoingCall()
    }
  }, [])

  // Bật/tắt Micro
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !audioTracks[0].enabled
        setIsMuted(!audioTracks[0].enabled)
      }
    }
  }

  // Bật/tắt Camera
  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !videoTracks[0].enabled
        setIsCameraOff(!videoTracks[0].enabled)
      }
    }
  }

  // Định dạng thời gian MM:SS
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontFamily: 'inherit',
      }}
    >
      {/* Audio element ẩn để phát tiếng của đối phương */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        onLoadedMetadata={(e) => e.target.play().catch(() => {})}
      />

      {/* ============================================================== */}
      {/* TRƯỜNG HỢP 1: CUỘC GỌI ĐẾN (INCOMING CALL DIALOG)              */}
      {/* ============================================================== */}
      {callStatus === 'incoming' && (
        <div
          style={{
            backgroundColor: '#1e293b',
            borderRadius: '24px',
            padding: '36px 40px',
            textAlign: 'center',
            maxWidth: '380px',
            width: '90%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid #334155',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {/* Avatar nhấp nháy chuông */}
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 20px auto' }}>
            <img
              src={
                partner?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`
              }
              alt={partner?.display_name || partner?.username}
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #7c5cbf',
                boxShadow: '0 0 20px rgba(124, 92, 191, 0.6)',
              }}
            />
            <span
              style={{
                position: 'absolute',
                top: -5,
                right: -5,
                fontSize: '22px',
                animation: 'pulse 1.2s infinite',
              }}
            >
              {isVideoCall ? '📹' : '📞'}
            </span>
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#f8fafc' }}>
            {partner?.display_name || partner?.username}
          </h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: '0 0 32px 0' }}>
            {isVideoCall ? 'Đang gọi video cho bạn...' : 'Đang gọi thoại cho bạn...'}
          </p>

          {/* 2 nút Chấp nhận / Từ chối */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={handleRejectCall}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              title="Từ chối cuộc gọi"
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              ✕
            </button>

            <button
              type="button"
              onClick={handleAcceptCall}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.4)',
                animation: 'bounce 1.5s infinite',
                transition: 'transform 0.15s ease',
              }}
              title="Trả lời cuộc gọi"
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              📞
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TRƯỜNG HỢP 2 & 3: ĐANG GỌI ĐI HOẶC ĐANG NÓI CHUYỆN (ACTIVE)    */}
      {/* ============================================================== */}
      {callStatus !== 'incoming' && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: isVideoCall ? '960px' : '440px',
            height: isVideoCall ? '85vh' : 'auto',
            maxHeight: '680px',
            backgroundColor: '#0f172a',
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            border: '1px solid #1e293b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          {/* Header cuộc gọi: Tên đối phương + Đồng hồ */}
          <div
            style={{
              padding: '20px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img
                src={
                  partner?.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`
                }
                alt=""
                style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  {partner?.display_name || partner?.username}
                </h3>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {callStatus === 'connected'
                    ? formatDuration(duration)
                    : errorMessage || 'Đang đổ chuông...'}
                </span>
              </div>
            </div>

            {callStatus === 'connected' && (
              <span
                style={{
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                }}
              >
                ● LIVE
              </span>
            )}
          </div>

          {/* Vùng hiển thị chính (Video hoặc Avatar sóng âm) */}
          <div
            style={{
              position: 'relative',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: '#090d16',
            }}
          >
            {isVideoCall ? (
              <>
                {/* Remote Video (Đối phương) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {/* Local Video (Bản thân - Góc nhỏ trên bên phải) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    width: '140px',
                    height: '190px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    backgroundColor: '#1e293b',
                    zIndex: 5,
                  }}
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    onLoadedMetadata={(e) => e.target.play().catch(() => {})}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)', // Hiệu ứng gương
                      display: isCameraOff ? 'none' : 'block',
                    }}
                  />
                  {isCameraOff && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#334155',
                        color: '#94a3b8',
                        fontSize: '12px',
                      }}
                    >
                      📷 Camera tắt
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Vùng giao diện Cuộc gọi thoại (Audio Only) */
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ position: 'relative', width: '130px', height: '130px', margin: '0 auto 24px auto' }}>
                  {/* Hiệu ứng sóng âm lan tỏa */}
                  {callStatus === 'connected' && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: -10,
                        right: -10,
                        bottom: -10,
                        borderRadius: '50%',
                        border: '2px solid #7c5cbf',
                        animation: 'ripple 2s infinite ease-out',
                      }}
                    />
                  )}
                  <img
                    src={
                      partner?.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`
                    }
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid #7c5cbf',
                    }}
                  />
                </div>

                <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px 0' }}>
                  {partner?.display_name || partner?.username}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  {errorMessage || (callStatus === 'connected' ? 'Cuộc gọi thoại đang diễn ra' : 'Đang đổ chuông...')}
                </p>
              </div>
            )}
          </div>

          {/* Thanh công cụ điều khiển ở đáy (Control Bar) */}
          <div
            style={{
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '20px',
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
              zIndex: 10,
            }}
          >
            {/* Nút Bật/Tắt Micro */}
            <button
              type="button"
              onClick={toggleMute}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: isMuted ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s ease',
              }}
              title={isMuted ? 'Bật Mic' : 'Tắt Mic'}
            >
              {isMuted ? '🔇' : '🎙️'}
            </button>

            {/* Nút Bật/Tắt Camera (cho Video Call) */}
            {isVideoCall && (
              <button
                type="button"
                onClick={toggleCamera}
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: isCameraOff ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.15s ease',
                }}
                title={isCameraOff ? 'Bật Camera' : 'Tắt Camera'}
              >
                {isCameraOff ? '🚫' : '📷'}
              </button>
            )}

            {/* Nút Kết thúc cuộc gọi */}
            <button
              type="button"
              onClick={() => handleEndCall('user_hangup')}
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                fontSize: '22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              title="Kết thúc cuộc gọi"
              onMouseOver={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseOut={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              📞
            </button>
          </div>
        </div>
      )}

      {/* Hiệu ứng CSS động */}
      <style>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
