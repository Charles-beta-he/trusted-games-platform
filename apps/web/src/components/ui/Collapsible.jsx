import { useState } from 'react'

export default function Collapsible({ title, icon = '⚙', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-transparent border-none border-t border-border-c py-2 cursor-pointer text-text-muted font-mono text-xs tracking-[1px]"
      >
        <span>{icon} {title}</span>
        <span className="transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          ▾
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}
