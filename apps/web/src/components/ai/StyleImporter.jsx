import { useState, useRef, useCallback } from 'react'
import { parseGameFile } from '../../lib/gameFormats.js'
import { analyzeGames } from '../../lib/analyzeStyle.js'
import { savePersonalStyle } from '../../lib/ai-styles.js'
import { importStyleFromFile } from '../../lib/styleShare.js'

/**
 * 棋风数据导入组件
 *
 * 支持两种导入方式：
 *   1. .psq / .rif / .json 棋局文件 → 自动分析生成个人棋风
 *   2. .json 棋风文件（tg-style-v1）→ 直接导入棋风参数
 *
 * Props:
 *   onImported(profile) — 成功导入后回调
 */
export default function StyleImporter({ onImported }) {
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState(null)   // { ok, text } | null
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const processFile = useCallback(async (file) => {
    if (!file) return
    setLoading(true)
    setStatus(null)

    try {
      // ── Try style file first (tg-style-v1) ────────────────────────────────
      if (file.name.endsWith('.json')) {
        const styleProfile = await importStyleFromFile(file)
        if (styleProfile) {
          savePersonalStyle(styleProfile)
          setStatus({ ok: true, text: `已导入棋风：${styleProfile.name ?? styleProfile.id}` })
          onImported?.(styleProfile)
          setLoading(false)
          return
        }
      }

      // ── Treat as game record file ──────────────────────────────────────────
      const text = await file.text()
      const result = parseGameFile(file.name, text)
      if (result.error) {
        setStatus({ ok: false, text: `解析失败：${result.error}` })
        setLoading(false)
        return
      }

      const games = result.games
      if (!games?.length) {
        setStatus({ ok: false, text: '未找到有效对局数据' })
        setLoading(false)
        return
      }

      const profile = analyzeGames(games)
      if (!profile) {
        setStatus({ ok: false, text: `数据不足（共 ${games.length} 局，至少需要 3 局完整对局）` })
        setLoading(false)
        return
      }

      // Enrich meta with file origin
      profile.meta = { ...(profile.meta ?? {}), sourceFile: file.name }
      savePersonalStyle(profile)
      setStatus({ ok: true, text: `已从 ${games.length} 局对局中生成棋风` })
      onImported?.(profile)
    } catch (e) {
      setStatus({ ok: false, text: `读取文件失败：${e.message}` })
    }

    setLoading(false)
  }, [onImported])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] tracking-[0.2em] text-theme-muted font-theme uppercase">
        导入对局数据
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className="border border-dashed rounded-lg px-4 py-5 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragging ? 'var(--accent-primary)' : 'var(--border-color)',
          cursor: loading ? 'not-allowed' : 'pointer',
          background: dragging
            ? 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-surface))'
            : 'var(--bg-surface)',
        }}
      >
        <div className="text-xl mb-1.5">
          {loading ? '⏳' : '📂'}
        </div>
        <div className="text-[11px] text-theme-secondary font-theme tracking-wide">
          {loading ? '分析中...' : '拖入或点击选择文件'}
        </div>
        <div className="text-[9px] text-theme-muted font-theme mt-1 tracking-[0.08em]">
          支持 .psq · .rif · .json 格式
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".psq,.rif,.json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Format hints */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { ext: '.psq', desc: 'Gomocup 棋谱' },
          { ext: '.rif', desc: 'RIF 棋谱' },
          { ext: '.json', desc: '棋谱 / 棋风文件' },
        ].map(({ ext, desc }) => (
          <div key={ext} className="text-[9px] px-1.5 py-0.5 border border-theme rounded text-theme-muted font-mono tracking-wide">
            {ext} — {desc}
          </div>
        ))}
      </div>

      {/* Status message */}
      {status && (
        <div 
          className="text-[10px] px-2.5 py-1.5 rounded font-theme tracking-wide"
          style={{
            color: status.ok ? 'var(--accent-success)' : 'var(--accent-danger)',
            background: status.ok
              ? 'color-mix(in srgb, var(--accent-success) 10%, transparent)'
              : 'color-mix(in srgb, var(--accent-danger) 10%, transparent)',
            border: `1px solid ${status.ok ? 'var(--accent-success)' : 'var(--accent-danger)'}`,
          }}
        >
          {status.text}
        </div>
      )}
    </div>
  )
}
