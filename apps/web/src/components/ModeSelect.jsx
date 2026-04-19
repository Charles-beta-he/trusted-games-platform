import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { buildShareUrl, buildRoomJoinUrl } from '../lib/shareUrl.js'
import { getLocalIP, buildLanUrl } from '../lib/lanIp.js'
import { getGameById } from '../plugins/index.js'
import QRCanvas from './ui/QRCanvas.jsx'
import CopyButton from './ui/CopyButton.jsx'
import useThemeCycle from '../hooks/useThemeCycle.js'

// ─── Inline utilities ─────────────────────────────────────────────────────────


function Spinner() {
  return (
    <div className="flex gap-1 justify-center py-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full opacity-70"
          style={{
            background: 'var(--accent-primary)',
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

/** 渲染单个 select 类型的 AI 参数选择器 */
function ParamSelect({ param, value, onChange }) {
  const cols = param.options.length <= 3 ? param.options.length : 2
  return (
    <div>
      <div className="text-[10px] tracking-[0.3em] text-theme-muted uppercase">{param.label}</div>
      <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {param.options.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              aria-pressed={active}
              aria-label={`${opt.label} - ${opt.desc}`}
              onClick={() => onChange(opt.id)}
              className={`p-2.5 rounded text-center cursor-pointer transition-all font-theme text-[13px] ${
                active
                  ? 'bg-theme-accent text-black font-bold'
                  : 'bg-theme-surface border border-theme text-theme-primary'
              }`}
            >
              {opt.icon && <div className="text-base mb-0.5">{opt.icon}</div>}
              <div>{opt.label}</div>
              <div className="text-[9px] tracking-[0.08em] mt-0.5 opacity-70">{opt.desc}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PanelAI({ onConfirm, gameId }) {
  const [difficulty, setDifficulty] = useState('medium')
  const gameDesc = getGameById(gameId)
  const schema = gameDesc?.aiParams ?? []
  const aiDescription = gameDesc?.aiDescription ?? null

  // 从插件描述符读取每档难度的算法标签（如有）
  const engineDifficulties = gameDesc?.aiEngines?.[0]?.difficulties ?? {}

  const [paramValues, setParamValues] = useState(
    () => Object.fromEntries(schema.map((p) => [p.id, p.default]))
  )
  const setParam = (id, val) => setParamValues((prev) => ({ ...prev, [id]: val }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="text-[10px] tracking-[0.3em] text-theme-muted uppercase">选择难度 · DIFFICULTY</div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {DIFFICULTIES.map((d) => {
            const algoLabel = engineDifficulties[d.id]?.label ?? d.desc
            return (
              <button
                key={d.id}
                aria-pressed={difficulty === d.id}
                aria-label={`${d.label} - ${algoLabel}`}
                onClick={() => setDifficulty(d.id)}
                className={`px-2 py-3 rounded text-center cursor-pointer transition-all font-theme text-sm ${
                  difficulty === d.id
                    ? 'bg-theme-accent text-black font-bold'
                    : 'bg-theme-surface border border-theme text-theme-primary'
                }`}
              >
                <div>{d.label}</div>
                <div className="text-[9px] tracking-[0.1em] mt-0.5 opacity-70">{algoLabel}</div>
              </button>
            )
          })}
        </div>
      </div>

      {schema.map((param) =>
        param.type === 'select' ? (
          <ParamSelect
            key={param.id}
            param={param}
            value={paramValues[param.id] ?? param.default}
            onChange={(val) => setParam(param.id, val)}
          />
        ) : null
      )}

      {aiDescription && (
        <div className="text-[11px] text-theme-muted tracking-[0.06em] leading-relaxed">
          {aiDescription}
        </div>
      )}

      <button
        onClick={() => onConfirm('ai', { difficulty, aiParams: paramValues })}
        className="w-full px-6 py-3 rounded text-black font-theme text-[13px] font-bold tracking-[0.15em] cursor-pointer transition-opacity bg-theme-accent border border-theme-accent"
      >
        START GAME →
      </button>
    </div>
  )
}

function PanelLocal({ onConfirm, gameId }) {
  const localDescription = getGameById(gameId)?.localDescription ?? '两名玩家在同一设备上轮流行棋。'
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs text-theme-muted tracking-[0.1em] leading-loose">
        {localDescription}
      </div>
      <button onClick={() => onConfirm('local')} className="w-full px-6 py-3 rounded text-black font-theme text-[13px] font-bold tracking-[0.15em] cursor-pointer transition-opacity bg-theme-accent border border-theme-accent">
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
    // 当 signaling 可用时，只走同一条“房间码 -> signaling 握手 -> DataChannel”的路径，
    // 避免并行启动 webrtc 造成另一条 SDP 隧道与主机界面状态分叉。
    else webrtc.createRoom()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * 房间码/二维码路径：必须由 sig（同一信令房）连上再进棋盘。
   * 若仍在等 6 位房间码，webrtc 单独连通可能是另一条 SDP 隧道，会导致主机「无反应」与双方状态分叉。
   */
  const waitingForRoomCodeGuest = Boolean(
    sig?.isAvailable && sig?.step === 'waiting' && sig?.roomCode,
  )
  useEffect(() => {
    if (waitingForRoomCodeGuest) {
      if (sig?.isConnected) onConfirm('host')
      return
    }
    if (webrtc.isConnected || sig?.isConnected) onConfirm('host')
  }, [
    waitingForRoomCodeGuest,
    webrtc.isConnected,
    sig?.isConnected,
    onConfirm,
  ])

  // Build LAN URL when webrtc offer is ready
  const shareUrl = webrtc.offerCode ? buildShareUrl(webrtc.offerCode) : null
  useEffect(() => {
    if (!shareUrl) {
      // Use setTimeout to avoid setState-in-effect warning
      const timer = setTimeout(() => setLanUrl(null), 0)
      return () => clearTimeout(timer)
    }
    getLocalIP().then(() => {
      const hash = shareUrl.split('#')[1]
      setLanUrl(hash ? buildLanUrl(hash) : null)
    }).catch(() => setLanUrl(null))
  }, [shareUrl])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">

        {/* ── Room Code panel (left) ── */}
        <div className={`p-2.5 rounded-md flex flex-col gap-2.5 border ${
          sig?.isAvailable ? 'border-theme-accent' : 'bg-theme-surface border-theme'
        }`}
          style={{
            background: sig?.isAvailable
              ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))'
              : undefined,
          }}
        >
          <div className={`text-[10px] tracking-[0.2em] font-bold ${
            sig?.isAvailable ? 'text-theme-accent' : 'text-theme-muted'
          }`}>
            ROOM CODE
          </div>

          {!sig?.isAvailable && (
            <div className="text-[11px] text-theme-muted leading-snug">
              信令服务不可用
            </div>
          )}

          {sig?.isAvailable && sig.step === 'creating' && (
            <>
              <Spinner />
              <div className="text-[10px] text-theme-muted text-center">
                生成房间码中...
              </div>
            </>
          )}

          {sig?.isAvailable && sig.step === 'waiting' && sig.roomCode && (
            <>
              <div className="font-theme text-[32px] font-bold tracking-[0.4em] text-theme-accent text-center py-2">
                {sig.roomCode}
              </div>
              <CopyButton text={sig.roomCode} label="复制房间码" />
              <div className="text-[10px] text-theme-muted text-center tracking-[0.05em]">
                6位房间码 · 对方输入即可加入
              </div>
            </>
          )}

          {sig?.isAvailable && sig.step === 'joining' && (
            <div className="text-[11px] text-theme-muted text-center py-2">
              正在连接...
            </div>
          )}

          {sig?.error && (
            <div className="text-[10px] leading-snug" style={{ color: 'var(--accent-danger, #8b3a3a)' }}>
              ⚠ {sig.error}
            </div>
          )}
        </div>

        {/* ── QR panel (right) ── */}
        <div className="p-2.5 bg-theme-surface border border-theme rounded-md flex flex-col gap-2.5 items-center">
          <div className="text-[10px] tracking-[0.2em] text-theme-muted font-bold self-start">
            二维码 / QR
          </div>

          {/* 优先用房间码生成 QR（6字符，可扫）；其次用局域网链接 */}
          {sig?.isAvailable && sig.step === 'waiting' && sig.roomCode && (
            <>
              <div className="w-[120px] h-[120px] shrink-0">
                <QRCanvas value={buildRoomJoinUrl(sig.roomCode)} size={120} />
              </div>
              <div className="text-[10px] text-theme-muted text-center tracking-[0.05em]">
                扫码加入房间（自动连接）
              </div>
              <CopyButton text={buildRoomJoinUrl(sig.roomCode)} label="复制加入链接" />
            </>
          )}

          {(!sig?.isAvailable || sig.step !== 'waiting') && webrtc.step === 'waiting_for_answer' && lanUrl && (
            <>
              <div className="w-[120px] h-[120px] shrink-0">
                <QRCanvas value={lanUrl} size={120} />
              </div>
              <div className="text-[10px] text-theme-muted text-center tracking-[0.05em]">
                扫码加入 · 同网络设备
              </div>
              {lanUrl && (
                <div className="text-[9px] text-theme-accent font-mono text-center break-all">
                  {lanUrl.split('#')[0]}
                </div>
              )}
              <CopyButton text={lanUrl} label="复制链接" />
            </>
          )}

          {(!sig?.isAvailable || sig.step !== 'waiting') &&
           webrtc.step !== 'waiting_for_answer' && (
            <div className="text-[10px] text-theme-muted text-center py-3">
              {webrtc.step === 'creating' ? '生成中...' : '等待生成...'}
            </div>
          )}

          {webrtc.error && (
            <div className="text-[10px] leading-snug" style={{ color: 'var(--accent-danger, #8b3a3a)' }}>
              ⚠ {webrtc.error}
            </div>
          )}
        </div>
      </div>

      {/* Status hint */}
      <div className="flex items-center gap-2">
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{
            background: 'var(--accent-primary)',
            animation: 'msPulse 1.4s ease-in-out infinite',
          }}
        />
        <span className="text-[11px] text-theme-muted tracking-[0.05em]">
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
      // Use setTimeout to avoid setState-in-effect warning
      setTimeout(() => {
        setTab('link')
        setLinkInput(autoJoinOffer)
        webrtc.joinRoom(autoJoinOffer)
      }, 0)
    }
  }, [autoJoinOffer]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-join when a room code is provided
  useEffect(() => {
    if (autoJoinRoomCode && !autoJoinRoomCodeFired.current) {
      autoJoinRoomCodeFired.current = true
      // Use setTimeout to avoid setState-in-effect warning
      setTimeout(() => {
        setTab('code')
        setRoomCode(autoJoinRoomCode)
        if (sig?.isAvailable) sig.joinRoom(autoJoinRoomCode)
      }, 0)
    }
  }, [autoJoinRoomCode]) // eslint-disable-line react-hooks/exhaustive-deps

  const waitingToJoinViaCode = Boolean(autoJoinRoomCode && sig?.isAvailable)
  useEffect(() => {
    if (waitingToJoinViaCode) {
      if (sig?.isConnected) onConfirm('join')
      return
    }
    if (webrtc.isConnected || sig?.isConnected) onConfirm('join')
  }, [
    waitingToJoinViaCode,
    webrtc.isConnected,
    sig?.isConnected,
    onConfirm,
  ])

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
    <div className="flex flex-col gap-4">

      {/* Tab switcher */}
      <div className="flex border border-theme rounded overflow-hidden">
        {[
          { id: 'code', label: '房间码' },
          { id: 'link', label: '邀请链接' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-3 py-2 font-theme text-[11px] tracking-[0.1em] cursor-pointer transition-all ${
              tab === t.id
                ? 'bg-theme-accent text-black font-bold'
                : 'bg-transparent text-theme-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Room Code tab */}
      {tab === 'code' && (
        <div className="flex flex-col gap-2.5">
          {!sig?.isAvailable && (
            <div className="px-3 py-2 rounded text-[11px]"
              style={{
                background: 'color-mix(in srgb, var(--accent-danger, #8b3a3a) 8%, var(--bg-surface))',
                border: '1px solid var(--accent-danger, #8b3a3a)',
                color: 'var(--accent-danger, #8b3a3a)',
              }}
            >
              ⚠ 信令服务不可用，请使用邀请链接加入
            </div>
          )}
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="输入 6 位房间码"
            maxLength={6}
            disabled={!sig?.isAvailable || isConnecting}
            className={`px-4 py-3.5 rounded font-theme text-[22px] tracking-[0.5em] uppercase outline-none transition-colors bg-theme-primary text-theme-primary ${
              roomCode.length === 6 ? 'border-theme-accent' : 'border-theme'
            } ${!sig?.isAvailable ? 'opacity-50' : ''}`}
            style={{ border: `1px solid ${roomCode.length === 6 ? 'var(--accent-primary)' : 'var(--border-color)'}` }}
          />
          <button
            onClick={handleJoinCode}
            disabled={roomCode.length < 6 || !sig?.isAvailable || isConnecting}
            className={`w-full px-6 py-3 rounded font-theme text-[13px] font-bold tracking-[0.15em] transition-opacity bg-theme-accent border border-theme-accent text-black ${
              (roomCode.length < 6 || !sig?.isAvailable || isConnecting) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isConnecting ? '连接中...' : '加入 →'}
          </button>
          {sig?.error && (
            <div className="text-[11px]" style={{ color: 'var(--accent-danger, #8b3a3a)' }}>⚠ {sig.error}</div>
          )}
        </div>
      )}

      {/* Invite link tab */}
      {tab === 'link' && (
        <div className="flex flex-col gap-2.5">
          <textarea
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            placeholder="粘贴邀请链接或邀请码..."
            disabled={isConnecting}
            rows={3}
            className="px-3 py-2.5 bg-theme-primary border border-theme rounded text-theme-secondary font-mono text-[11px] resize-none outline-none leading-relaxed"
          />
          <button
            onClick={handleJoinLink}
            disabled={!linkInput.trim() || isConnecting}
            className={`w-full px-6 py-3 rounded font-theme text-[13px] font-bold tracking-[0.15em] transition-opacity bg-theme-accent border border-theme-accent text-black ${
              (!linkInput.trim() || isConnecting) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            {isConnecting ? '连接中...' : '加入 →'}
          </button>
          {webrtc.error && (
            <div className="text-[11px]" style={{ color: 'var(--accent-danger, #8b3a3a)' }}>⚠ {webrtc.error}</div>
          )}
        </div>
      )}

      {/* Connecting status */}
      {isConnecting && (
        <div className="flex items-center gap-2">
          <Spinner />
          <span className="text-[11px] text-theme-muted">正在建立连接...</span>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ModeSelect({
  gameId,
  webrtc,
  sig,
  onSelectMode,
  onBack,
  autoJoinOffer,
  autoJoinRoomCode,
  /** 为 false 时仅展示人机与本地双人对局（如象棋尚未接 P2P 协议） */
  networkModesEnabled = true,
}) {
  const { theme, themes, setTheme, prevTheme, nextTheme } = useThemeCycle()
  const [selectedMode, setSelectedMode] = useState(null)
  const [hovered, setHovered] = useState(null)


  const visibleModes = useMemo(
    () => (networkModesEnabled ? MODES : MODES.filter((m) => m.id === 'ai' || m.id === 'local')),
    [networkModesEnabled],
  )

  // When autoJoinOffer or autoJoinRoomCode is provided, skip directly to join phase
  useEffect(() => {
    if (!networkModesEnabled) return
    if ((autoJoinOffer || autoJoinRoomCode) && !selectedMode) {
      // Use setTimeout to avoid setState-in-effect warning
      setTimeout(() => setSelectedMode('join'), 0)
    }
  }, [autoJoinOffer, autoJoinRoomCode, networkModesEnabled, selectedMode])

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
    <div className="min-h-[100svh] bg-theme-primary font-theme flex flex-col">
      {/* Skip to content link for keyboard users */}
      <a
        href="#mode-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[999] focus:px-4 focus:py-2 focus:bg-theme-accent focus:text-black focus:rounded focus:font-mono focus:text-sm"
      >
        Skip to content
      </a>

      {/* ── Top nav bar ─────────────────────────────────────────────────── */}
      <nav role="navigation" aria-label="Game mode navigation" className="flex items-center justify-between px-4 py-3 border-b border-theme bg-theme-secondary shrink-0">
        <button
          onClick={onBack}
          className="bg-transparent border border-theme text-theme-muted px-3.5 py-2 rounded cursor-pointer font-theme text-xs tracking-[0.1em] transition-colors hover:text-theme-primary hover:border-theme-accent"
        >
          ← BACK
        </button>

        <div className="text-theme-muted text-[11px] tracking-[0.25em] text-center">
          {gameId?.toUpperCase()}
          {currentModeObj && (
            <span style={{ color: currentModeObj.color, marginLeft: 8 }}>
              · {currentModeObj.modeLabel}
            </span>
          )}
          {!currentModeObj && <span> · SELECT MODE</span>}
        </div>

        {/* Theme switcher */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={prevTheme}
            aria-label="Previous theme"
            className="text-sm text-theme-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
          >‹</button>
          <div className="scroll-x-hidden flex gap-1 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch', maxWidth: 180 }}>
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`shrink-0 px-3.5 py-2 rounded-sm cursor-pointer text-[10px] font-theme tracking-[0.1em] ${
                  theme === t.id
                    ? 'bg-theme-accent text-black'
                    : 'bg-theme-surface border border-theme text-theme-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            onClick={nextTheme}
            aria-label="Next theme"
            className="text-sm text-theme-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
          >›</button>
        </div>
      </nav>

      {/* ── Main body ───────────────────────────────────────────────────── */}
      <main id="mode-content" className="flex-1 flex flex-col items-center px-3 py-4 gap-5 overflow-y-auto">

        {/* Phase 1: mode cards — hidden once a mode is selected */}
        {!selectedMode && (
        <div className="w-full max-w-[680px] flex flex-col gap-4">
          {/* Title */}
          <div className="text-center">
            <div className="text-[11px] tracking-[0.4em] text-theme-muted mb-1.5 uppercase">
              CHOOSE YOUR BATTLE
            </div>
            <div className="text-[26px] font-bold text-theme-primary font-theme-display"
              style={{ textShadow: '0 0 20px var(--accent-primary)' }}
            >
              游戏模式
            </div>
          </div>

          {/* Mode cards grid */}
          <div className="grid grid-cols-2 gap-2">
            {visibleModes.map((mode) => {
              return (
                <button
                  key={mode.id}
                  aria-label={`${mode.title} - ${mode.titleCn}: ${mode.desc.replace('\n', ' ')}`}
                  onClick={() => handleSelectMode(mode.id)}
                  onMouseEnter={() => setHovered(mode.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="rounded-lg p-3 cursor-pointer text-left transition-all"
                  style={{
                    background: hovered === mode.id
                      ? `linear-gradient(135deg, var(--bg-surface), ${mode.color}18)`
                      : 'var(--bg-surface)',
                    border: `1px solid ${hovered === mode.id ? mode.color + '88' : 'var(--border-color)'}`,
                    boxShadow: hovered === mode.id ? `0 0 12px ${mode.color}22` : 'none',
                  }}
                >
                  <div className="text-xl mb-1.5">{mode.icon}</div>
                  <div
                    className="text-xs font-bold tracking-[0.15em] mb-0.5 font-theme-display transition-colors"
                    style={{ color: hovered === mode.id ? mode.color : 'var(--text-primary)' }}
                  >
                    {mode.title}
                  </div>
                  <div className="text-[11px] text-theme-secondary mb-1">
                    {mode.titleCn}
                  </div>
                  <div className="text-[11px] text-theme-muted whitespace-pre-line leading-relaxed">
                    {mode.desc}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        )}

        {/* Phase 2: configuration panel — replaces mode grid */}
        {selectedMode && (
          <div className="w-full max-w-[680px] bg-theme-secondary rounded-lg p-4"
            style={{
              border: `1px solid ${currentModeObj?.color || 'var(--border-color)'}`,
              boxShadow: `0 0 24px ${currentModeObj?.color || 'transparent'}22`,
            }}
          >
            {/* Panel header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">{currentModeObj?.icon}</span>
                <div>
                  <div className="text-[13px] font-bold tracking-[0.15em]"
                    style={{ color: currentModeObj?.color || 'var(--text-primary)' }}
                  >
                    {currentModeObj?.title}
                  </div>
                  <div className="text-[11px] text-theme-muted mt-px">
                    {currentModeObj?.titleCn}
                  </div>
                </div>
              </div>
              <button
                onClick={handleBack}
                className="bg-transparent border-none text-theme-muted cursor-pointer font-theme text-[11px] tracking-[0.1em] px-2 py-1 transition-colors hover:text-theme-primary"
              >
                ← 重选模式
              </button>
            </div>

            {/* Panel content */}
            {selectedMode === 'ai' && (
              <PanelAI gameId={gameId} onConfirm={onSelectMode} />
            )}
            {selectedMode === 'local' && (
              <PanelLocal gameId={gameId} onConfirm={onSelectMode} />
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
        <div className="text-[10px] text-theme-muted text-center tracking-[0.15em] pb-2 overflow-x-auto whitespace-nowrap"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          NO SERVER · LOCAL FIRST · E2E · HASH CHAIN
        </div>
      </main>
    </div>
  )
}
