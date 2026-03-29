import { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import { useTheme } from '../contexts/ThemeContext.jsx'
import { buildShareUrl } from '../lib/shareUrl.js'
import { getLocalIP, buildLanUrl } from '../lib/lanIp.js'
import StyleSelector from './ai/StyleSelector.jsx'

// ─── Inline utilities ─────────────────────────────────────────────────────────

function QRCanvas({ value, size = 160 }) {
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
  return <canvas ref={canvasRef} style={{ borderRadius: 4, display: 'block' }} />
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
      style={{
        width: '100%',
        marginTop: 6,
        padding: '7px 12px',
        background: copied ? 'transparent' : 'var(--bg-surface)',
        border: `1px solid ${copied ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
        borderRadius: 4,
        color: copied ? 'var(--accent-success, #2d6a4f)' : 'var(--text-muted)',
        fontFamily: 'var(--font-primary)',
        fontSize: 11,
        letterSpacing: '0.1em',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ 已复制' : (label || '复制')}
    </button>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', gap: 4, justifyContent: 'center', padding: '8px 0' }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent-primary)',
            opacity: 0.7,
            animation: 'msPulse 1.2s ease-in-out infinite',
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes msPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ─── Mode definitions ─────────────────────────────────────────────────────────

const MODES = [
  {
    id: 'ai',
    icon: '🤖',
    title: 'VS AI',
    titleCn: '人机对战',
    desc: '挑战 Minimax α-β 算法\n难度可调 · 随时悔棋',
    color: '#7c3aed',
    modeLabel: 'AI MODE',
  },
  {
    id: 'local',
    icon: '👥',
    title: 'LOCAL PVP',
    titleCn: '本地双人',
    desc: '同一设备轮流落子\n面对面对战',
    color: '#00d4ff',
    modeLabel: 'LOCAL PVP',
  },
  {
    id: 'host',
    icon: '📡',
    title: 'CREATE ROOM',
    titleCn: '创建房间',
    desc: '生成邀请码 / 二维码\nP2P 加密 · 无服务器',
    color: '#00ff88',
    modeLabel: 'HOST',
  },
  {
    id: 'join',
    icon: '🔗',
    title: 'JOIN ROOM',
    titleCn: '加入房间',
    desc: '扫码或输入邀请码\n直连对手 · 端对端加密',
    color: '#f59e0b',
    modeLabel: 'GUEST',
  },
]

const DIFFICULTIES = [
  { id: 'easy',   label: '入门', desc: 'EASY' },
  { id: 'medium', label: '初级', desc: 'MEDIUM' },
  { id: 'hard',   label: '中级', desc: 'HARD' },
  { id: 'expert', label: '高级', desc: 'EXPERT' },
]

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function PanelAI({ onConfirm }) {
  const [difficulty, setDifficulty] = useState('medium')
  const [styleId, setStyleId] = useState('balanced')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={labelStyle}>选择难度 · DIFFICULTY</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 8 }}>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              onClick={() => setDifficulty(d.id)}
              style={{
                padding: '12px 8px',
                background: difficulty === d.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                border: `1px solid ${difficulty === d.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 4,
                color: difficulty === d.id ? '#000' : 'var(--text-primary)',
                fontFamily: 'var(--font-primary)',
                fontSize: 14,
                fontWeight: difficulty === d.id ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'center',
              }}
            >
              <div>{d.label}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', marginTop: 2, opacity: 0.7 }}>{d.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <StyleSelector value={styleId} onChange={setStyleId} />

      <button onClick={() => onConfirm('ai', { difficulty, styleId })} style={startBtnStyle}>
        START GAME →
      </button>
    </div>
  )
}

function PanelLocal({ onConfirm }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.1em', lineHeight: 1.7 }}>
        两名玩家在同一设备上轮流落子。黑方先行。
      </div>
      <button onClick={() => onConfirm('local')} style={startBtnStyle}>
        START GAME →
      </button>
    </div>
  )
}

function PanelHost({ webrtc, sig, onConfirm }) {
  const [lanUrl, setLanUrl] = useState(null)
  const initCalled = useRef(false)

  // Kick off both connection methods immediately on mount
  useEffect(() => {
    if (initCalled.current) return
    initCalled.current = true
    if (sig?.isAvailable) sig.createRoom()
    webrtc.createRoom()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance when either connects
  useEffect(() => {
    if (webrtc.isConnected || sig?.isConnected) {
      onConfirm('host')
    }
  }, [webrtc.isConnected, sig?.isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  // Build LAN URL when webrtc offer is ready
  const shareUrl = webrtc.offerCode ? buildShareUrl(webrtc.offerCode) : null
  useEffect(() => {
    if (!shareUrl) { setLanUrl(null); return }
    getLocalIP().then(() => {
      const hash = shareUrl.split('#')[1]
      setLanUrl(hash ? buildLanUrl(hash) : null)
    })
  }, [shareUrl])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* ── Room Code panel (left) ── */}
        <div style={{
          padding: 16,
          background: sig?.isAvailable
            ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))'
            : 'var(--bg-surface)',
          border: `1px solid ${sig?.isAvailable ? 'var(--accent-primary)' : 'var(--border-color)'}`,
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: sig?.isAvailable ? 'var(--accent-primary)' : 'var(--text-muted)',
            fontWeight: 'bold',
          }}>
            ROOM CODE
          </div>

          {!sig?.isAvailable && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              信令服务不可用
            </div>
          )}

          {sig?.isAvailable && sig.step === 'creating' && (
            <>
              <Spinner />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
                生成房间码中...
              </div>
            </>
          )}

          {sig?.isAvailable && sig.step === 'waiting' && sig.roomCode && (
            <>
              <div style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 32,
                fontWeight: 'bold',
                letterSpacing: '0.4em',
                color: 'var(--accent-primary)',
                textAlign: 'center',
                padding: '8px 0',
              }}>
                {sig.roomCode}
              </div>
              <CopyButton text={sig.roomCode} label="复制房间码" />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
                6位房间码 · 对方输入即可加入
              </div>
            </>
          )}

          {sig?.isAvailable && sig.step === 'joining' && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
              正在连接...
            </div>
          )}

          {sig?.error && (
            <div style={{ fontSize: 10, color: 'var(--accent-danger, #8b3a3a)', lineHeight: 1.5 }}>
              ⚠ {sig.error}
            </div>
          )}
        </div>

        {/* ── LAN / QR panel (right) ── */}
        <div style={{
          padding: 16,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          alignItems: 'center',
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            fontWeight: 'bold',
            alignSelf: 'flex-start',
          }}>
            局域网 / QR
          </div>

          {webrtc.step === 'creating' && (
            <>
              <Spinner />
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>生成二维码中...</div>
            </>
          )}

          {webrtc.step === 'waiting_for_answer' && (lanUrl || shareUrl) && (
            <>
              <QRCanvas value={lanUrl || shareUrl} size={120} />
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.05em' }}>
                扫码加入 · 同网络设备
              </div>
              {lanUrl && (
                <div style={{
                  fontSize: 9,
                  color: 'var(--accent-primary)',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}>
                  {lanUrl.split('#')[0]}
                </div>
              )}
              {(lanUrl || shareUrl) && (
                <CopyButton text={lanUrl || shareUrl} label="复制链接" />
              )}
            </>
          )}

          {webrtc.step !== 'creating' && webrtc.step !== 'waiting_for_answer' && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>
              等待邀请码生成...
            </div>
          )}

          {webrtc.error && (
            <div style={{ fontSize: 10, color: 'var(--accent-danger, #8b3a3a)', lineHeight: 1.5 }}>
              ⚠ {webrtc.error}
            </div>
          )}
        </div>
      </div>

      {/* Status hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent-primary)',
          animation: 'msPulse 1.4s ease-in-out infinite',
        }} />
        <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          等待对方加入...
        </span>
      </div>
    </div>
  )
}

function PanelJoin({ webrtc, sig, onConfirm, autoJoinOffer, autoJoinRoomCode }) {
  const [tab, setTab] = useState('code')   // 'code' | 'link'
  const [roomCode, setRoomCode] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const autoJoinFired = useRef(false)
  const autoJoinRoomCodeFired = useRef(false)

  // Auto-join when offer code from URL is provided
  useEffect(() => {
    if (autoJoinOffer && !autoJoinFired.current) {
      autoJoinFired.current = true
      setTab('link')
      setLinkInput(autoJoinOffer)
      webrtc.joinRoom(autoJoinOffer)
    }
  }, [autoJoinOffer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-join when a room code is provided
  useEffect(() => {
    if (autoJoinRoomCode && !autoJoinRoomCodeFired.current) {
      autoJoinRoomCodeFired.current = true
      setTab('code')
      setRoomCode(autoJoinRoomCode)
      if (sig?.isAvailable) sig.joinRoom(autoJoinRoomCode)
    }
  }, [autoJoinRoomCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-advance when either connects
  useEffect(() => {
    if (webrtc.isConnected || sig?.isConnected) {
      onConfirm('join')
    }
  }, [webrtc.isConnected, sig?.isConnected]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleJoinCode = () => {
    if (roomCode.length < 6) return
    if (sig?.isAvailable) {
      sig.joinRoom(roomCode)
    }
    // else: show error via sig.error (already unavailable)
  }

  const handleJoinLink = () => {
    const raw = linkInput.trim()
    if (!raw) return
    // Pass raw to joinRoom; it handles URL extraction internally
    webrtc.joinRoom(raw)
  }

  const isConnecting =
    webrtc.step === 'joining' ||
    sig?.step === 'joining'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, border: '1px solid var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
        {[
          { id: 'code', label: '房间码' },
          { id: 'link', label: '邀请链接' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: tab === t.id ? 'var(--accent-primary)' : 'transparent',
              border: 'none',
              color: tab === t.id ? '#000' : 'var(--text-muted)',
              fontFamily: 'var(--font-primary)',
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontWeight: tab === t.id ? 'bold' : 'normal',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Room Code tab */}
      {tab === 'code' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!sig?.isAvailable && (
            <div style={{
              padding: '8px 12px',
              background: 'color-mix(in srgb, var(--accent-danger, #8b3a3a) 8%, var(--bg-surface))',
              border: '1px solid var(--accent-danger, #8b3a3a)',
              borderRadius: 4,
              fontSize: 11,
              color: 'var(--accent-danger, #8b3a3a)',
            }}>
              ⚠ 信令服务不可用，请使用邀请链接加入
            </div>
          )}
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="输入 6 位房间码"
            maxLength={6}
            disabled={!sig?.isAvailable || isConnecting}
            style={{
              padding: '14px 16px',
              background: 'var(--bg-primary)',
              border: `1px solid ${roomCode.length === 6 ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 22,
              letterSpacing: '0.5em',
              textAlign: 'center',
              textTransform: 'uppercase',
              outline: 'none',
              transition: 'border-color 0.15s',
              opacity: !sig?.isAvailable ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleJoinCode}
            disabled={roomCode.length < 6 || !sig?.isAvailable || isConnecting}
            style={{
              ...startBtnStyle,
              opacity: (roomCode.length < 6 || !sig?.isAvailable || isConnecting) ? 0.4 : 1,
              cursor: (roomCode.length < 6 || !sig?.isAvailable || isConnecting) ? 'not-allowed' : 'pointer',
            }}
          >
            {isConnecting ? '连接中...' : '加入 →'}
          </button>
          {sig?.error && (
            <div style={{ fontSize: 11, color: 'var(--accent-danger, #8b3a3a)' }}>⚠ {sig.error}</div>
          )}
        </div>
      )}

      {/* Invite link tab */}
      {tab === 'link' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="粘贴邀请链接或邀请码..."
            disabled={isConnecting}
            rows={3}
            style={{
              padding: '10px 12px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-secondary)',
              fontFamily: 'monospace',
              fontSize: 11,
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleJoinLink}
            disabled={!linkInput.trim() || isConnecting}
            style={{
              ...startBtnStyle,
              opacity: (!linkInput.trim() || isConnecting) ? 0.4 : 1,
              cursor: (!linkInput.trim() || isConnecting) ? 'not-allowed' : 'pointer',
            }}
          >
            {isConnecting ? '连接中...' : '加入 →'}
          </button>
          {webrtc.error && (
            <div style={{ fontSize: 11, color: 'var(--accent-danger, #8b3a3a)' }}>⚠ {webrtc.error}</div>
          )}
        </div>
      )}

      {/* Connecting status */}
      {isConnecting && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spinner />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>正在建立连接...</span>
        </div>
      )}
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const startBtnStyle = {
  width: '100%',
  padding: '12px 24px',
  background: 'var(--accent-primary)',
  border: '1px solid var(--accent-primary)',
  borderRadius: 4,
  color: '#000',
  fontFamily: 'var(--font-primary)',
  fontSize: 13,
  fontWeight: 'bold',
  letterSpacing: '0.15em',
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}

const labelStyle = {
  fontSize: 10,
  letterSpacing: '0.3em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModeSelect({ gameId, webrtc, sig, onSelectMode, onBack, autoJoinOffer, autoJoinRoomCode }) {
  const { theme, themes, setTheme } = useTheme()
  const [selectedMode, setSelectedMode] = useState(null)
  const [hovered, setHovered] = useState(null)

  const currentThemeIndex = themes.findIndex(t => t.id === theme)
  const prevTheme = () => {
    const idx = (currentThemeIndex - 1 + themes.length) % themes.length
    setTheme(themes[idx].id)
  }
  const nextTheme = () => {
    const idx = (currentThemeIndex + 1) % themes.length
    setTheme(themes[idx].id)
  }

  // When autoJoinOffer or autoJoinRoomCode is provided, skip directly to join phase
  useEffect(() => {
    if ((autoJoinOffer || autoJoinRoomCode) && !selectedMode) {
      setSelectedMode('join')
    }
  }, [autoJoinOffer, autoJoinRoomCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectMode = useCallback((modeId) => {
    setSelectedMode(modeId)
  }, [])

  const handleBack = useCallback(() => {
    webrtc?.disconnect()
    sig?.disconnect()
    setSelectedMode(null)
  }, [webrtc, sig])

  const currentModeObj = MODES.find((m) => m.id === selectedMode)

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── Top nav bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: '1px solid var(--border-color)',
            color: 'var(--text-muted)',
            padding: '8px 14px',
            borderRadius: 4,
            cursor: 'pointer',
            fontFamily: 'var(--font-primary)',
            fontSize: 12,
            letterSpacing: '0.1em',
            transition: 'border-color 0.15s, color 0.15s',
          }}
        >
          ← BACK
        </button>

        <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: '0.25em', textAlign: 'center' }}>
          {gameId?.toUpperCase()}
          {currentModeObj && (
            <span style={{ color: currentModeObj.color, marginLeft: 8 }}>
              · {currentModeObj.modeLabel}
            </span>
          )}
          {!currentModeObj && <span> · SELECT MODE</span>}
        </div>

        {/* Theme switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <span
            onClick={prevTheme}
            style={{ fontSize: 14, color: 'var(--accent-primary)', userSelect: 'none', padding: '4px 6px', cursor: 'pointer' }}
          >‹</span>
          <div className="scroll-x-hidden" style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 180 }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  flexShrink: 0,
                  background: theme === t.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                  border: `1px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                  color: theme === t.id ? '#000' : 'var(--text-muted)',
                  padding: '8px 14px',
                  borderRadius: 3,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.1em',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <span
            onClick={nextTheme}
            style={{ fontSize: 14, color: 'var(--accent-primary)', userSelect: 'none', padding: '4px 6px', cursor: 'pointer' }}
          >›</span>
        </div>
      </div>

      {/* ── Main body ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 24px',
        gap: 32,
        overflowY: 'auto',
      }}>

        {/* Phase 1: title + mode cards */}
        <div style={{
          width: '100%',
          maxWidth: 680,
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}>
          {/* Title */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 11,
              letterSpacing: '0.4em',
              color: 'var(--text-muted)',
              marginBottom: 10,
              textTransform: 'uppercase',
            }}>
              {selectedMode ? '配置游戏参数' : 'CHOOSE YOUR BATTLE'}
            </div>
            <div style={{
              fontSize: 30,
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display, var(--font-primary))',
              textShadow: '0 0 20px var(--accent-primary)',
            }}>
              游戏模式
            </div>
          </div>

          {/* Mode cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14,
          }}>
            {MODES.map((mode) => {
              const isSelected = selectedMode === mode.id
              const isOtherSelected = selectedMode && !isSelected
              return (
                <button
                  key={mode.id}
                  onClick={() => handleSelectMode(mode.id)}
                  onMouseEnter={() => setHovered(mode.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    background: isSelected
                      ? `linear-gradient(135deg, var(--bg-surface), ${mode.color}33)`
                      : hovered === mode.id
                        ? `linear-gradient(135deg, var(--bg-surface), ${mode.color}18)`
                        : 'var(--bg-surface)',
                    border: `1px solid ${isSelected ? mode.color : hovered === mode.id ? mode.color + '88' : 'var(--border-color)'}`,
                    borderRadius: 8,
                    padding: '18px 16px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    boxShadow: isSelected
                      ? `0 0 20px ${mode.color}44`
                      : hovered === mode.id
                        ? `0 0 12px ${mode.color}22`
                        : 'none',
                    opacity: isOtherSelected ? 0.45 : 1,
                    outline: isSelected ? `1px solid ${mode.color}55` : 'none',
                    outlineOffset: 2,
                  }}
                >
                  <div style={{ fontSize: 30, marginBottom: 10 }}>{mode.icon}</div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    color: isSelected || hovered === mode.id ? mode.color : 'var(--text-primary)',
                    marginBottom: 3,
                    fontFamily: 'var(--font-display, var(--font-primary))',
                    transition: 'color 0.15s',
                  }}>
                    {mode.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {mode.titleCn}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.6,
                  }}>
                    {mode.desc}
                  </div>
                  {isSelected && (
                    <div style={{
                      marginTop: 8,
                      display: 'inline-block',
                      fontSize: 9,
                      letterSpacing: '0.15em',
                      color: mode.color,
                      border: `1px solid ${mode.color}`,
                      padding: '2px 7px',
                      borderRadius: 2,
                    }}>
                      SELECTED ✓
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Phase 2: configuration panel (shown below cards when mode selected) */}
        {selectedMode && (
          <div style={{
            width: '100%',
            maxWidth: 680,
            background: 'var(--bg-secondary)',
            border: `1px solid ${currentModeObj?.color || 'var(--border-color)'}`,
            borderRadius: 8,
            padding: '24px 28px',
            boxShadow: `0 0 24px ${currentModeObj?.color || 'transparent'}22`,
          }}>
            {/* Panel header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>{currentModeObj?.icon}</span>
                <div>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 'bold',
                    letterSpacing: '0.15em',
                    color: currentModeObj?.color || 'var(--text-primary)',
                  }}>
                    {currentModeObj?.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                    {currentModeObj?.titleCn}
                  </div>
                </div>
              </div>
              <button
                onClick={handleBack}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-primary)',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  padding: '4px 8px',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ← 重选模式
              </button>
            </div>

            {/* Panel content */}
            {selectedMode === 'ai' && (
              <PanelAI onConfirm={onSelectMode} />
            )}
            {selectedMode === 'local' && (
              <PanelLocal onConfirm={onSelectMode} />
            )}
            {selectedMode === 'host' && (
              <PanelHost
                webrtc={webrtc}
                sig={sig}
                onConfirm={onSelectMode}
              />
            )}
            {selectedMode === 'join' && (
              <PanelJoin
                webrtc={webrtc}
                sig={sig}
                onConfirm={onSelectMode}
                autoJoinOffer={autoJoinOffer}
                autoJoinRoomCode={autoJoinRoomCode}
              />
            )}
          </div>
        )}

        {/* Footer tagline */}
        <div style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          textAlign: 'center',
          letterSpacing: '0.15em',
          paddingBottom: 8,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          whiteSpace: 'nowrap',
        }}>
          NO SERVER · LOCAL FIRST · E2E · HASH CHAIN
        </div>
      </div>
    </div>
  )
}
