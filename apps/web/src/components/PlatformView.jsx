import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GAME_CATALOG } from '../plugins/index.js'
import useThemeCycle from '../hooks/useThemeCycle.js'
import { btn, btnPrimary, card } from '../lib/sharedStyles.js'

// ── Rank helpers ──────────────────────────────────────────────────────────────
const RANK_TIERS = [
  { title: '初段', titleEn: 'DAN 1', color: '#888888', min: 0,    max: 999  },
  { title: '二段', titleEn: 'DAN 2', color: '#4ade80', min: 1000, max: 1999 },
  { title: '三段', titleEn: 'DAN 3', color: '#22c55e', min: 2000, max: 2999 },
  { title: '四段', titleEn: 'DAN 4', color: '#facc15', min: 3000, max: 3999 },
  { title: '五段', titleEn: 'DAN 5', color: '#eab308', min: 4000, max: 4999 },
  { title: '六段', titleEn: 'DAN 6', color: '#f97316', min: 5000, max: 5999 },
  { title: '七段', titleEn: 'DAN 7', color: '#ef4444', min: 6000, max: 6999 },
  { title: '八段', titleEn: 'DAN 8', color: '#a855f7', min: 7000, max: 7999 },
  { title: '九段', titleEn: 'DAN 9', color: '#e11d48', min: 8000, max: Infinity },
]

function getRankForElo(elo) {
  return RANK_TIERS.find(r => elo >= r.min && elo <= r.max) ?? RANK_TIERS[0]
}

function formatTimeSince(isoString) {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}小时前`
  return `${Math.floor(hrs / 24)}天前`
}


// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 3 }) {
  return (
    <div
      className={`grid items-center gap-2 px-4 py-3`}
      style={{ gridTemplateColumns: `36px 1fr ${Array(cols - 2).fill('72px').join(' ')}` }}
    >
      <div className="w-6 h-2.5 bg-border-c rounded-sm animate-pulse" />
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-border-c shrink-0 animate-pulse" />
        <div className="w-[90px] h-2.5 bg-border-c rounded-sm animate-pulse" />
      </div>
      {Array(Math.max(cols - 2, 1)).fill(0).map((_, i) => (
        <div key={i} className="w-10 h-2.5 bg-border-c rounded-sm ml-auto animate-pulse" />
      ))}
    </div>
  )
}

// ── MATCH TAB ─────────────────────────────────────────────────────────────────
function MatchTab({ platform, onMatchReady }) {
  const { user, isOnline, queueState, queueMode, matchInfo, leaveQueue, joinQueue } = platform
  const canQueue = isOnline && Boolean(user)

  // Match found overlay
  if (queueState === 'matched' && matchInfo) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <div
          className="rounded-lg border border-accent bg-bg-surface p-10 text-center"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))' }}
        >
          <div className="text-[13px] tracking-[0.3em] text-accent mb-5">
            ✦ MATCH FOUND ✦
          </div>
          <div className="text-[11px] text-text-muted mb-1.5 tracking-[0.1em]">
            对手
          </div>
          <div className="text-[22px] font-bold text-text-primary mb-1">
            {matchInfo.opponentNickname}
          </div>
          {matchInfo.opponentElo != null && (
            <div className="text-xs text-text-muted mb-6">
              ELO {matchInfo.opponentElo} · {getRankForElo(matchInfo.opponentElo).title}
            </div>
          )}
          <div className="text-[10px] text-text-muted mb-7 tracking-[0.15em]">
            {matchInfo.mode === 'ranked' ? '段位赛 · RANKED' : '休闲赛 · CASUAL'}
            &nbsp;·&nbsp;
            {matchInfo.youAre === 'host' ? '执黑先行' : '执白后行'}
          </div>
          <div className="text-[10px] text-text-muted mb-5 tracking-[0.1em]">
            正在建立加密连接…
          </div>
          <button
            onClick={() => onMatchReady({ roomCode: matchInfo.roomCode, youAre: matchInfo.youAre, matchInfo })}
            style={btnPrimary({ padding: '12px 40px', fontSize: 13 })}
          >
            开始对局
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 py-8">
      {/* Status banner when not logged in */}
      {!user && (
        <div
          className="px-[18px] py-3 rounded-md text-[12px] text-accent tracking-[0.1em] text-center"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-surface))', border: '1px solid var(--accent-primary)' }}
        >
          请先前往「PROFILE」设置昵称以开始匹配
        </div>
      )}

      {/* Ranked + Casual cards */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            mode: 'ranked',
            icon: '🏆',
            title: 'RANKED',
            titleCn: '段位赛',
            desc: '胜负影响段位积分\n赛季结算奖励',
            accentColor: '#facc15',
          },
          {
            mode: 'casual',
            icon: '🎮',
            title: 'CASUAL',
            titleCn: '休闲赛',
            desc: '不影响段位\n轻松对局',
            accentColor: 'var(--accent-primary)',
          },
        ].map((m) => {
          const isQueuing = queueState === 'queuing' && queueMode === m.mode
          const otherQueuing = queueState === 'queuing' && queueMode !== m.mode

          return (
            <div
              key={m.mode}
              onClick={() => {
                if (!canQueue) return
                if (isQueuing) leaveQueue()
                else if (!otherQueuing) joinQueue(m.mode)
              }}
              style={{
                ...card({
                  padding: '20px 16px',
                  textAlign: 'center',
                  cursor: canQueue && !otherQueuing ? 'pointer' : 'default',
                  opacity: otherQueuing ? 0.4 : 1,
                  border: isQueuing
                    ? `1px solid ${m.accentColor}`
                    : '1px solid var(--border-color)',
                  background: isQueuing
                    ? `color-mix(in srgb, ${m.accentColor} 8%, var(--bg-surface))`
                    : 'var(--bg-surface)',
                  transition: 'all 0.2s',
                  overflow: 'hidden',
                }),
              }}
            >
              <div className="text-[32px] mb-3">{m.icon}</div>
              <div
                className="text-[13px] font-bold tracking-[0.15em] mb-1"
                style={{ color: isQueuing ? m.accentColor : 'var(--text-primary)' }}
              >
                {m.title}
              </div>
              <div className="text-[11px] text-text-secondary mb-2.5">{m.titleCn}</div>
              <div className="text-[10px] text-text-muted whitespace-pre-line leading-[1.7] mb-4">
                {m.desc}
              </div>

              {isQueuing ? (
                <div className="flex flex-col items-center gap-2">
                  {/* Pulsing dots */}
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div
                        key={i}
                        style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: m.accentColor,
                          animation: `platformPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="text-[10px] tracking-[0.1em]" style={{ color: m.accentColor }}>
                    正在匹配…
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); leaveQueue() }}
                    style={btn({ fontSize: 10, padding: '4px 12px' })}
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  disabled={!canQueue || otherQueuing}
                  onClick={(e) => { e.stopPropagation(); if (canQueue) joinQueue(m.mode) }}
                  style={btn({
                    fontSize: 10,
                    padding: '14px 16px',
                    cursor: canQueue && !otherQueuing ? 'pointer' : 'not-allowed',
                    opacity: canQueue && !otherQueuing ? 1 : 0.45,
                    whiteSpace: 'nowrap',
                  })}
                >
                  开始匹配
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Queue tip */}
      {canQueue && queueState === 'idle' && (
        <div className="text-[10px] text-text-muted text-center tracking-[0.1em]">
          平均匹配时间 &lt; 30 秒
        </div>
      )}
    </div>
  )
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ platform }) {
  const { user, setNickname, isOnline } = platform
  const navigate = useNavigate()
  const [nicknameInput, setNicknameInput] = useState('')
  const [registering, setRegistering] = useState(false)
  const [editingNickname, setEditingNickname] = useState(false)
  const [editInput, setEditInput] = useState('')
  const [error, setError] = useState('')

  const handleRegister = async () => {
    const name = nicknameInput.trim()
    if (name.length < 2 || name.length > 16) {
      setError('昵称长度须为 2–16 个字符')
      return
    }
    setError('')
    setRegistering(true)
    try {
      await setNickname(name)
    } catch (e) {
      setError(e.message)
    } finally {
      setRegistering(false)
    }
  }

  const handleEditNickname = async () => {
    const name = editInput.trim()
    if (name.length < 2 || name.length > 16) {
      setError('昵称长度须为 2–16 个字符')
      return
    }
    setError('')
    await setNickname(name)
    setEditingNickname(false)
  }

  if (!user) {
    // Registration form
    return (
      <div className="flex flex-col gap-6 py-8">
        <div className="border border-border-c rounded-lg bg-bg-surface p-10 text-center">
          <div className="text-[48px] mb-5">👤</div>
          <div className="text-[15px] font-bold tracking-[0.2em] text-text-primary mb-2">
            CREATE PROFILE
          </div>
          <div className="text-[11px] text-text-muted mb-7 leading-[1.8]">
            设置昵称以开始匹配、追踪战绩
          </div>
          <div className="flex flex-col gap-3 max-w-[280px] mx-auto">
            <input
              type="text"
              placeholder="输入昵称 (2–16 字符)"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              maxLength={16}
              className="text-[13px] px-3.5 py-2.5 bg-bg-primary border border-border-c rounded text-text-primary tracking-[0.05em] text-center outline-none"
            />
            {error && (
              <div className="text-[10px] text-center" style={{ color: 'var(--accent-danger, #f87171)' }}>
                {error}
              </div>
            )}
            <button
              onClick={handleRegister}
              disabled={registering || nicknameInput.trim().length < 2}
              style={btnPrimary({
                padding: '10px 24px',
                opacity: (registering || nicknameInput.trim().length < 2) ? 0.5 : 1,
                cursor: (registering || nicknameInput.trim().length < 2) ? 'not-allowed' : 'pointer',
              })}
            >
              {registering ? '注册中…' : '开始游戏'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Logged-in profile
  const rankTier = getRankForElo(user.elo ?? 1200)
  const totalGames = (user.wins ?? 0) + (user.losses ?? 0) + (user.draws ?? 0)
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0

  return (
    <div className="flex flex-col gap-5 py-8">
      {/* Avatar + name + rank */}
      <div className="border border-border-c rounded-lg bg-bg-surface p-6 flex items-center gap-5">
        <div
          className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-[28px] font-bold shrink-0"
          style={{
            background: `color-mix(in srgb, ${rankTier.color} 20%, var(--bg-primary))`,
            border: `2px solid ${rankTier.color}`,
            color: rankTier.color,
          }}
        >
          {(user.nickname ?? '?')[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          {editingNickname ? (
            <div className="flex gap-2 items-center mb-2">
              <input
                type="text"
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEditNickname(); if (e.key === 'Escape') setEditingNickname(false) }}
                maxLength={16}
                autoFocus
                className="text-sm px-2 py-1 bg-bg-primary border border-accent rounded text-text-primary flex-1 outline-none"
              />
              <button onClick={handleEditNickname} style={btnPrimary({ padding: '4px 10px', fontSize: 10 })}>确定</button>
              <button onClick={() => setEditingNickname(false)} style={btn({ padding: '4px 10px', fontSize: 10 })}>取消</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[17px] font-bold text-text-primary">
                {user.nickname}
              </span>
              <button
                onClick={() => { setEditInput(user.nickname); setEditingNickname(true) }}
                title="编辑昵称"
                className="bg-none border-none cursor-pointer text-text-muted text-xs p-0.5 px-1"
              >
                ✎
              </button>
            </div>
          )}
          {error && <div className="text-[10px] mb-1" style={{ color: 'var(--accent-danger, #f87171)' }}>{error}</div>}
          <div className="flex items-center gap-2">
            <span
              className="text-[9px] tracking-[0.15em] font-bold px-1.5 py-0.5 rounded-sm"
              style={{
                color: rankTier.color,
                border: `1px solid ${rankTier.color}`,
              }}
            >
              {rankTier.title} · {rankTier.titleEn}
            </span>
            <span className="text-[10px] text-text-muted">
              {isOnline ? '● 在线' : '○ 离线'}
            </span>
          </div>
        </div>
      </div>

      {/* ELO score */}
      <div
        className="border rounded-lg bg-bg-surface px-6 py-5 flex items-center justify-between"
        style={{
          borderColor: `${rankTier.color}44`,
          background: `color-mix(in srgb, ${rankTier.color} 6%, var(--bg-surface))`,
        }}
      >
        <div>
          <div className="text-[10px] tracking-[0.2em] text-text-muted mb-1">ELO RATING</div>
          <div className="text-[28px] font-bold" style={{ color: rankTier.color }}>
            {user.elo ?? 1200}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.15em] text-text-muted mb-1">当前段位</div>
          <div className="text-lg font-bold" style={{ color: rankTier.color }}>{rankTier.title}</div>
          <div className="text-[9px] text-text-muted">{rankTier.titleEn}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { label: '胜', value: user.wins ?? 0, color: 'var(--accent-success, #4ade80)' },
          { label: '负', value: user.losses ?? 0, color: 'var(--accent-danger, #f87171)' },
          { label: '平', value: user.draws ?? 0, color: 'var(--text-muted)' },
          { label: '胜率', value: `${winRate}%`, color: winRate >= 50 ? 'var(--accent-success, #4ade80)' : 'var(--text-primary)' },
        ].map(s => (
          <div
            key={s.label}
            className="border border-border-c rounded-lg bg-bg-surface px-2 py-4 text-center"
          >
            <div className="text-xl font-bold mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-[9px] text-text-muted tracking-[0.15em]">
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Per-game ratings */}
      {(() => {
        const rankedGames = GAME_CATALOG.filter(g => g.ranked && g.eloKey)
        if (rankedGames.length === 0) return null
        return (
          <div className="border border-border-c rounded-lg bg-bg-surface">
            <div className="text-[9px] tracking-[0.2em] text-text-muted mb-3 p-6 pb-0">
              段位 · 分游戏评分
            </div>
            <div className="flex flex-col gap-2 p-6 pt-0">
              {rankedGames.map(g => {
                const elo = user[g.eloKey] ?? (g.eloKey === 'elo' ? user.elo : null) ?? 1200
                const tier = getRankForElo(elo)
                return (
                  <div key={g.id} className="flex items-center gap-3 px-3.5 py-2.5 border border-border-c rounded bg-bg-primary">
                    <span className="text-xl">{g.icon}</span>
                    <div className="flex-1">
                      <div className="text-[11px] font-bold tracking-[0.1em]">{g.name}</div>
                      <div className="text-[9px] text-text-muted mt-0.5">{g.nameEn}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold" style={{ color: tier.color }}>
                        {elo}
                      </div>
                      <div className="text-[9px] tracking-[0.1em]" style={{ color: tier.color }}>
                        {tier.title}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Style Center entry */}
      <button
        onClick={() => navigate('/styles')}
        className="border border-border-c rounded bg-bg-surface text-text-primary text-[11px] tracking-[0.12em] cursor-pointer w-full px-5 py-3.5 flex items-center justify-between transition-all duration-150 hover:border-accent hover:text-accent"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">🎭</span>
          <div className="text-left">
            <div className="text-[11px] font-bold tracking-[0.15em]">STYLE CENTER</div>
            <div className="text-[9px] text-text-muted mt-0.5">棋风中心 · 生成 / 导入 / 分享</div>
          </div>
        </div>
        <span className="text-xs text-text-muted">→</span>
      </button>
    </div>
  )
}

// ── ROOMS TAB ─────────────────────────────────────────────────────────────────
function RoomsTab({ platform, activeTab }) {
  const { rooms, roomsLoading, refreshRooms, createPublicRoom, joinPublicRoom, isOnline } = platform
  const [showCreate, setShowCreate] = useState(false)
  const [roomTitle, setRoomTitle] = useState('')
  const [createdCode, setCreatedCode] = useState(null)
  const [creating, setCreating] = useState(false)
  const intervalRef = useRef(null)

  // Auto-refresh every 10s when tab active
  useEffect(() => {
    if (activeTab !== 'rooms') return
    refreshRooms()
    intervalRef.current = setInterval(refreshRooms, 10000)
    return () => clearInterval(intervalRef.current)
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for room_created event from usePlatformConn
  useEffect(() => {
    const handler = (e) => {
      setCreatedCode(e.detail?.room)
      setCreating(false)
    }
    window.addEventListener('platform:room_created', handler)
    return () => window.removeEventListener('platform:room_created', handler)
  }, [])

  const handleCreate = () => {
    if (!roomTitle.trim()) return
    setCreating(true)
    createPublicRoom(roomTitle.trim())
    setTimeout(() => setCreating(false), 8000) // fallback
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="text-[13px] font-bold tracking-[0.15em] text-text-primary">
            公开房间
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">
            {roomsLoading ? '刷新中…' : `${rooms.length} 个房间在线`}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={refreshRooms} style={btn({ padding: '7px 12px' })} title="刷新">
            ↻
          </button>
          <button
            onClick={() => setShowCreate(v => !v)}
            disabled={!isOnline}
            style={btn({
              padding: '10px 16px',
              cursor: isOnline ? 'pointer' : 'not-allowed',
              opacity: isOnline ? 1 : 0.45,
              background: showCreate ? 'var(--accent-primary)' : 'var(--bg-surface)',
              color: showCreate ? '#000' : 'var(--text-primary)',
              borderColor: showCreate ? 'var(--accent-primary)' : 'var(--border-color)',
            })}
          >
            + 创建房间
          </button>
        </div>
      </div>

      {/* Create room panel */}
      {showCreate && (
        <div className="border border-border-c rounded-lg bg-bg-surface p-5">
          {createdCode ? (
            <div className="text-center">
              <div className="text-[11px] text-text-muted mb-2 tracking-[0.1em]">
                房间创建成功 — 分享房间码
              </div>
              <div className="text-2xl font-bold tracking-[0.3em] text-accent mb-4">
                {createdCode}
              </div>
              <button onClick={() => { setCreatedCode(null); setShowCreate(false); setRoomTitle('') }} style={btn()}>
                关闭
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="房间名称（可选）"
                value={roomTitle}
                onChange={e => setRoomTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={32}
                className="flex-1 text-xs px-3 py-2 bg-bg-primary border border-border-c rounded text-text-primary outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={creating}
                style={btnPrimary({ opacity: creating ? 0.6 : 1, cursor: creating ? 'not-allowed' : 'pointer' })}
              >
                {creating ? '…' : '创建'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Room list */}
      {rooms.length === 0 && !roomsLoading ? (
        <div className="border border-dashed border-border-c rounded-lg bg-bg-surface px-8 py-[60px] text-center">
          <div className="text-[40px] mb-4 opacity-40">🏠</div>
          <div className="text-xs text-text-muted leading-[1.8]">
            暂无公开房间<br />
            <span className="text-[10px] tracking-[0.1em]">创建房间邀请好友对局</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {roomsLoading && rooms.length === 0 && [1, 2, 3].map(i => (
            <div key={i} className="border border-border-c rounded-lg bg-bg-surface opacity-30 px-4 py-4 flex items-center justify-between">
              <div className="flex gap-3.5 items-center">
                <div className="w-8 h-8 rounded-full bg-border-c" />
                <div>
                  <div className="w-[120px] h-2.5 bg-border-c rounded-sm mb-1.5" />
                  <div className="w-20 h-2 bg-border-c rounded-sm" />
                </div>
              </div>
              <div className="w-[52px] h-7 bg-border-c rounded" />
            </div>
          ))}
          {rooms.map(room => (
            <div
              key={room.code}
              className="border border-border-c rounded-lg bg-bg-surface px-4 py-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-bg-primary border border-border-c flex items-center justify-center text-sm font-bold text-text-secondary shrink-0">
                  {(room.hostNickname ?? '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-text-primary mb-0.5 truncate">
                    {room.title || `${room.hostNickname} 的房间`}
                  </div>
                  <div className="text-[10px] text-text-muted">
                    {room.hostNickname} · {formatTimeSince(room.createdAt)}
                    {room.waiting && <span className="text-accent ml-1.5">等待中</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => joinPublicRoom(room.code)}
                style={btnPrimary({ padding: '7px 14px', whiteSpace: 'nowrap' })}
              >
                加入
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── RANK TAB ──────────────────────────────────────────────────────────────────
function RankTab({ platform, activeTab }) {
  const { leaderboard, leaderboardLoading, fetchLeaderboard, user } = platform

  useEffect(() => {
    if (activeTab === 'rank') fetchLeaderboard()
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  const RANK_DISPLAY = [
    { title: '初段', titleEn: 'DAN 1', color: '#888', range: '0–999' },
    { title: '三段', titleEn: 'DAN 3', color: '#4ade80', range: '2000–2999' },
    { title: '五段', titleEn: 'DAN 5', color: '#facc15', range: '4000–4999' },
    { title: '七段', titleEn: 'DAN 7', color: '#f97316', range: '6000–6999' },
    { title: '九段', titleEn: 'DAN 9', color: '#e11d48', range: '8000+' },
  ]

  const rankColors = ['#facc15', '#94a3b8', '#b45309'] // gold, silver, bronze

  return (
    <div className="flex flex-col gap-6 py-8">
      {/* Rank tier cards */}
      <div>
        <div className="text-[11px] tracking-[0.3em] text-text-muted mb-3.5">
          段位体系 · RANK SYSTEM
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {RANK_DISPLAY.map(r => (
            <div
              key={r.titleEn}
              className="rounded-md px-1.5 py-3 text-center"
              style={{
                border: `1px solid ${r.color}44`,
                background: `color-mix(in srgb, ${r.color} 5%, var(--bg-surface))`,
              }}
            >
              <div className="text-lg font-bold mb-1.5" style={{ color: r.color }}>{r.title}</div>
              <div className="text-[9px] tracking-[0.1em] text-text-muted">{r.titleEn}</div>
              <div className="text-[8px] text-text-muted mt-1">{r.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard table */}
      <div>
        <div className="flex justify-between items-center mb-3.5">
          <div className="text-[11px] tracking-[0.3em] text-text-muted">
            全球排行榜 · GLOBAL LEADERBOARD
          </div>
          <button onClick={fetchLeaderboard} style={btn({ padding: '4px 10px', fontSize: 10 })}>
            刷新
          </button>
        </div>

        <div className="border border-border-c rounded-lg overflow-hidden">
          {/* Header */}
          <div
            className="grid px-4 py-2.5 border-b border-border-c text-[9px] tracking-[0.2em] text-text-muted bg-bg-secondary"
            style={{ gridTemplateColumns: '36px 1fr 72px' }}
          >
            <span>#</span>
            <span>玩家</span>
            <span className="text-right">积分</span>
          </div>

          {leaderboardLoading && leaderboard.length === 0
            ? [1, 2, 3].map(i => (
              <div key={i} className="border-b border-border-c">
                <SkeletonRow cols={3} />
              </div>
            ))
            : leaderboard.length === 0
              ? (
                <div className="px-4 py-10 text-center text-[11px] text-text-muted tracking-[0.1em]">
                  暂无排行数据
                </div>
              )
              : leaderboard.map((entry, idx) => {
                const isCurrentUser = user && entry.nickname === user.nickname
                const rankColor = idx < 3 ? rankColors[idx] : 'var(--text-muted)'
                const tier = getRankForElo(entry.elo ?? 0)

                return (
                  <div
                    key={entry.rank ?? idx}
                    className="grid px-4 py-3 border-b border-border-c items-center transition-colors duration-150"
                    style={{
                      gridTemplateColumns: '36px 1fr 72px',
                      background: isCurrentUser
                        ? 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-surface))'
                        : 'transparent',
                    }}
                  >
                    <span className="text-sm font-bold" style={{ color: rankColor }}>
                      {entry.rank ?? idx + 1}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          background: `color-mix(in srgb, ${tier.color} 15%, var(--bg-primary))`,
                          border: `1px solid ${tier.color}55`,
                          color: tier.color,
                        }}
                      >
                        {(entry.nickname ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div
                          className="text-xs"
                          style={{ color: isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)', fontWeight: isCurrentUser ? 'bold' : 'normal' }}
                        >
                          {entry.nickname}
                          {isCurrentUser && (
                            <span className="text-[9px] ml-1.5 text-accent">YOU</span>
                          )}
                        </div>
                        <div className="text-[9px] tracking-[0.05em] mt-0.5" style={{ color: tier.color }}>
                          {tier.title} · {entry.winRate != null ? `${entry.winRate}% 胜率` : ''}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-text-primary text-right">
                      {entry.elo ?? '—'}
                    </span>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}

// ── CSS keyframes (injected once) ─────────────────────────────────────────────
const PLATFORM_STYLES = `
@keyframes platformPulse {
  0%, 100% { opacity: 0.3; transform: scale(0.85); }
  50%       { opacity: 1;   transform: scale(1.15); }
}
@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.9; }
}
`

let stylesInjected = false
function injectStyles() {
  if (stylesInjected) return
  stylesInjected = true
  const el = document.createElement('style')
  el.textContent = PLATFORM_STYLES
  document.head.appendChild(el)
}

// ── TABS config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'match',   label: 'MATCH',   labelCn: '匹配对战' },
  { id: 'rooms',   label: 'ROOMS',   labelCn: '房间列表' },
  { id: 'rank',    label: 'RANK',    labelCn: '排行榜'   },
  { id: 'profile', label: 'PROFILE', labelCn: '个人中心' },
]

// ── PlatformView ──────────────────────────────────────────────────────────────
export default function PlatformView({ onBack, platform, onMatchReady }) {
  const { theme, themes, setTheme, prevTheme, nextTheme } = useThemeCycle()
  const [activeTab, setActiveTab] = useState('match')


  useEffect(() => { injectStyles() }, [])

  const { isOnline, onlineCount, isAvailable } = platform ?? {}

  return (
    <div className="h-[100svh] bg-bg-primary flex flex-col overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border-c bg-bg-secondary sticky top-0 z-[100]">
        <div className="flex items-center gap-5">
          <button
            onClick={onBack}
            className="bg-none border border-border-c text-text-muted px-3.5 py-1.5 rounded cursor-pointer text-xs tracking-[0.1em]"
          >
            ← BACK
          </button>
          <div className="min-w-0">
            <div className="text-[13px] font-bold tracking-[0.25em] text-accent">
              ONLINE PLATFORM
            </div>
            <div className="text-[10px] text-text-muted tracking-[0.2em] mt-px truncate">
              在线对弈平台 · H5
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Online indicator */}
          <div
            className="flex items-center gap-1.5 text-[10px] tracking-[0.1em] whitespace-nowrap"
            style={{ color: isOnline ? 'var(--text-secondary)' : 'var(--text-muted)' }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full transition-all duration-300"
              style={{
                background: isOnline ? '#4ade80' : 'var(--border-color)',
                boxShadow: isOnline ? '0 0 6px #4ade80' : 'none',
              }}
            />
            {isOnline
              ? `${onlineCount > 0 ? onlineCount + ' 在线' : '已连接'}`
              : (isAvailable ? 'OFFLINE' : 'UNAVAIL')
            }
          </div>

          {/* Theme switcher */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={prevTheme}
              aria-label="Previous theme"
              className="text-sm text-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
            >‹</button>
            <div className="scroll-x-hidden flex gap-1 overflow-x-auto max-w-[160px]" style={{ WebkitOverflowScrolling: 'touch' }}>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className="shrink-0 px-2 py-1 rounded cursor-pointer text-[9px] tracking-[0.1em] transition-colors"
                  style={{
                    background: theme === t.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    border: `1px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    color: theme === t.id ? '#000' : 'var(--text-muted)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={nextTheme}
              aria-label="Next theme"
              className="text-sm text-accent select-none px-1.5 py-1 cursor-pointer bg-transparent border-none"
            >›</button>
          </div>
        </div>
      </header>

      {/* ── Tab nav (desktop only) ───────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Platform sections"
        className="hidden md:flex border-b border-border-c bg-bg-secondary px-8"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className="px-5 py-3 bg-none border-none cursor-pointer text-[11px] tracking-[0.2em] transition-all duration-150 -mb-px"
            style={{
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            <div>{tab.label}</div>
            <div className="text-[9px] mt-px opacity-70">{tab.labelCn}</div>
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[760px] w-full mx-auto px-6 pb-[120px] overflow-y-auto min-h-0">
        {activeTab === 'match' && (
          <MatchTab platform={platform} onMatchReady={onMatchReady} />
        )}
        {activeTab === 'rooms' && (
          <RoomsTab platform={platform} activeTab={activeTab} />
        )}
        {activeTab === 'rank' && (
          <RankTab platform={platform} activeTab={activeTab} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab platform={platform} />
        )}
      </main>

      {/* ── Mobile Bottom Tab Bar ─────────────────────────────────────────────── */}
      <nav
        role="tablist"
        aria-label="Platform sections"
        className="fixed bottom-0 left-0 right-0 z-[200] bg-bg-secondary border-t border-border-c flex md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 flex flex-col items-center justify-center px-1 py-2.5 bg-none border-none cursor-pointer gap-[3px] transition-all duration-150"
            style={{
              borderTop: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          >
            <span className="text-lg">
              {tab.id === 'match' ? '⚔️' : tab.id === 'rooms' ? '🏠' : tab.id === 'rank' ? '🏆' : '👤'}
            </span>
            <span className="text-[9px] tracking-[0.1em]">{tab.labelCn}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="hidden md:flex border-t border-border-c bg-bg-secondary px-8 py-3 justify-center gap-6">
        {[
          { label: '在线匹配', active: isOnline },
          { label: '公开房间', active: isOnline },
          { label: '全球排行', active: true },
          { label: '个人档案', active: true },
        ].map(item => (
          <div
            key={item.label}
            className="text-[10px] text-text-muted tracking-[0.15em] flex items-center gap-1.5"
            style={{ opacity: item.active ? 0.7 : 0.35 }}
          >
            <span style={{ color: item.active ? 'var(--accent-primary)' : 'var(--border-color)' }}>◆</span>
            {item.label}
          </div>
        ))}
      </footer>
    </div>
  )
}
