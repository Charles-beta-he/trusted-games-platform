import { useState } from 'react'
import { STYLE_PRESET_LIST, loadPersonalStyle } from '../../lib/ai-styles.js'
import { generatePersonalStyle } from '../../lib/analyzeStyle.js'

/**
 * 棋风选择器
 * 显示预设棋风 + 个人棋风，支持"生成我的棋风"
 */
export default function StyleSelector({ value, onChange }) {
  const [personalProfile, setPersonalProfile] = useState(() => loadPersonalStyle())
  const [generating, setGenerating] = useState(false)
  const [genMsg, setGenMsg] = useState(null)

  const handleGenerate = async () => {
    setGenerating(true)
    setGenMsg(null)
    const { profile, error } = await generatePersonalStyle()
    setGenerating(false)
    if (profile) {
      setPersonalProfile(profile)
      onChange('personal')
      setGenMsg({ ok: true, text: `已生成（分析 ${profile.meta.gamesAnalyzed} 局）` })
    } else {
      setGenMsg({ ok: false, text: error })
    }
    setTimeout(() => setGenMsg(null), 4000)
  }

  const allStyles = [
    ...STYLE_PRESET_LIST,
    ...(personalProfile ? [{
      id: 'personal',
      name: '我的棋风',
      nameEn: 'My Style',
      desc: personalProfile.desc,
      icon: '👤',
    }] : []),
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        fontSize: 10,
        letterSpacing: '0.2em',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-primary)',
        textTransform: 'uppercase',
      }}>
        AI 棋风
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {allStyles.map((s) => {
          const active = value === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              title={s.desc}
              style={{
                padding: '8px 10px',
                textAlign: 'left',
                background: active
                  ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface))'
                  : 'var(--bg-surface)',
                border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                borderRadius: 4,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>{s.icon}</span>
                <div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: active ? 'var(--accent-primary)' : 'var(--text-primary)',
                    fontFamily: 'var(--font-primary)',
                    letterSpacing: '0.05em',
                  }}>
                    {s.name}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-primary)',
                    marginTop: 1,
                    letterSpacing: '0.05em',
                  }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 生成个人棋风按钮 */}
      <button
        onClick={handleGenerate}
        disabled={generating}
        style={{
          padding: '8px 12px',
          background: 'transparent',
          border: '1px dashed var(--border-color)',
          borderRadius: 4,
          cursor: generating ? 'not-allowed' : 'pointer',
          color: generating ? 'var(--text-muted)' : 'var(--text-secondary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 11,
          letterSpacing: '0.1em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'all 0.15s',
        }}
      >
        {generating ? '分析中...' : personalProfile ? '重新生成我的棋风' : '从对局历史生成我的棋风'}
      </button>

      {genMsg && (
        <div style={{
          fontSize: 10,
          padding: '4px 8px',
          borderRadius: 3,
          fontFamily: 'var(--font-primary)',
          letterSpacing: '0.05em',
          color: genMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
          background: genMsg.ok
            ? 'color-mix(in srgb, var(--accent-success) 10%, transparent)'
            : 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
          border: `1px solid ${genMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
        }}>
          {genMsg.text}
        </div>
      )}
    </div>
  )
}
