import { useState } from 'react'

function Label({ children }) {
  return (
    <div className="font-mono text-[10px] text-ink-faint tracking-widest uppercase mb-1.5">
      {children}
    </div>
  )
}

function CodeBox({ text }) {
  return (
    <div className="bg-ink/[0.04] border border-paper-dark p-3 font-mono text-[9px] break-all text-ink leading-relaxed max-h-20 overflow-y-auto select-all">
      {text}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="w-full mt-1.5 px-3 py-2 border border-paper-dark font-mono text-[11px] text-ink-faint hover:border-ink hover:text-ink transition-colors"
    >
      {copied ? '✓ 已复制' : '复制'}
    </button>
  )
}

export default function P2PModal({ webrtc, onClose }) {
  const [answerInput, setAnswerInput] = useState('')
  const [offerInput, setOfferInput] = useState('')
  const { role, step, offerCode, answerCode, error, setRole, createRoom, acceptAnswer, joinRoom, disconnect, isConnected } = webrtc

  const handleBack = () => {
    disconnect()
  }

  // Guest: after joinRoom completes, answerCode holds the answer code
  const guestAnswerReady = role === 'guest' && answerCode && step !== 'idle'

  if (isConnected) {
    return (
      <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
        <div className="bg-paper border border-paper-dark shadow-xl p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="font-mono text-[10px] text-trust-l1 tracking-widest mb-2">P2P · CONNECTED</div>
            <div className="font-calligraphy text-3xl text-ink tracking-[4px]">连接成功</div>
            <p className="font-mono text-[11px] text-ink-faint mt-2">局域网对战已就绪</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { disconnect(); onClose() }}
              className="flex-1 px-4 py-2.5 border border-seal-red/60 text-seal-red font-mono text-[11px] tracking-wide hover:bg-seal-red hover:text-paper transition-colors"
            >
              断开连接
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-50 p-4">
      <div className="bg-paper border border-paper-dark shadow-xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="font-mono text-[10px] text-ink-faint tracking-widest">NETWORK · P2P · SERVERLESS</div>
            <div className="font-calligraphy text-2xl text-ink tracking-[2px] mt-0.5">局域网对战</div>
          </div>
          <button onClick={onClose} className="font-mono text-ink-faint hover:text-ink text-sm mt-1 tracking-wide">
            ✕ 关闭
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 border border-seal-red/40 bg-seal-red/5 font-mono text-[11px] text-seal-red">
            ⚠ {error}
          </div>
        )}

        {/* Role selection */}
        {!role && (
          <>
            <p className="font-mono text-[11px] text-ink-faint mb-4 leading-relaxed">
              无需服务器，通过手动交换 SDP 码建立 P2P 连接。
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setRole('host'); createRoom() }}
                className="px-4 py-5 border border-paper-dark hover:border-ink text-center transition-all group"
              >
                <div className="font-calligraphy text-2xl text-ink mb-1">创建房间</div>
                <div className="font-mono text-[10px] text-ink-faint tracking-wide group-hover:text-ink">HOST · 生成邀请码</div>
              </button>
              <button
                onClick={() => setRole('guest')}
                className="px-4 py-5 border border-paper-dark hover:border-ink text-center transition-all group"
              >
                <div className="font-calligraphy text-2xl text-ink mb-1">加入房间</div>
                <div className="font-mono text-[10px] text-ink-faint tracking-wide group-hover:text-ink">GUEST · 输入邀请码</div>
              </button>
            </div>
          </>
        )}

        {/* HOST FLOW */}
        {role === 'host' && (
          <div className="flex flex-col gap-4">
            <div className="font-mono text-[10px] text-trust-l1 tracking-widest">
              HOST · {step === 'creating' ? '生成中...' : step === 'waiting_for_answer' ? '等待应答' : step.toUpperCase()}
            </div>

            {step === 'creating' && (
              <div className="text-center py-6 font-mono text-[11px] text-ink-faint">
                <div className="flex justify-center gap-1 mb-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-ink animate-thinking" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                正在生成邀请码...
              </div>
            )}

            {step === 'waiting_for_answer' && offerCode && (
              <div className="flex flex-col gap-4">
                <div>
                  <Label>第 1 步：复制邀请码，发送给对方</Label>
                  <CodeBox text={offerCode} />
                  <CopyButton text={offerCode} />
                </div>
                <div>
                  <Label>第 2 步：粘贴对方的应答码</Label>
                  <textarea
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    className="w-full bg-ink/[0.04] border border-paper-dark p-3 font-mono text-[9px] text-ink resize-none outline-none focus:border-ink transition-colors"
                    rows={3}
                    placeholder="粘贴应答码..."
                  />
                  <button
                    onClick={() => acceptAnswer(answerInput)}
                    disabled={!answerInput.trim()}
                    className="mt-1.5 w-full px-3 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    确认连接 →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GUEST FLOW */}
        {role === 'guest' && (
          <div className="flex flex-col gap-4">
            <div className="font-mono text-[10px] text-trust-l3 tracking-widest">
              GUEST · {step === 'joining' && !guestAnswerReady ? '处理中...' : guestAnswerReady ? '等待主机确认' : 'READY'}
            </div>

            {!guestAnswerReady && (
              <div>
                <Label>粘贴主机的邀请码</Label>
                <textarea
                  value={offerInput}
                  onChange={(e) => setOfferInput(e.target.value)}
                  className="w-full bg-ink/[0.04] border border-paper-dark p-3 font-mono text-[9px] text-ink resize-none outline-none focus:border-ink transition-colors"
                  rows={3}
                  placeholder="粘贴邀请码..."
                />
                <button
                  onClick={() => joinRoom(offerInput)}
                  disabled={!offerInput.trim() || step === 'joining'}
                  className="mt-1.5 w-full px-3 py-2.5 bg-ink text-paper font-mono text-[11px] tracking-wide hover:bg-ink-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {step === 'joining' ? '处理中...' : '生成应答码 →'}
                </button>
              </div>
            )}

            {guestAnswerReady && (
              <div>
                <Label>复制应答码，发送给主机</Label>
                <CodeBox text={answerCode} />
                <CopyButton text={answerCode} />
                <div className="mt-3 flex items-center gap-2 font-mono text-[10px] text-ink-faint">
                  <div className="w-2 h-2 rounded-full bg-trust-l3 animate-net-pulse flex-shrink-0" />
                  等待主机确认连接...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Back button */}
        {role && (
          <button
            onClick={handleBack}
            className="mt-5 font-mono text-[10px] text-ink-faint hover:text-ink tracking-wide transition-colors"
          >
            ← 返回
          </button>
        )}
      </div>
    </div>
  )
}
