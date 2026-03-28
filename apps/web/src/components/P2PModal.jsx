import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { buildShareUrl } from '../lib/shareUrl.js'
import { getLocalIP, buildLanUrl } from '../lib/lanIp.js'

function Label({ children }) {
  return (
    <div className="font-mono text-[10px] text-ink-faint tracking-widest uppercase mb-1.5">
      {children}
    </div>
  )
}

function CodeBox({ text }) {
  return (
    <div
      className="select-all"
      style={{
        fontFamily: 'monospace',
        fontSize: 11,
        wordBreak: 'break-all',
        lineHeight: 1.4,
        whiteSpace: 'pre-wrap',
        background: 'var(--bg-primary)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 4,
        padding: 8,
        minHeight: 80,
        maxHeight: 120,
        overflowY: 'auto',
        resize: 'none',
      }}
    >
      {text}
    </div>
  )
}

function CopyButton({ text, label }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors"
      style={{
        borderColor: copied ? 'var(--accent-success, #2d6a4f)' : undefined,
        color: copied ? 'var(--accent-success, #2d6a4f)' : undefined,
      }}
    >
      {copied ? '✓ 已复制' : (label || '复制')}
    </button>
  )
}

function StepIndicator({ steps, currentStep }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 20 }}>
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div
            title={label}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 'bold',
              background: i <= currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--bg-surface, #f5f0e8)',
              color: i <= currentStep ? '#000' : 'var(--text-muted, #999)',
              border: `1px solid ${i <= currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--border-color, #ddd)'}`,
              transition: 'all 0.3s',
              flexShrink: 0,
            }}
          >{i + 1}</div>
          {i < steps.length - 1 && (
            <div style={{
              flex: 1, height: 1,
              background: i < currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--border-color, #ddd)',
              transition: 'background 0.3s',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

function QRCanvas({ value, size = 180 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!value || !canvasRef.current) return
    const style = getComputedStyle(document.documentElement)
    const darkColor = style.getPropertyValue('--accent-primary').trim() || '#00d4ff'
    const lightColor = style.getPropertyValue('--bg-primary').trim() || '#050a14'
    QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'L',
      color: { dark: darkColor, light: lightColor },
    }).catch(console.error)
  }, [value, size])

  return <canvas ref={canvasRef} style={{ borderRadius: 6, display: 'block', margin: '0 auto' }} />
}

const HOST_STEPS = ['CREATE OFFER', 'WAIT FOR GUEST', 'ENTER ANSWER', 'CONNECTED']
const GUEST_STEPS = ['ENTER OFFER', 'COPY ANSWER', 'CONNECTED']

function hostStepIndex(step) {
  if (step === 'creating') return 0
  if (step === 'waiting_for_answer') return 1
  if (step === 'joining') return 2
  if (step === 'connected') return 3
  return 0
}

function guestStepIndex(step, answerReady) {
  if (!answerReady) return 0
  if (step === 'joining' || answerReady) return 1
  if (step === 'connected') return 2
  return 0
}

export default function P2PModal({ webrtc, sig, onClose, autoJoinOffer }) {
  const [answerInput, setAnswerInput] = useState('')
  const [offerInput, setOfferInput] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [showRawSDP, setShowRawSDP] = useState(false)
  const [lanUrl, setLanUrl] = useState(null)
  const [sigMode, setSigMode] = useState(false)   // true = Room Code mode
  const [roomCodeInput, setRoomCodeInput] = useState('')

  const { role, step, offerCode, answerCode, error, isEncrypted, setRole, createRoom, acceptAnswer, joinRoom, disconnect, isConnected } = webrtc

  // Either connection active
  const anyConnected  = isConnected || (sig?.isConnected ?? false)
  const anyEncrypted  = isEncrypted || (sig?.isEncrypted ?? false)
  const disconnectAll = () => { disconnect(); sig?.disconnect() }

  const handleBack = () => {
    disconnectAll()
  }

  // Guest: after joinRoom completes, answerCode holds the answer code
  const guestAnswerReady = role === 'guest' && answerCode && step !== 'idle'

  // Auto-join: when a share link was opened, auto-enter guest mode and process the offer
  useEffect(() => {
    if (autoJoinOffer && step === 'idle' && !role) {
      setRole('guest')
      setOfferInput(autoJoinOffer)
      joinRoom(autoJoinOffer)
    }
  }, [autoJoinOffer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for waiting phases
  useEffect(() => {
    if (step === 'waiting_for_answer' || (step === 'joining' && guestAnswerReady)) {
      let t = 120
      setCountdown(t)
      const interval = setInterval(() => {
        t -= 1
        setCountdown(t)
        if (t <= 0) {
          clearInterval(interval)
          setCountdown(null)
        }
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setCountdown(null)
    }
  }, [step, guestAnswerReady])

  // Build share URL when host has an offer code
  const shareUrl = offerCode ? buildShareUrl(offerCode) : null

  // Detect LAN IP and build LAN URL when host offer is ready
  useEffect(() => {
    if (!shareUrl) { setLanUrl(null); return }
    getLocalIP().then(() => {
      // buildLanUrl uses the cached IP + the same hash fragment as shareUrl
      const hash = shareUrl.split('#')[1]
      const url = hash ? buildLanUrl(hash) : null
      setLanUrl(url)
    })
  }, [shareUrl])

  // ── Connected screen ──────────────────────────────────────────────────────
  if (anyConnected) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 40, maxWidth: 384, width: '100%', textAlign: 'center', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div className="font-mono tracking-widest" style={{ color: 'var(--accent-success, #2d6a4f)', fontWeight: 'bold', fontSize: 18 }}>
            CONNECTION ESTABLISHED
          </div>
          <div className="font-mono mt-1" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
            {sig?.isConnected ? 'ROOM CODE · SIGNALING' : 'SERVERLESS · MANUAL SDP'}
          </div>
          {anyEncrypted && (
            <div className="font-mono mt-2" style={{ color: 'var(--text-muted, #999)', fontSize: 12 }}>
              🔐 E2E ENCRYPTED · ECDH P-256 + AES-GCM-256
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { disconnectAll(); onClose() }}
              className="flex-1 px-4 py-2.5 border border-seal-red/60 text-seal-red font-mono text-[11px] tracking-wide hover:bg-seal-red hover:text-paper transition-colors"
            >
              断开连接
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors"
            >
              START GAME →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: 32,
          width: '90%',
          maxWidth: 520,
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: 'var(--font-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="font-mono text-[10px] text-ink-faint tracking-widest">NETWORK · P2P · SERVERLESS</div>
            <div className="font-calligraphy text-2xl text-ink tracking-[2px] mt-0.5">局域网对战</div>
          </div>
          <button onClick={onClose} className="font-mono text-ink-faint hover:text-ink text-sm mt-1 tracking-wide">
            ✕ 关闭
          </button>
        </div>

        {/* Step indicator */}
        {role === 'host' && (
          <StepIndicator steps={HOST_STEPS} currentStep={hostStepIndex(step)} />
        )}
        {role === 'guest' && (
          <StepIndicator steps={GUEST_STEPS} currentStep={guestStepIndex(step, guestAnswerReady)} />
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 border border-seal-red/40 bg-seal-red/5 font-mono text-[11px] text-seal-red flex items-start justify-between gap-3">
            <span>⚠ {error}</span>
            {/* Guest: tap to clear the input field for a fresh retry */}
            {role === 'guest' && (
              <button
                onClick={() => setOfferInput('')}
                className="shrink-0 underline hover:no-underline"
              >
                重新输入
              </button>
            )}
            {/* Host: open the SDP section so they can correct the answer code */}
            {role === 'host' && !showRawSDP && (
              <button
                onClick={() => setShowRawSDP(true)}
                className="shrink-0 underline hover:no-underline"
              >
                重试
              </button>
            )}
          </div>
        )}

        {/* Role selection */}
        {!role && (
          <>
            {/* ── Room Code quick connect (signaling server) ─────────── */}
            {sig.isAvailable && (
              <div style={{
                border: '1px solid var(--accent-primary, #f0a500)',
                borderRadius: 6,
                padding: '14px 16px',
                marginBottom: 16,
                background: 'color-mix(in srgb, var(--accent-primary, #f0a500) 5%, var(--bg-surface))',
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--accent-primary, #f0a500)', marginBottom: 10 }}>
                  ⚡ 快速连接 · ROOM CODE
                </div>
                {!sigMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setSigMode(true); sig.createRoom() }}
                      style={{
                        padding: '10px 8px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--accent-primary, #f0a500)',
                        borderRadius: 4,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-primary)',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>创建房间</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>生成 6 位房间码</div>
                    </button>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <input
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="输入房间码"
                        maxLength={6}
                        style={{
                          padding: '8px',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 4,
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace',
                          fontSize: 16,
                          letterSpacing: '0.3em',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                        }}
                      />
                      <button
                        onClick={() => { setSigMode(true); sig.joinRoom(roomCodeInput) }}
                        disabled={roomCodeInput.length < 6}
                        style={{
                          padding: '6px',
                          background: roomCodeInput.length >= 6 ? 'var(--accent-primary, #f0a500)' : 'var(--bg-surface)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 4,
                          color: roomCodeInput.length >= 6 ? '#000' : 'var(--text-muted)',
                          fontFamily: 'var(--font-primary)',
                          fontSize: 11,
                          cursor: roomCodeInput.length >= 6 ? 'pointer' : 'not-allowed',
                          letterSpacing: '0.1em',
                        }}
                      >
                        加入 →
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Signaling mode active — show room code or status */
                  <div>
                    {sig.step === 'creating' && (
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>正在生成房间码...</div>
                    )}
                    {sig.step === 'waiting' && sig.roomCode && (
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                          将房间码发给对方
                        </div>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: 32,
                          fontWeight: 'bold',
                          letterSpacing: '0.4em',
                          color: 'var(--accent-primary, #f0a500)',
                          textAlign: 'center',
                          padding: '12px 0',
                        }}>
                          {sig.roomCode}
                        </div>
                        <CopyButton text={sig.roomCode} label="复制房间码" />
                        <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                          等待对方输入房间码加入...
                        </div>
                      </div>
                    )}
                    {sig.step === 'joining' && (
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                        正在连接...
                      </div>
                    )}
                    {sig.step === 'connected' && (
                      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent-success, #2d6a4f)', textAlign: 'center' }}>
                        ✓ 已连接
                      </div>
                    )}
                    {sig.error && (
                      <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--accent-danger, #8b3a3a)' }}>
                        ⚠ {sig.error}
                      </div>
                    )}
                    <button
                      onClick={() => { sig.disconnect(); setSigMode(false); setRoomCodeInput('') }}
                      style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      ← 取消
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Manual SDP P2P (classic, no server) ───────────────── */}
            <p className="font-mono text-[11px] text-ink-faint mb-3 leading-relaxed">
              或手动交换 SDP 码建立 P2P 连接（无需服务器）
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRole('host'); createRoom() }}
                className="px-4 py-5 border border-paper-dark hover:border-ink text-center transition-all group"
              >
                <div className="font-calligraphy text-2xl text-ink mb-1">创建房间</div>
                <div className="font-mono text-[10px] text-ink-faint tracking-wide group-hover:text-ink">HOST · 生成邀请码</div>
              </button>
              <button
                onClick={() => setRole('guest')}
                className="px-4 py-5 border border-paper-dark hover:border-ink text-center transition-all group"
              >
                <div className="font-calligraphy text-2xl text-ink mb-1">加入房间</div>
                <div className="font-mono text-[10px] text-ink-faint tracking-wide group-hover:text-ink">GUEST · 输入邀请码</div>
              </button>
            </div>
          </>
        )}

        {/* HOST FLOW */}
        {role === 'host' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 font-mono text-[10px] text-trust-l1 tracking-widest">
              <span>HOST · {step === 'creating' ? '生成中...' : step === 'waiting_for_answer' ? '等待应答' : step.toUpperCase()}</span>
              {countdown !== null && (
                <span style={{ color: 'var(--text-muted, #999)', fontSize: 12 }}>⏱ {countdown}s</span>
              )}
            </div>

            {step === 'creating' && (
              <div className="text-center py-6 font-mono text-[11px] text-ink-faint">
                <div className="flex justify-center gap-1 mb-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink animate-thinking" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                正在生成邀请码...
              </div>
            )}

            {step === 'waiting_for_answer' && offerCode && (
              <div className="flex flex-col gap-4">
                {/* Share URL section */}
                {shareUrl && (
                  <div>
                    <Label>分享链接 — Guest 打开此链接可自动加入</Label>
                    <div style={{
                      background: 'var(--bg-primary, #050a14)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 4,
                      padding: '6px 10px',
                      fontSize: 11,
                      color: 'var(--text-secondary, #aaa)',
                      wordBreak: 'break-all',
                      fontFamily: 'monospace',
                    }}>
                      {shareUrl.length > 80 ? shareUrl.slice(0, 80) + '...' : shareUrl}
                    </div>
                    <CopyButton text={shareUrl} label="复制链接" />
                  </div>
                )}

                {/* LAN section — same WiFi / hotspot quick join */}
                {lanUrl && (
                  <div style={{
                    border: '1px solid var(--accent-primary, #f0a500)',
                    borderRadius: 6,
                    padding: '12px 16px',
                    background: 'color-mix(in srgb, var(--accent-primary, #f0a500) 6%, var(--bg-surface))',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <span style={{ fontSize: 14 }}>📡</span>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--accent-primary, #f0a500)' }}>
                          同一 WiFi / 热点快捷加入
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          LAN · SAME NETWORK INSTANT JOIN
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'start' }}>
                      <div>
                        <QRCanvas value={lanUrl} size={140} />
                        <div style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>
                          同一 WiFi 设备扫码即可加入
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: 10,
                          wordBreak: 'break-all',
                          color: 'var(--text-secondary)',
                          background: 'var(--bg-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: 3,
                          padding: '4px 6px',
                        }}>
                          {lanUrl.split('#')[0]}
                        </div>
                        <CopyButton text={lanUrl} label="复制局域网链接" />
                        <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          仅限本地网络有效<br />可分享给同一热点的设备
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* QR Code section — internet share */}
                {shareUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Label>互联网分享 · INTERNET SHARE</Label>
                    <QRCanvas value={shareUrl} size={180} />
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                      任意网络均可使用（需对方能访问相同域名）
                    </div>
                  </div>
                )}

                {/* 手动 SDP 交换（折叠） */}
                <div>
                  <button
                    onClick={() => setShowRawSDP(v => !v)}
                    style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {showRawSDP ? '▾' : '▸'} 手动方式（SDP 码）
                  </button>
                  {showRawSDP && (
                    <div style={{ marginTop: 8 }} className="flex flex-col gap-4">
                      <div>
                        <Label>第 1 步：或手动复制邀请码发送给对方</Label>
                        <CodeBox text={offerCode} />
                        <CopyButton text={offerCode} label="复制邀请码" />
                      </div>
                      <div>
                        <Label>第 2 步：粘贴对方的应答码</Label>
                        <textarea
                          value={answerInput}
                          onChange={(e) => setAnswerInput(e.target.value)}
                          className="w-full bg-ink/[0.04] border border-paper-dark p-3 font-mono text-[9px] text-ink resize-none outline-none focus:border-ink transition-colors"
                          rows={3}
                          placeholder="粘贴应答码..."
                        />
                        <button
                          onClick={() => acceptAnswer(answerInput)}
                          disabled={!answerInput.trim()}
                          className="mt-1.5 w-full px-3 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          确认连接 →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GUEST FLOW */}
        {role === 'guest' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 font-mono text-[10px] text-trust-l3 tracking-widest">
              <span>GUEST · {step === 'joining' && !guestAnswerReady ? '处理中...' : guestAnswerReady ? '等待主机确认' : 'READY'}</span>
              {countdown !== null && (
                <span style={{ color: 'var(--text-muted, #999)', fontSize: 12 }}>⏱ {countdown}s</span>
              )}
            </div>

            {!guestAnswerReady && (
              <div>
                <Label>粘贴主机的邀请码</Label>
                <textarea
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                  className="w-full bg-ink/[0.04] border border-paper-dark p-3 font-mono text-[9px] text-ink resize-none outline-none focus:border-ink transition-colors"
                  rows={3}
                  placeholder="粘贴邀请码..."
                />
                <button
                  onClick={() => joinRoom(offerInput)}
                  disabled={!offerInput.trim() || step === 'joining'}
                  className="mt-1.5 w-full px-3 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {step === 'joining' ? '处理中...' : '生成应答码 →'}
                </button>
              </div>
            )}

            {guestAnswerReady && (
              <div>
                <Label>复制应答码，发送给主机</Label>
                <CodeBox text={answerCode} />
                <CopyButton text={answerCode} label="复制应答码 →" />
                <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-ink-faint">
                  <div className="w-2 h-2 rounded-full bg-trust-l3 animate-net-pulse flex-shrink-0" />
                  等待主机确认连接...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back button */}
        {role && (
          <button
            onClick={handleBack}
            className="mt-5 font-mono text-[10px] text-ink-faint hover:text-ink tracking-wide transition-colors"
          >
            ← 返回
          </button>
        )}
      </div>
    </div>
  )
}
