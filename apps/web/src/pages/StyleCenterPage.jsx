import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StyleSelector from '../components/ai/StyleSelector.jsx'
import StyleRadar from '../components/ai/StyleRadar.jsx'
import StyleImporter from '../components/ai/StyleImporter.jsx'
import {
  exportStyleAsFile,
  encodeStyleToUrl,
  decodeStyleFromUrl,
  clearStyleFromUrl,
} from '../lib/styleShare.js'
import {
  STYLE_PRESETS,
  loadPersonalStyle,
  savePersonalStyle,
  resolveStyle,
} from '../lib/ai-styles.js'

// ── Shared style tokens ────────────────────────────────────────────────────────
const btn = (extra = {}) => ({
  fontFamily: 'var(--font-primary)',
  fontSize: 11,
  letterSpacing: '0.12em',
  cursor: 'pointer',
  border: '1px solid var(--border-color)',
  borderRadius: 4,
  padding: '8px 16px',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  transition: 'all 0.15s',
  ...extra,
})

const card = (extra = {}) => ({
  border: '1px solid var(--border-color)',
  borderRadius: 8,
  background: 'var(--bg-surface)',
  padding: '20px',
  ...extra,
})

function SectionLabel({ children }) {
  return (
    <div style={{
      fontSize: 9,
      letterSpacing: '0.25em',
      color: 'var(--text-muted)',
      fontFamily: 'var(--font-primary)',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

export default function StyleCenterPage() {
  const navigate = useNavigate()
  const [selectedStyleId, setSelectedStyleId] = useState('balanced')
  const [personalProfile, setPersonalProfile] = useState(() => loadPersonalStyle())
  const [shareMsg, setShareMsg] = useState(null)

  // On mount: check URL hash for shared style
  useEffect(() => {
    const fromUrl = decodeStyleFromUrl()
    if (fromUrl) {
      savePersonalStyle(fromUrl)
      setPersonalProfile(fromUrl)
      setSelectedStyleId('personal')
      clearStyleFromUrl()
      setShareMsg({ ok: true, text: `已导入分享的棋风：${fromUrl.name ?? fromUrl.id}` })
      setTimeout(() => setShareMsg(null), 4000)
    }
  }, [])

  const resolvedParams = resolveStyle(selectedStyleId) ?? STYLE_PRESETS.balanced.params
  const currentProfile = selectedStyleId === 'personal'
    ? personalProfile
    : STYLE_PRESETS[selectedStyleId]

  const handleExport = () => {
    if (!currentProfile) return
    const exportProfile = {
      type: 'tg-style-v1',
      id: currentProfile.id,
      name: currentProfile.name,
      params: resolvedParams,
      meta: currentProfile.meta ?? {},
    }
    exportStyleAsFile(exportProfile)
  }

  const handleShare = () => {
    const profile = {
      type: 'tg-style-v1',
      id: currentProfile?.id ?? selectedStyleId,
      name: currentProfile?.name ?? selectedStyleId,
      params: resolvedParams,
      meta: currentProfile?.meta ?? {},
    }
    const hash = encodeStyleToUrl(profile)
    const url = `${window.location.origin}${window.location.pathname}${hash}`
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg({ ok: true, text: '分享链接已复制到剪贴板' })
    }).catch(() => {
      setShareMsg({ ok: true, text: hash })
    })
    setTimeout(() => setShareMsg(null), 4000)
    // Restore URL without the hash after a moment
    setTimeout(() => clearStyleFromUrl(), 100)
  }

  const handleImported = (profile) => {
    setPersonalProfile(profile)
    setSelectedStyleId('personal')
  }

  return (
    <div style={{
      minHeight: '100svh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-primary)',
    }}>
      {/* Header */}
      <header style={{
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 18,
            padding: '4px 8px',
            borderRadius: 4,
            lineHeight: 1,
          }}
          title="返回"
        >
          ←
        </button>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 'bold',
            letterSpacing: '0.2em',
            color: 'var(--accent-primary)',
          }}>
            STYLE CENTER
          </div>
          <div style={{
            fontSize: 9,
            color: 'var(--text-muted)',
            letterSpacing: '0.2em',
          }}>
            棋风中心
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '24px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>

        {/* Share import message */}
        {shareMsg && (
          <div style={{
            fontSize: 11,
            padding: '8px 12px',
            borderRadius: 4,
            fontFamily: 'var(--font-primary)',
            letterSpacing: '0.05em',
            color: shareMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
            background: shareMsg.ok
              ? 'color-mix(in srgb, var(--accent-success) 10%, transparent)'
              : 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
            border: `1px solid ${shareMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          }}>
            {shareMsg.text}
          </div>
        )}

        {/* Two-column layout on wider screens */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}>

          {/* Left: selector */}
          <div style={card()}>
            <SectionLabel>选择棋风</SectionLabel>
            <StyleSelector value={selectedStyleId} onChange={setSelectedStyleId} />
          </div>

          {/* Right: radar + actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Radar */}
            <div style={card({ textAlign: 'center' })}>
              <SectionLabel>棋风可视化</SectionLabel>
              <StyleRadar params={resolvedParams} />
              {currentProfile && (
                <div style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.05em',
                }}>
                  {currentProfile.icon} {currentProfile.name}
                  {currentProfile.desc && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 10 }}>
                      — {currentProfile.desc}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Export / Share */}
            <div style={card()}>
              <SectionLabel>导出 / 分享</SectionLabel>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleExport}
                  style={btn({ flex: 1 })}
                  title="下载为 .json 文件"
                >
                  ↓ 导出文件
                </button>
                <button
                  onClick={handleShare}
                  style={btn({ flex: 1 })}
                  title="复制分享链接"
                >
                  ⎘ 复制链接
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Importer */}
        <div style={card()}>
          <SectionLabel>从对局文件导入</SectionLabel>
          <StyleImporter onImported={handleImported} />
        </div>

        {/* Params detail */}
        <div style={card()}>
          <SectionLabel>参数详情</SectionLabel>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {[
              { key: 'attack',  label: '进攻力',   range: '0.6~1.8', color: 'var(--accent-danger, #f87171)' },
              { key: 'defense', label: '防守力',   range: '0.6~1.8', color: 'var(--accent-primary)' },
              { key: 'center',  label: '中腹偏好', range: '0~0.5',   color: 'var(--accent-success, #4ade80)' },
              { key: 'noise',   label: '走法多样性', range: '0~0.35', color: 'var(--text-secondary)' },
            ].map(({ key, label, range, color }) => (
              <div key={key} style={{
                padding: '12px',
                border: '1px solid var(--border-color)',
                borderRadius: 4,
                background: 'var(--bg-primary)',
              }}>
                <div style={{ fontSize: 9, letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {label}
                </div>
                <div style={{ fontSize: 20, fontWeight: 'bold', color, marginBottom: 2 }}>
                  {resolvedParams[key]?.toFixed(2) ?? '—'}
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  range {range}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  )
}
