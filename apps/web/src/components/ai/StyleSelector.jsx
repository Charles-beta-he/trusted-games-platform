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
    <div className="flex flex-col gap-2">
      <div className="text-[10px] tracking-[0.2em] text-theme-muted font-theme uppercase">
        AI 棋风
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {allStyles.map((s) => {
          const active = value === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChange(s.id)}
              title={s.desc}
              className="p-2.5 text-left rounded cursor-pointer transition-all"
              style={{
                background: active
                  ? 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface))'
                  : 'var(--bg-surface)',
                border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-color)'}`,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{s.icon}</span>
                <div>
                  <div className="text-[11px] font-bold font-theme tracking-wide" style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                    {s.name}
                  </div>
                  <div className="text-[9px] text-theme-muted font-theme mt-0.5 tracking-wide">
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
        className="p-2.5 bg-transparent border border-dashed border-theme rounded font-theme text-[11px] tracking-wide flex items-center justify-center gap-1.5 transition-all"
        style={{
          cursor: generating ? 'not-allowed' : 'pointer',
          color: generating ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}
      >
        {generating ? '分析中...' : personalProfile ? '重新生成我的棋风' : '从对局历史生成我的棋风'}
      </button>

      {genMsg && (
        <div 
          className="text-[10px] px-2 py-1 rounded font-theme tracking-wide"
          style={{
            color: genMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
            background: genMsg.ok
              ? 'color-mix(in srgb, var(--accent-success) 10%, transparent)'
              : 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
            border: `1px solid ${genMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          }}
        >
          {genMsg.text}
        </div>
      )}
    </div>
  )
}
