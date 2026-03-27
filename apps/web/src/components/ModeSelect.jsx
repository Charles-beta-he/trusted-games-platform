import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext.jsx'

const MODES = [
  {
    id: 'ai',
    icon: '🤖',
    title: 'VS AI',
    titleCn: '人机对战',
    desc: '挑战 Minimax α-β 算法\n难度可调 · 随时悔棋',
    available: true,
    color: '#7c3aed',
  },
  {
    id: 'local',
    icon: '👥',
    title: 'LOCAL PVP',
    titleCn: '本地双人',
    desc: '同一设备轮流落子\n面对面对战',
    available: true,
    color: '#00d4ff',
  },
  {
    id: 'host',
    icon: '📡',
    title: 'CREATE ROOM',
    titleCn: '创建房间',
    desc: '生成邀请码 / 二维码\nP2P 加密 · 无服务器',
    available: true,
    color: '#00ff88',
  },
  {
    id: 'join',
    icon: '🔗',
    title: 'JOIN ROOM',
    titleCn: '加入房间',
    desc: '扫码或输入邀请码\n直连对手 · 端对端加密',
    available: true,
    color: '#f59e0b',
  },
]

export default function ModeSelect({ gameId, onSelectMode, onBack }) {
  const { theme, themes, setTheme } = useTheme()
  const [hovered, setHovered] = useState(null)

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 顶部导航 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 32px',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
      }}>
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

        <div style={{ color: 'var(--text-muted)', fontSize: 12, letterSpacing: '0.2em' }}>
          {gameId?.toUpperCase()} · SELECT MODE
        </div>

        {/* 主题切换 */}
        <div style={{ display: 'flex', gap: 6 }}>
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              style={{
                background: theme === t.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                border: `1px solid ${theme === t.id ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                color: theme === t.id ? '#000' : 'var(--text-muted)',
                padding: '4px 8px',
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
      </div>

      {/* 主体：模式选择 */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 32px',
        gap: 40,
      }}>
        {/* 标题 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 11,
            letterSpacing: '0.4em',
            color: 'var(--text-muted)',
            marginBottom: 12,
            textTransform: 'uppercase',
          }}>
            CHOOSE YOUR BATTLE
          </div>
          <div style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, var(--font-primary))',
            textShadow: '0 0 20px var(--accent-primary)',
          }}>
            游戏模式
          </div>
        </div>

        {/* 4 个模式卡片 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
          width: '100%',
          maxWidth: 700,
        }}>
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => mode.available && onSelectMode(mode.id)}
              onMouseEnter={() => setHovered(mode.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: hovered === mode.id
                  ? `linear-gradient(135deg, var(--bg-surface), ${mode.color}22)`
                  : 'var(--bg-surface)',
                border: `1px solid ${hovered === mode.id ? mode.color : 'var(--border-color)'}`,
                borderRadius: 8,
                padding: '28px 24px',
                cursor: mode.available ? 'pointer' : 'not-allowed',
                textAlign: 'left',
                transition: 'all 0.2s',
                boxShadow: hovered === mode.id ? `0 0 20px ${mode.color}33` : 'none',
                opacity: mode.available ? 1 : 0.5,
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 12 }}>{mode.icon}</div>
              <div style={{
                fontSize: 14,
                fontWeight: 'bold',
                letterSpacing: '0.15em',
                color: hovered === mode.id ? mode.color : 'var(--text-primary)',
                marginBottom: 4,
                fontFamily: 'var(--font-display, var(--font-primary))',
              }}>
                {mode.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
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
              {!mode.available && (
                <div style={{
                  marginTop: 8,
                  fontSize: 10,
                  color: mode.color,
                  letterSpacing: '0.1em',
                  border: `1px solid ${mode.color}`,
                  padding: '2px 6px',
                  borderRadius: 2,
                  display: 'inline-block',
                }}>
                  COMING SOON
                </div>
              )}
            </button>
          ))}
        </div>

        {/* 底部说明 */}
        <div style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          textAlign: 'center',
          letterSpacing: '0.15em',
        }}>
          NO SERVER · LOCAL FIRST · E2E ENCRYPTED · HASH CHAIN VERIFIED
        </div>
      </div>
    </div>
  )
}
