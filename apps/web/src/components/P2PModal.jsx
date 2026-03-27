import React, { useState, useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { buildShareUrl } from '../lib/shareUrl.js'

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

export default function P2PModal({ webrtc, onClose, autoJoinOffer }) {
  const [answerInput, setAnswerInput] = useState('')
  const [offerInput, setOfferInput] = useState('')
  const [countdown, setCountdown] = useState(null)
  const [showRawSDP, setShowRawSDP] = useState(false)

  const { role, step, offerCode, answerCode, error, isEncrypted, setRole, createRoom, acceptAnswer, joinRoom, disconnect, isConnected } = webrtc

  const handleBack = () => {
    disconnect()
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

  // ── Connected screen ──────────────────────────────────────────────────────
  if (isConnected) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 40, maxWidth: 384, width: '100%', textAlign: 'center', fontFamily: 'var(--font-primary)', color: 'var(--text-primary)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔗</div>
          <div className="font-mono tracking-widest" style={{ color: 'var(--accent-success, #2d6a4f)', fontWeight: 'bold', fontSize: 18 }}>
            CONNECTION ESTABLISHED
          </div>
          {isEncrypted && (
            <div className="font-mono mt-2" style={{ color: 'var(--text-muted, #999)', fontSize: 12 }}>
              🔐 E2E ENCRYPTED · ECDH P-256 + AES-GCM-256
            </div>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { disconnect(); onClose() }}
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
            <p className="font-mono text-[11px] text-ink-faint mb-4 leading-relaxed">
              无需服务器，通过手动交换 SDP 码建立 P2P 连接。
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

                {/* QR Code section */}
                {shareUrl && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Label>扫描二维码加入 · SCAN TO JOIN</Label>
                    <QRCanvas value={shareUrl} size={200} />
                    <div style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                      建议在同一网络下、近距离扫描
                    </div>
                    {(() => {
                      const shortCode = shareUrl.split('#join=')[1]?.slice(0, 12) || ''
                      return shortCode ? (
                        <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>
                          房间码: <span style={{ fontWeight: 'bold', letterSpacing: 1 }}>{shortCode}…</span>
                        </div>
                      ) : null
                    })()}
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
