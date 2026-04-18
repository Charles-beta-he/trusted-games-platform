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

function SectionLabel({ children }) {
  return (
    <div className="text-[9px] tracking-[0.25em] text-theme-muted font-theme uppercase mb-3">
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
      clearStyleFromUrl()
      // Use setTimeout to avoid setState-in-effect warning
      setTimeout(() => {
        setPersonalProfile(fromUrl)
        setSelectedStyleId('personal')
        setShareMsg({ ok: true, text: `已导入分享的棋风：${fromUrl.name ?? fromUrl.id}` })
        setTimeout(() => setShareMsg(null), 4000)
      }, 0)
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
    <div className="min-h-[100svh] bg-theme-primary text-theme-primary font-theme">
      {/* Header */}
      <header className="border-b border-theme bg-theme-secondary px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-transparent border-none cursor-pointer text-theme-muted text-lg px-2 py-1 rounded leading-none"
          title="返回"
        >
          ←
        </button>
        <div>
          <div className="text-[13px] font-bold tracking-[0.2em] text-theme-accent">
            STYLE CENTER
          </div>
          <div className="text-[9px] text-theme-muted tracking-[0.2em]">
            棋风中心
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[720px] mx-auto px-5 pt-6 pb-10 flex flex-col gap-5">

        {/* Share import message */}
        {shareMsg && (
          <div
            className="text-[11px] px-3 py-2 rounded font-theme tracking-[0.05em]"
            style={{
              color: shareMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
              background: shareMsg.ok
                ? 'color-mix(in srgb, var(--accent-success) 10%, transparent)'
                : 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
              border: `1px solid ${shareMsg.ok ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
            }}
          >
            {shareMsg.text}
          </div>
        )}

        {/* Two-column layout on wider screens */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 items-start">

          {/* Left: selector */}
          <div className="border border-theme rounded-lg bg-theme-surface p-5">
            <SectionLabel>选择棋风</SectionLabel>
            <StyleSelector value={selectedStyleId} onChange={setSelectedStyleId} />
          </div>

          {/* Right: radar + actions */}
          <div className="flex flex-col gap-4">

            {/* Radar */}
            <div className="border border-theme rounded-lg bg-theme-surface p-5 text-center">
              <SectionLabel>棋风可视化</SectionLabel>
              <StyleRadar params={resolvedParams} />
              {currentProfile && (
                <div className="mt-3 text-[11px] text-theme-secondary font-theme tracking-[0.05em]">
                  {currentProfile.icon} {currentProfile.name}
                  {currentProfile.desc && (
                    <span className="text-theme-muted ml-1.5 text-[10px]">
                      — {currentProfile.desc}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Export / Share */}
            <div className="border border-theme rounded-lg bg-theme-surface p-5">
              <SectionLabel>导出 / 分享</SectionLabel>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 font-theme text-[11px] tracking-[0.12em] cursor-pointer border border-theme rounded bg-theme-surface text-theme-primary transition-all py-2 px-4"
                  title="下载为 .json 文件"
                >
                  ↓ 导出文件
                </button>
                <button
                  onClick={handleShare}
                  className="flex-1 font-theme text-[11px] tracking-[0.12em] cursor-pointer border border-theme rounded bg-theme-surface text-theme-primary transition-all py-2 px-4"
                  title="复制分享链接"
                >
                  ⎘ 复制链接
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Importer */}
        <div className="border border-theme rounded-lg bg-theme-surface p-5">
          <SectionLabel>从对局文件导入</SectionLabel>
          <StyleImporter onImported={handleImported} />
        </div>

        {/* Params detail */}
        <div className="border border-theme rounded-lg bg-theme-surface p-5">
          <SectionLabel>参数详情</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: 'attack',  label: '进攻力',   range: '0.6~1.8', color: 'var(--accent-danger, #f87171)' },
              { key: 'defense', label: '防守力',   range: '0.6~1.8', color: 'var(--accent-primary)' },
              { key: 'center',  label: '中腹偏好', range: '0~0.5',   color: 'var(--accent-success, #4ade80)' },
              { key: 'noise',   label: '走法多样性', range: '0~0.35', color: 'var(--text-secondary)' },
            ].map(({ key, label, range, color }) => (
              <div key={key} className="p-3 border border-theme rounded bg-theme-primary">
                <div className="text-[9px] tracking-[0.15em] text-theme-muted mb-1">
                  {label}
                </div>
                <div className="text-xl font-bold mb-0.5" style={{ color }}>
                  {resolvedParams[key]?.toFixed(2) ?? '—'}
                </div>
                <div className="text-[8px] text-theme-muted font-mono">
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
