import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../contexts/ThemeContext.jsx'

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

// ── Shared style tokens ───────────────────────────────────────────────────────
const btn = (extra = {}) => ({
  fontFamily: 'var(--font-primary)',
  fontSize: 11,
  letterSpacing: '0.12em',
  cursor: 'pointer',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  padding: '7px 16px',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  transition: 'all 0.15s',
  ...extra,
})

const btnPrimary = (extra = {}) => btn({
  background: 'var(--accent-primary)',
  borderColor: 'var(--accent-primary)',
  color: '#000',
  fontWeight: 'bold',
  ...extra,
})

const card = (extra = {}) => ({
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  background: 'var(--bg-surface)',
  ...extra,
})

// ── Skeleton row ──────────────────────────────────────────────────────────────
function SkeletonRow({ cols = 3 }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `36px 1fr ${Array(cols - 2).fill('72px').join(' ')}`,
      padding: '12px 16px',
      alignItems: 'center',
      gap: 8,
      animation: 'pulse 1.4s ease-in-out infinite',
    }}>
      <div style={{ width: 24, height: 10, background: 'var(--border-color)', borderRadius: 2 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border-color)', flexShrink: 0 }} />
        <div style={{ width: 90, height: 10, background: 'var(--border-color)', borderRadius: 2 }} />
      </div>
      {Array(Math.max(cols - 2, 1)).fill(0).map((_, i) => (
        <div key={i} style={{ width: 40, height: 10, background: 'var(--border-color)', borderRadius: 2, marginLeft: 'auto' }} />
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
        <div style={{
          ...card({ padding: '40px 32px', textAlign: 'center' }),
          borderColor: 'var(--accent-primary)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))',
        }}>
          <div style={{ fontSize: 13, letterSpacing: '0.3em', color: 'var(--accent-primary)', marginBottom: 20 }}>
            ✦ MATCH FOUND ✦
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: '0.1em' }}>
            对手
          </div>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 4 }}>
            {matchInfo.opponentNickname}
          </div>
          {matchInfo.opponentElo != null && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24 }}>
              ELO {matchInfo.opponentElo} · {getRankForElo(matchInfo.opponentElo).title}
            </div>
          )}
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 28, letterSpacing: '0.15em' }}>
            {matchInfo.mode === 'ranked' ? '段位赛 · RANKED' : '休闲赛 · CASUAL'}
            &nbsp;·&nbsp;
            {matchInfo.youAre === 'host' ? '执黑先行' : '执白后行'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 20, letterSpacing: '0.1em' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '32px 0' }}>
      {/* Status banner when not logged in */}
      {!user && (
        <div style={{
          padding: '12px 18px',
          background: 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-surface))',
          border: '1px solid var(--accent-primary)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--accent-primary)',
          letterSpacing: '0.1em',
          textAlign: 'center',
        }}>
          请先前往「PROFILE」设置昵称以开始匹配
        </div>
      )}

      {/* Ranked + Casual cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
              <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
              <div style={{
                fontSize: 13, fontWeight: 'bold', letterSpacing: '0.15em',
                color: isQueuing ? m.accentColor : 'var(--text-primary)',
                marginBottom: 4,
              }}>
                {m.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 10 }}>{m.titleCn}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.7, marginBottom: 16 }}>
                {m.desc}
              </div>

              {isQueuing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {/* Pulsing dots */}
                  <div style={{ display: 'flex', gap: 5 }}>
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
                  <div style={{ fontSize: 10, color: m.accentColor, letterSpacing: '0.1em' }}>
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', letterSpacing: '0.1em' }}>
          平均匹配时间 &lt; 30 秒
        </div>
      )}
    </div>
  )
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ platform }) {
  const { user, setNickname, isOnline } = platform
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
        <div style={card({ padding: '40px 32px', textAlign: 'center' })}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>👤</div>
          <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: '0.2em', color: 'var(--text-primary)', marginBottom: 8 }}>
            CREATE PROFILE
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 28, lineHeight: 1.8 }}>
            设置昵称以开始匹配、追踪战绩
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 280, margin: '0 auto' }}>
            <input
              type="text"
              placeholder="输入昵称 (2–16 字符)"
              value={nicknameInput}
              onChange={e => setNicknameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRegister()}
              maxLength={16}
              style={{
                fontFamily: 'var(--font-primary)',
                fontSize: 13,
                padding: '10px 14px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
                textAlign: 'center',
                outline: 'none',
              }}
            />
            {error && (
              <div style={{ fontSize: 10, color: 'var(--accent-danger, #f87171)', textAlign: 'center' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '32px 0' }}>
      {/* Avatar + name + rank */}
      <div style={card({
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      })}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: `color-mix(in srgb, ${rankTier.color} 20%, var(--bg-primary))`,
          border: `2px solid ${rankTier.color}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, fontWeight: 'bold', color: rankTier.color,
          flexShrink: 0, letterSpacing: 0,
        }}>
          {(user.nickname ?? '?')[0].toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingNickname ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input
                type="text"
                value={editInput}
                onChange={e => setEditInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEditNickname(); if (e.key === 'Escape') setEditingNickname(false) }}
                maxLength={16}
                autoFocus
                style={{
                  fontFamily: 'var(--font-primary)',
                  fontSize: 14,
                  padding: '4px 8px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--accent-primary)',
                  borderRadius: 3,
                  color: 'var(--text-primary)',
                  flex: 1,
                  outline: 'none',
                }}
              />
              <button onClick={handleEditNickname} style={btnPrimary({ padding: '4px 10px', fontSize: 10 })}>确定</button>
              <button onClick={() => setEditingNickname(false)} style={btn({ padding: '4px 10px', fontSize: 10 })}>取消</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 17, fontWeight: 'bold', color: 'var(--text-primary)' }}>
                {user.nickname}
              </span>
              <button
                onClick={() => { setEditInput(user.nickname); setEditingNickname(true) }}
                title="编辑昵称"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, padding: '2px 4px',
                }}
              >
                ✎
              </button>
            </div>
          )}
          {error && <div style={{ fontSize: 10, color: 'var(--accent-danger, #f87171)', marginBottom: 4 }}>{error}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              fontSize: 9, letterSpacing: '0.15em', fontWeight: 'bold',
              color: rankTier.color,
              border: `1px solid ${rankTier.color}`,
              padding: '2px 6px', borderRadius: 2,
            }}>
              {rankTier.title} · {rankTier.titleEn}
            </span>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              {isOnline ? '● 在线' : '○ 离线'}
            </span>
          </div>
        </div>
      </div>

      {/* ELO score */}
      <div style={card({
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: `color-mix(in srgb, ${rankTier.color} 6%, var(--bg-surface))`,
        borderColor: `${rankTier.color}44`,
      })}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--text-muted)', marginBottom: 4 }}>ELO RATING</div>
          <div style={{ fontSize: 28, fontWeight: 'bold', color: rankTier.color }}>
            {user.elo ?? 1200}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>当前段位</div>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: rankTier.color }}>{rankTier.title}</div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>{rankTier.titleEn}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: '胜', value: user.wins ?? 0, color: 'var(--accent-success, #4ade80)' },
          { label: '负', value: user.losses ?? 0, color: 'var(--accent-danger, #f87171)' },
          { label: '平', value: user.draws ?? 0, color: 'var(--text-muted)' },
          { label: '胜率', value: `${winRate}%`, color: winRate >= 50 ? 'var(--accent-success, #4ade80)' : 'var(--text-primary)' },
        ].map(s => (
          <div
            key={s.label}
            style={card({ padding: '18px 8px', textAlign: 'center' })}
          >
            <div style={{ fontSize: 20, fontWeight: 'bold', color: s.color, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 0' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--text-primary)' }}>
            公开房间
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {roomsLoading ? '刷新中…' : `${rooms.length} 个房间在线`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
        <div style={card({ padding: '20px' })}>
          {createdCode ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.1em' }}>
                房间创建成功 — 分享房间码
              </div>
              <div style={{
                fontSize: 24, fontWeight: 'bold', letterSpacing: '0.3em',
                color: 'var(--accent-primary)', marginBottom: 16,
              }}>
                {createdCode}
              </div>
              <button onClick={() => { setCreatedCode(null); setShowCreate(false); setRoomTitle('') }} style={btn()}>
                关闭
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="房间名称（可选）"
                value={roomTitle}
                onChange={e => setRoomTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                maxLength={32}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-primary)',
                  fontSize: 12,
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  outline: 'none',
                }}
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
        <div style={{
          ...card({ padding: '60px 32px' }),
          textAlign: 'center',
          borderStyle: 'dashed',
        }}>
          <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>🏠</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            暂无公开房间<br />
            <span style={{ fontSize: 10, letterSpacing: '0.1em' }}>创建房间邀请好友对局</span>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {roomsLoading && rooms.length === 0 && [1, 2, 3].map(i => (
            <div key={i} style={{ ...card({ padding: '16px 16px', opacity: 0.3 }), display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-color)' }} />
                <div>
                  <div style={{ width: 120, height: 10, background: 'var(--border-color)', borderRadius: 2, marginBottom: 6 }} />
                  <div style={{ width: 80, height: 8, background: 'var(--border-color)', borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ width: 52, height: 28, background: 'var(--border-color)', borderRadius: 4 }} />
            </div>
          ))}
          {rooms.map(room => (
            <div
              key={room.code}
              style={{
                ...card({ padding: '16px 16px' }),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 'bold', color: 'var(--text-secondary)',
                  flexShrink: 0,
                }}>
                  {(room.hostNickname ?? '?')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {room.title || `${room.hostNickname} 的房间`}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {room.hostNickname} · {formatTimeSince(room.createdAt)}
                    {room.waiting && <span style={{ color: 'var(--accent-primary)', marginLeft: 6 }}>等待中</span>}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
      {/* Rank tier cards */}
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-muted)', marginBottom: 14 }}>
          段位体系 · RANK SYSTEM
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {RANK_DISPLAY.map(r => (
            <div
              key={r.titleEn}
              style={{
                border: `1px solid ${r.color}44`,
                borderRadius: 6,
                padding: '12px 6px',
                textAlign: 'center',
                background: `color-mix(in srgb, ${r.color} 5%, var(--bg-surface))`,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 'bold', color: r.color, marginBottom: 6 }}>{r.title}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{r.titleEn}</div>
              <div style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 4 }}>{r.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard table */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-muted)' }}>
            全球排行榜 · GLOBAL LEADERBOARD
          </div>
          <button onClick={fetchLeaderboard} style={btn({ padding: '4px 10px', fontSize: 10 })}>
            刷新
          </button>
        </div>

        <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '36px 1fr 72px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: 9,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
            background: 'var(--bg-secondary)',
          }}>
            <span>#</span>
            <span>玩家</span>
            <span style={{ textAlign: 'right' }}>积分</span>
          </div>

          {leaderboardLoading && leaderboard.length === 0
            ? [1, 2, 3].map(i => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <SkeletonRow cols={3} />
              </div>
            ))
            : leaderboard.length === 0
              ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
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
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '36px 1fr 72px',
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      alignItems: 'center',
                      background: isCurrentUser
                        ? 'color-mix(in srgb, var(--accent-primary) 8%, var(--bg-surface))'
                        : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    <span style={{
                      fontSize: 14, fontWeight: 'bold',
                      color: rankColor,
                    }}>
                      {entry.rank ?? idx + 1}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: `color-mix(in srgb, ${tier.color} 15%, var(--bg-primary))`,
                        border: `1px solid ${tier.color}55`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 'bold', color: tier.color, flexShrink: 0,
                      }}>
                        {(entry.nickname ?? '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{
                          fontSize: 12, color: isCurrentUser ? 'var(--accent-primary)' : 'var(--text-primary)',
                          fontWeight: isCurrentUser ? 'bold' : 'normal',
                        }}>
                          {entry.nickname}
                          {isCurrentUser && (
                            <span style={{ fontSize: 9, marginLeft: 6, color: 'var(--accent-primary)' }}>YOU</span>
                          )}
                        </div>
                        <div style={{ fontSize: 9, color: tier.color, letterSpacing: '0.05em', marginTop: 2 }}>
                          {tier.title} · {entry.winRate != null ? `${entry.winRate}% 胜率` : ''}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 'bold', color: 'var(--text-primary)', textAlign: 'right' }}>
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
  const { theme, themes, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('match')

  const currentThemeIndex = themes.findIndex(t => t.id === theme)
  const prevTheme = () => {
    const idx = (currentThemeIndex - 1 + themes.length) % themes.length
    setTheme(themes[idx].id)
  }
  const nextTheme = () => {
    const idx = (currentThemeIndex + 1) % themes.length
    setTheme(themes[idx].id)
  }

  useEffect(() => { injectStyles() }, [])

  const { isOnline, onlineCount, isAvailable } = platform ?? {}

  return (
    <div style={{
      height: '100svh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-primary)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <button
            onClick={onBack}
            style={{
              background: 'none',
              border: '1px solid var(--border-color)',
              color: 'var(--text-muted)',
              padding: '6px 14px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              fontSize: 12,
              letterSpacing: '0.1em',
            }}
          >
            ← BACK
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.25em', color: 'var(--accent-primary)' }}>
              ONLINE PLATFORM
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.2em', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              在线对弈平台 · H5
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Online indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: isOnline ? 'var(--text-secondary)' : 'var(--text-muted)',
            letterSpacing: '0.1em',
            whiteSpace: 'nowrap',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isOnline ? '#4ade80' : 'var(--border-color)',
              boxShadow: isOnline ? '0 0 6px #4ade80' : 'none',
              transition: 'all 0.3s',
            }} />
            {isOnline
              ? `${onlineCount > 0 ? onlineCount + ' 在线' : '已连接'}`
              : (isAvailable ? 'OFFLINE' : 'UNAVAIL')
            }
          </div>

          {/* Theme switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
            <span
              onClick={prevTheme}
              style={{ fontSize: 14, color: 'var(--accent-primary)', userSelect: 'none', padding: '4px 6px', cursor: 'pointer' }}
            >‹</span>
            <div className="scroll-x-hidden" style={{ display: 'flex', gap: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: 160 }}>
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  style={{
                    flexShrink: 0,
                    background: theme === t.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    border: `1px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    color: theme === t.id ? '#000' : 'var(--text-muted)',
                    padding: '4px 8px',
                    borderRadius: 3,
                    cursor: 'pointer',
                    fontSize: 9,
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
      </header>

      {/* ── Tab nav (desktop only) ───────────────────────────────────────────── */}
      <div
        className="hidden md:flex"
        style={{
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0 32px',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              fontSize: 11,
              letterSpacing: '0.2em',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              marginBottom: -1,
            }}
          >
            <div>{tab.label}</div>
            <div style={{ fontSize: 9, marginTop: 1, opacity: 0.7 }}>{tab.labelCn}</div>
          </button>
        ))}
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        maxWidth: 760,
        width: '100%',
        margin: '0 auto',
        padding: '0 24px 80px',
        overflowY: 'auto',
        minHeight: 0,
      }}>
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
        style={{
          display: 'flex',
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 200,
          backgroundColor: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        className="md:hidden"
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '10px 4px',
              background: 'none',
              border: 'none',
              borderTop: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
              gap: 3,
            }}
          >
            <span style={{ fontSize: 18 }}>
              {tab.id === 'match' ? '⚔️' : tab.id === 'rooms' ? '🏠' : tab.id === 'rank' ? '🏆' : '👤'}
            </span>
            <span style={{ fontSize: 9, letterSpacing: '0.1em' }}>{tab.labelCn}</span>
          </button>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="hidden md:flex" style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 32px',
        justifyContent: 'center',
        gap: 24,
      }}>
        {[
          { label: '在线匹配', active: isOnline },
          { label: '公开房间', active: isOnline },
          { label: '全球排行', active: true },
          { label: '个人档案', active: true },
        ].map(item => (
          <div
            key={item.label}
            style={{
              fontSize: 10,
              color: item.active ? 'var(--text-muted)' : 'var(--text-muted)',
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: item.active ? 0.7 : 0.35,
            }}
          >
            <span style={{ color: item.active ? 'var(--accent-primary)' : 'var(--border-color)' }}>◆</span>
            {item.label}
          </div>
        ))}
      </footer>
    </div>
  )
}
