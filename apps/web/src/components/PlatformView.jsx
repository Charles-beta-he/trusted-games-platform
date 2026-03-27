import { useState } from 'react'
import { useTheme } from '../contexts/ThemeContext.jsx'

const TABS = [
  { id: 'match', label: 'MATCH', labelCn: '匹配对战' },
  { id: 'rooms', label: 'ROOMS', labelCn: '房间列表' },
  { id: 'rank', label: 'RANK', labelCn: '排行榜' },
  { id: 'profile', label: 'PROFILE', labelCn: '个人中心' },
]

function ComingSoonBlock({ title, desc, icon }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: '80px 32px',
      textAlign: 'center',
      opacity: 0.5,
    }}>
      <div style={{ fontSize: 56 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 'bold', letterSpacing: '0.2em', color: 'var(--text-primary)' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.8 }}>
        {desc}
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 10,
        letterSpacing: '0.3em',
        color: 'var(--accent-primary)',
        border: '1px solid var(--accent-primary)',
        padding: '4px 12px',
        borderRadius: 2,
      }}>
        COMING SOON
      </div>
    </div>
  )
}

function MatchTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
      {/* Quick match */}
      <div style={{
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        padding: '32px 24px',
        textAlign: 'center',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚔️</div>
        <div style={{ fontSize: 15, fontWeight: 'bold', letterSpacing: '0.2em', color: 'var(--text-primary)', marginBottom: 8 }}>
          QUICK MATCH
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.7 }}>
          系统自动匹配段位相近的对手<br />平均等待时间 &lt; 30 秒
        </div>
        <button
          disabled
          style={{
            padding: '12px 40px',
            background: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-primary)',
            fontSize: 12,
            letterSpacing: '0.15em',
            cursor: 'not-allowed',
          }}
        >
          开始匹配 — COMING SOON
        </button>
      </div>

      {/* Ranked / casual toggle placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 16,
      }}>
        {[
          { icon: '🏆', title: 'RANKED', titleCn: '段位赛', desc: '胜负影响段位积分\n赛季结算奖励' },
          { icon: '🎮', title: 'CASUAL', titleCn: '休闲赛', desc: '不影响段位\n轻松对局' },
        ].map(m => (
          <div
            key={m.title}
            style={{
              border: '1px dashed var(--border-color)',
              borderRadius: 8,
              padding: '24px 16px',
              textAlign: 'center',
              opacity: 0.45,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>{m.icon}</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--text-primary)', marginBottom: 4 }}>
              {m.title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 8 }}>{m.titleCn}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'pre-line', lineHeight: 1.7 }}>{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function RoomsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '32px 0' }}>
      {/* Create room button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.15em', color: 'var(--text-primary)' }}>
            公开房间
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>0 个房间在线</div>
        </div>
        <button
          disabled
          style={{
            padding: '8px 16px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-primary)',
            fontSize: 11,
            letterSpacing: '0.1em',
            cursor: 'not-allowed',
          }}
        >
          + 创建房间
        </button>
      </div>

      {/* Empty state */}
      <div style={{
        border: '1px dashed var(--border-color)',
        borderRadius: 8,
        padding: '60px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.4 }}>🏠</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          暂无公开房间<br />
          <span style={{ fontSize: 10, letterSpacing: '0.1em' }}>ONLINE ROOMS — COMING SOON</span>
        </div>
      </div>

      {/* Room list skeleton rows */}
      {[1, 2, 3].map(i => (
        <div
          key={i}
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: 0.2,
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border-color)' }} />
            <div>
              <div style={{ width: 120, height: 10, background: 'var(--border-color)', borderRadius: 2, marginBottom: 6 }} />
              <div style={{ width: 80, height: 8, background: 'var(--border-color)', borderRadius: 2 }} />
            </div>
          </div>
          <div style={{ width: 60, height: 28, background: 'var(--border-color)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}

function RankTab() {
  const RANKS = [
    { title: '初段', titleEn: 'DAN 1', color: '#888', range: '0 – 999' },
    { title: '三段', titleEn: 'DAN 3', color: '#4ade80', range: '2000 – 2999' },
    { title: '五段', titleEn: 'DAN 5', color: '#facc15', range: '4000 – 4999' },
    { title: '七段', titleEn: 'DAN 7', color: '#f97316', range: '6000 – 6999' },
    { title: '九段', titleEn: 'DAN 9', color: '#e11d48', range: '8000+' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
      {/* Rank tiers */}
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-muted)', marginBottom: 16 }}>
          段位体系 · RANK SYSTEM
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
          {RANKS.map(r => (
            <div
              key={r.titleEn}
              style={{
                border: `1px solid ${r.color}44`,
                borderRadius: 6,
                padding: '16px 8px',
                textAlign: 'center',
                background: `color-mix(in srgb, ${r.color} 5%, var(--bg-surface))`,
              }}
            >
              <div style={{ fontSize: 22, fontWeight: 'bold', color: r.color, marginBottom: 6 }}>{r.title}</div>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>{r.titleEn}</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 4 }}>{r.range}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard placeholder */}
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-muted)', marginBottom: 16 }}>
          全球排行榜 · GLOBAL LEADERBOARD
        </div>
        <div style={{ border: '1px dashed var(--border-color)', borderRadius: 8 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '48px 1fr 80px 80px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: 10,
            letterSpacing: '0.2em',
            color: 'var(--text-muted)',
          }}>
            <span>#</span><span>玩家</span><span style={{ textAlign: 'right' }}>胜率</span><span style={{ textAlign: 'right' }}>积分</span>
          </div>
          {/* Skeleton rows */}
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '48px 1fr 80px 80px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-color)',
                alignItems: 'center',
                opacity: 0.25,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 'bold', color: i <= 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {i}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border-color)' }} />
                <div style={{ width: 80 + i * 10, height: 10, background: 'var(--border-color)', borderRadius: 2 }} />
              </div>
              <div style={{ width: 40, height: 10, background: 'var(--border-color)', borderRadius: 2, marginLeft: 'auto' }} />
              <div style={{ width: 50, height: 10, background: 'var(--border-color)', borderRadius: 2, marginLeft: 'auto' }} />
            </div>
          ))}
          <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.2em' }}>
            LEADERBOARD DATA — COMING SOON
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '32px 0' }}>
      {/* Avatar + basic info */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '24px',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        background: 'var(--bg-surface)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'var(--bg-primary)',
          border: '2px dashed var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28,
          flexShrink: 0,
        }}>
          👤
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 4 }}>
            游客用户
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>
            未登录 · 登录以保存战绩
          </div>
          <button
            disabled
            style={{
              padding: '6px 16px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-primary)',
              fontSize: 11,
              letterSpacing: '0.1em',
              cursor: 'not-allowed',
            }}
          >
            登录 / 注册 — COMING SOON
          </button>
        </div>
      </div>

      {/* Stats placeholder */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
      }}>
        {[
          { label: '总对局', value: '—' },
          { label: '胜率', value: '—' },
          { label: '当前段位', value: '—' },
        ].map(s => (
          <div
            key={s.label}
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 6,
              padding: '20px 12px',
              textAlign: 'center',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: 6 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.15em' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Match history placeholder */}
      <div>
        <div style={{ fontSize: 11, letterSpacing: '0.3em', color: 'var(--text-muted)', marginBottom: 12 }}>
          近期对局 · RECENT MATCHES
        </div>
        <div style={{
          border: '1px dashed var(--border-color)',
          borderRadius: 8,
          padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.8 }}>
            登录后查看历史对局<br />
            <span style={{ fontSize: 10, letterSpacing: '0.1em' }}>MATCH HISTORY — COMING SOON</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PlatformView({ onBack }) {
  const { theme, themes, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('match')

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--bg-primary)',
      fontFamily: 'var(--font-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
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
          <div>
            <div style={{ fontSize: 13, fontWeight: 'bold', letterSpacing: '0.25em', color: 'var(--accent-primary)' }}>
              ONLINE PLATFORM
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.2em', marginTop: 1 }}>
              在线对弈平台 · H5
            </div>
          </div>
        </div>

        {/* Online indicator + theme switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--border-color)',
            }} />
            OFFLINE
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
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
                  fontSize: 9,
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.1em',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── Tab nav ───────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '0 32px',
      }}>
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

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        maxWidth: 760,
        width: '100%',
        margin: '0 auto',
        padding: '0 24px',
      }}>
        {activeTab === 'match' && <MatchTab />}
        {activeTab === 'rooms' && <RoomsTab />}
        {activeTab === 'rank' && <RankTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '12px 32px',
        display: 'flex',
        justifyContent: 'center',
        gap: 24,
      }}>
        {['在线匹配', '公开房间', '全球排行', '个人档案'].map(item => (
          <div
            key={item}
            style={{
              fontSize: 10,
              color: 'var(--text-muted)',
              letterSpacing: '0.15em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              opacity: 0.5,
            }}
          >
            <span style={{ color: 'var(--border-color)' }}>◆</span>
            {item}
          </div>
        ))}
      </footer>
    </div>
  )
}
