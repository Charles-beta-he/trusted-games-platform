import React, { useState, useEffect } from 'react'
import { buildShareUrl, buildRoomJoinUrl } from '../lib/shareUrl.js'
import { getLocalIP, buildLanUrl } from '../lib/lanIp.js'
import QRCanvas from './ui/QRCanvas.jsx'
import CopyButton from './ui/CopyButton.jsx'

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
      className="select-all font-mono text-[11px] break-all leading-[1.4] whitespace-pre-wrap bg-bg-primary text-text-secondary border border-border-c rounded p-2 min-h-[80px] max-h-[120px] overflow-y-auto resize-none"
    >
      {text}
    </div>
  )
}


function StepIndicator({ steps, currentStep }) {
  return (
    <div className="flex items-center gap-1 mb-5">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div
            title={label}
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300"
            style={{
              background: i <= currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--bg-surface, #f5f0e8)',
              color: i <= currentStep ? '#000' : 'var(--text-muted, #999)',
              border: `1px solid ${i <= currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--border-color, #ddd)'}`,
            }}
          >{i + 1}</div>
          {i < steps.length - 1 && (
            <div
              className="flex-1 h-px transition-colors duration-300"
              style={{ background: i < currentStep ? 'var(--accent-primary, #f0a500)' : 'var(--border-color, #ddd)' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  )
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
    }).catch(() => setLanUrl(null))
  }, [shareUrl])

  // ── Connected screen ──────────────────────────────────────────────────────
  if (anyConnected) {
    return (
      <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-bg-secondary border border-border-c rounded-lg p-10 max-w-sm w-full text-center text-text-primary">
          <div className="text-[48px] mb-4">🔗</div>
          <div className="font-mono tracking-widest text-lg font-bold" style={{ color: 'var(--accent-success, #2d6a4f)' }}>
            CONNECTION ESTABLISHED
          </div>
          <div className="font-mono mt-1 text-[11px] text-text-muted">
            {sig?.isConnected ? 'ROOM CODE · SIGNALING' : 'SERVERLESS · MANUAL SDP'}
          </div>
          {anyEncrypted && (
            <div className="font-mono mt-2 text-xs" style={{ color: 'var(--text-muted, #999)' }}>
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
    <div className="fixed inset-0 z-[1000] bg-black/70 flex items-center justify-center p-4">
      <div
        className="bg-bg-secondary border border-border-c rounded-lg p-8 w-[90%] max-w-[520px] max-h-[90vh] overflow-y-auto text-text-primary"
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
              <div
                className="rounded-md px-4 py-3.5 mb-4"
                style={{ border: '1px solid var(--accent-primary, #f0a500)', background: 'color-mix(in srgb, var(--accent-primary, #f0a500) 5%, var(--bg-surface))' }}
              >
                <div className="font-mono text-[11px] font-bold tracking-[0.15em] mb-2.5" style={{ color: 'var(--accent-primary, #f0a500)' }}>
                  ⚡ 快速连接 · ROOM CODE
                </div>
                {!sigMode ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setSigMode(true); sig.createRoom() }}
                      className="py-2.5 px-2 bg-bg-primary border border-[var(--accent-primary,#f0a500)] rounded text-text-primary text-xs cursor-pointer"
                    >
                      <div className="font-bold">创建房间</div>
                      <div className="text-[10px] text-text-muted mt-0.5">生成 6 位房间码</div>
                    </button>
                    <div className="flex flex-col gap-1">
                      <input
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="输入房间码"
                        maxLength={6}
                        className="p-2 bg-bg-primary border border-border-c rounded text-text-primary font-mono text-base tracking-[0.3em] text-center uppercase"
                      />
                      <button
                        onClick={() => { setSigMode(true); sig.joinRoom(roomCodeInput) }}
                        disabled={roomCodeInput.length < 6}
                        className="py-1.5 border border-border-c rounded font-mono text-[11px] tracking-[0.1em]"
                        style={{
                          background: roomCodeInput.length >= 6 ? 'var(--accent-primary, #f0a500)' : 'var(--bg-surface)',
                          color: roomCodeInput.length >= 6 ? '#000' : 'var(--text-muted)',
                          cursor: roomCodeInput.length >= 6 ? 'pointer' : 'not-allowed',
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
                      <div className="font-mono text-xs text-text-muted">正在生成房间码...</div>
                    )}
                    {sig.step === 'waiting' && sig.roomCode && (
                      <div>
                        <div className="font-mono text-[11px] text-text-muted mb-1.5">
                          将房间码或下方链接发给对方
                        </div>
                        <div className="font-mono text-[32px] font-bold tracking-[0.4em] text-center py-3" style={{ color: 'var(--accent-primary, #f0a500)' }}>
                          {sig.roomCode}
                        </div>
                        <CopyButton text={sig.roomCode} label="复制房间码" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
                        <div className="mt-3.5 flex flex-col items-center">
                          <Label>扫码加入（自动连接）</Label>
                          <QRCanvas value={buildRoomJoinUrl(sig.roomCode)} size={160} centered borderRadius={6} />
                          <CopyButton text={buildRoomJoinUrl(sig.roomCode)} label="复制加入链接" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
                        </div>
                        <div className="mt-2 font-mono text-[10px] text-text-muted text-center">
                          等待对方加入...
                        </div>
                      </div>
                    )}
                    {sig.step === 'joining' && (
                      <div className="font-mono text-xs text-text-muted text-center py-2">
                        正在连接...
                      </div>
                    )}
                    {sig.step === 'connected' && (
                      <div className="font-mono text-xs text-center" style={{ color: 'var(--accent-success, #2d6a4f)' }}>
                        ✓ 已连接
                      </div>
                    )}
                    {sig.error && (
                      <div className="font-mono text-[11px]" style={{ color: 'var(--accent-danger, #8b3a3a)' }}>
                        ⚠ {sig.error}
                      </div>
                    )}
                    <button
                      onClick={() => { sig.disconnect(); setSigMode(false); setRoomCodeInput('') }}
                      className="mt-2 text-[10px] text-text-muted bg-none border-none cursor-pointer"
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
                <span className="text-text-muted text-xs" style={{ color: 'var(--text-muted, #999)' }}>⏱ {countdown}s</span>
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
                    <div className="bg-bg-primary border border-border-c rounded px-2.5 py-1.5 text-[11px] break-all font-mono" style={{ color: 'var(--text-secondary, #aaa)' }}>
                      {shareUrl.length > 80 ? shareUrl.slice(0, 80) + '...' : shareUrl}
                    </div>
                    <CopyButton text={shareUrl} label="复制链接" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
                  </div>
                )}

                {/* LAN section — same WiFi / hotspot quick join */}
                {lanUrl && (
                  <div
                    className="rounded-md px-4 py-3"
                    style={{ border: '1px solid var(--accent-primary, #f0a500)', background: 'color-mix(in srgb, var(--accent-primary, #f0a500) 6%, var(--bg-surface))' }}
                  >
                    <div className="flex items-center gap-1.5 mb-2.5">
                      <span className="text-sm">📡</span>
                      <div>
                        <div className="font-mono text-[11px] font-bold tracking-[0.15em]" style={{ color: 'var(--accent-primary, #f0a500)' }}>
                          同一 WiFi / 热点快捷加入
                        </div>
                        <div className="font-mono text-[10px] text-text-muted mt-px">
                          LAN · SAME NETWORK INSTANT JOIN
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 items-start" style={{ gridTemplateColumns: '1fr auto' }}>
                      <div>
                        <QRCanvas value={lanUrl} size={140} centered borderRadius={6} />
                        <div className="mt-1.5 font-mono text-[9px] text-text-muted text-center">
                          同一 WiFi 设备扫码即可加入
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="font-mono text-[10px] break-all text-text-secondary bg-bg-primary border border-border-c rounded-sm px-1.5 py-1">
                          {lanUrl.split('#')[0]}
                        </div>
                        <CopyButton text={lanUrl} label="复制局域网链接" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
                        <div className="font-mono text-[9px] text-text-muted leading-relaxed">
                          仅限本地网络有效<br />可分享给同一热点的设备
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* QR Code section — internet share */}
                {shareUrl && (
                  <div className="flex flex-col items-center">
                    <Label>互联网分享 · INTERNET SHARE</Label>
                    <QRCanvas value={shareUrl} size={180} centered borderRadius={6} />
                    <div className="mt-2 font-mono text-[10px] text-text-muted text-center">
                      任意网络均可使用（需对方能访问相同域名）
                    </div>
                  </div>
                )}

                {/* 手动 SDP 交换（折叠） */}
                <div>
                  <button
                    onClick={() => setShowRawSDP(v => !v)}
                    className="text-[11px] text-text-muted bg-none border-none cursor-pointer p-0"
                  >
                    {showRawSDP ? '▾' : '▸'} 手动方式（SDP 码）
                  </button>
                  {showRawSDP && (
                    <div style={{ marginTop: 8 }} className="flex flex-col gap-4">
                      <div>
                        <Label>第 1 步：或手动复制邀请码发送给对方</Label>
                        <CodeBox text={offerCode} />
                        <CopyButton text={offerCode} label="复制邀请码" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
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
                <span className="text-text-muted text-xs" style={{ color: 'var(--text-muted, #999)' }}>⏱ {countdown}s</span>
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
                <CopyButton text={answerCode} label="复制应答码 →" className="w-full mt-1.5 px-3 py-2 border font-mono text-[11px] transition-colors" />
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
