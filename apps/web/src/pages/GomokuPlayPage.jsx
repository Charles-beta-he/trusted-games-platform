import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import {
  extractOfferFromUrl, clearShareHash,
  extractRoomCodeFromUrl, clearRoomHash,
} from '../lib/shareUrl.js'
import { useGameEngine } from '../hooks/useGameEngine.js'
import { useAI } from '../hooks/useAI.js'
import { useWebRTC } from '../hooks/useWebRTC.js'
import { useSignaling } from '../hooks/useSignaling.js'
import { useTimer } from '../hooks/useTimer.js'
import { useIndexedDB } from '../hooks/useIndexedDB.js'
import { useReplay } from '../hooks/useReplay.js'
import Header from '../components/Header.jsx'
import Footer from '../components/Footer.jsx'
import BoardArea from '../components/board/BoardArea.jsx'
import ReplayBar from '../components/board/ReplayBar.jsx'
import PlayerCard from '../components/player/PlayerCard.jsx'
import TrustBadge from '../components/trust/TrustBadge.jsx'
import MoveHistory from '../components/trust/MoveHistory.jsx'
import ControlButtons from '../components/controls/ControlButtons.jsx'
import ModeSelect from '../components/ModeSelect.jsx'
import { usePlatformGame } from '../contexts/PlatformConnContext.jsx'
import { gomokuGame } from '@tg/core'

const GOMOKU_RULE_HINTS = {
  out_of_bounds: '落子超出棋盘',
  occupied: '此交叉点已有棋子',
  overline: '此规则下不允许超过五连',
  renju_overline: '连珠：黑方长连禁手',
  renju_double_three: '连珠：黑方双活三禁手',
  renju_double_four: '连珠：黑方双四禁手',
}

export default function GomokuPlayPage() {
  const navigate = useNavigate()
  const { gameId: selectedGame = 'gomoku' } = useParams()
  const location = useLocation()

  const {
    platform,
    matchConn,
    matchMode: platformMatchMode,
    registerP2PHandlers,
    clearPlatformMatch,
  } = usePlatformGame()

  const platformRoomModeRef = useRef(location.state?.platformRoomMode ?? null)
  const fromPlatformP2PRef  = useRef(Boolean(location.state?.fromPlatformP2P))
  /** 天梯上报用：Context 优先，其次手动进房时带的 mode */
  const ladderMode = platformMatchMode ?? platformRoomModeRef.current

  // ─── View state ────────────────────────────────────────────────────────────
  // 'mode' = ModeSelect, 'game' = active board
  const [currentView, setCurrentView] = useState('mode')

  // ─── Game config ───────────────────────────────────────────────────────────
  const [aiMode, setAiMode] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [styleId, setStyleId] = useState('balanced')
  const [showDisconnectBanner, setShowDisconnectBanner] = useState(false)
  const [showVictoryOverlay, setShowVictoryOverlay] = useState(false)
  /** P2P：房主下一局是否执黑；每开新局由房主切换 */
  const [hostIsBlack, setHostIsBlack] = useState(true)
  /** null | 'sent' | 'incoming' | 'rejected' */
  const [undoBanner, setUndoBanner] = useState(null)
  const undoSentRef = useRef(false)
  const roomInitSentRef = useRef(false)
  /** 客人收到 ROOM_INIT（gameId/genesis 对齐）后才允许落子，避免未同步就本地行棋导致乱终局 */
  const [p2pRoomSynced, setP2pRoomSynced] = useState(false)
  /** 五子棋（连珠等）本机禁手提示 */
  const [gomokuRuleHint, setGomokuRuleHint] = useState(null)

  // ─── Auto-join from router state or URL hash ───────────────────────────────
  const [autoJoinOffer, setAutoJoinOffer] = useState(location.state?.autoJoinOffer ?? null)
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState(location.state?.autoJoinRoomCode ?? null)

  useEffect(() => {
    const offerCode = extractOfferFromUrl()
    if (offerCode) {
      clearShareHash()
      setAutoJoinOffer(offerCode)
      return
    }
    const roomCode = extractRoomCodeFromUrl()
    if (roomCode?.length === 6) {
      clearRoomHash()
      setAutoJoinRoomCode(roomCode)
    }
  }, [])

  // 平台匹配 / 邀请码 / 平台加密连接建立中会直接进入棋盘
  useEffect(() => {
    if (matchConn || autoJoinOffer || autoJoinRoomCode || fromPlatformP2PRef.current) {
      setCurrentView('game')
    }
  }, [matchConn, autoJoinOffer, autoJoinRoomCode])

  useEffect(() => {
    return () => {
      if (fromPlatformP2PRef.current) clearPlatformMatch()
    }
  }, [clearPlatformMatch])

  // ─── Game engine ───────────────────────────────────────────────────────────
  const game = useGameEngine()
  /** 服务体现着法链 gameId（悔棋后 undoPop 与见证同步） */
  const gameIdForWitnessRef = useRef(game.gameId)
  useEffect(() => {
    gameIdForWitnessRef.current = game.gameId
  }, [game.gameId])

  useEffect(() => {
    setGomokuRuleHint(null)
  }, [game.gameId])

  const { timers, startTimer, stopTimer, resetTimers } = useTimer(game.currentPlayer, game.gameOver)
  useIndexedDB(game.moveHistory, game.board, game.gameId, game.gameOver, game.currentPlayer)

  // ─── Replay ────────────────────────────────────────────────────────────────
  const replay = useReplay(game.moveHistory)
  const displayBoard    = replay.isReplaying ? replay.replayBoard    : game.board
  const displayLastMove = replay.isReplaying ? replay.lastReplayMove : game.lastMove
  const displayWinningLine = replay.isReplaying
    ? (replay.replayIndex === replay.totalMoves ? game.winningLine : null)
    : game.winningLine

  useEffect(() => {
    if (game.gameOver) setShowVictoryOverlay(true)
  }, [game.gameOver])

  // ─── Stable refs ───────────────────────────────────────────────────────────
  const placeStoneRef    = useRef(game.placeStone);    placeStoneRef.current    = game.placeStone
  const resignGameRef    = useRef(game.resignGame);    resignGameRef.current    = game.resignGame
  const initWithRoomRef  = useRef(game.initWithRoom);  initWithRoomRef.current  = game.initWithRoom
  const handleNewGameRef = useRef(null)
  const resetTimersRef   = useRef(resetTimers);        resetTimersRef.current   = resetTimers
  const startTimerRef    = useRef(startTimer);         startTimerRef.current    = startTimer
  const undoMoveRef      = useRef(game.undoMove)
  useEffect(() => { undoMoveRef.current = game.undoMove }, [game.undoMove])

  /** 必须在 p2pCallbacks 之前声明，供 onUndoAccept 读取当前连接 */
  const connRef = useRef(null)

  const p2pCallbacks = useMemo(() => ({
    onMove: (r, c, hash, player) => {
      startTimerRef.current()
      placeStoneRef.current(r, c, hash, player)
    },
    onResign: () => resignGameRef.current(),
    onNewGame: async (payload) => {
      const id = typeof payload === 'string' ? payload : payload?.gameId
      if (!id) return
      await initWithRoomRef.current(id)
      if (typeof payload === 'object' && payload != null && 'hostIsBlack' in payload) {
        setHostIsBlack(payload.hostIsBlack !== false)
      }
      setP2pRoomSynced(true)
      resetTimersRef.current()
    },
    onRoomInit: async (payload) => {
      const id = typeof payload === 'string' ? payload : payload?.gameId
      if (!id) return
      await initWithRoomRef.current(id)
      if (typeof payload === 'object' && payload != null && 'hostIsBlack' in payload) {
        setHostIsBlack(payload.hostIsBlack !== false)
      }
      setP2pRoomSynced(true)
    },
    onUndoRequest: () => setUndoBanner('incoming'),
    onUndoAccept: () => {
      undoMoveRef.current(false)
      setUndoBanner(null)
      undoSentRef.current = false
      const c = connRef.current
      if (c?.role === 'host') c.sendWitnessUndoPop?.(gameIdForWitnessRef.current)
    },
    onUndoReject: () => {
      setUndoBanner('rejected')
      undoSentRef.current = false
    },
  }), [setP2pRoomSynced])

  // ─── WebRTC + Signaling ────────────────────────────────────────────────────
  const webrtc = useWebRTC(p2pCallbacks)
  const sig    = useSignaling(p2pCallbacks)

  // Active connection priority: matchConn (platform) > sig > webrtc
  const connIsConnected = (matchConn?.isConnected) || webrtc.isConnected || sig.isConnected
  const conn = matchConn?.isConnected ? matchConn : sig.isConnected ? sig : webrtc
  connRef.current = conn

  useLayoutEffect(() => {
    registerP2PHandlers(p2pCallbacks)
    return () => registerP2PHandlers({})
  }, [registerP2PHandlers, p2pCallbacks])

  useEffect(() => {
    if (!connIsConnected) {
      setP2pRoomSynced(false)
      return
    }
    if (conn.role === 'host') setP2pRoomSynced(true)
  }, [connIsConnected, conn.role])

  /** P2P 已通但界面仍在选房时自动进棋盘（修复主机仍停在二维码页、客人已连上的情况） */
  useEffect(() => {
    if (currentView !== 'mode') return
    const wired =
      (matchConn?.isConnected && matchConn.role) ||
      (sig?.isConnected && sig.role) ||
      (webrtc?.isConnected && webrtc.role)
    if (!wired) return
    setAiMode(false)
    setCurrentView('game')
  }, [
    currentView,
    matchConn?.isConnected,
    matchConn?.role,
    sig?.isConnected,
    sig?.role,
    webrtc?.isConnected,
    webrtc?.role,
  ])

  const prevConnected = useRef(false)
  useEffect(() => {
    if (connIsConnected && connRef.current?.role === 'host' && !roomInitSentRef.current) {
      roomInitSentRef.current = true
      const c0 = connRef.current
      c0.sendRoomInit(game.gameId, { hostIsBlack })
      c0.sendWitnessRoomInit?.(game.gameId, hostIsBlack)
    }
    if (!connIsConnected) {
      roomInitSentRef.current = false
      setUndoBanner(null)
      undoSentRef.current = false
    }
    if (prevConnected.current && !connIsConnected && game.moveHistory.length > 0) {
      setShowDisconnectBanner(true)
      setTimeout(() => setShowDisconnectBanner(false), 5000)
    }
    prevConnected.current = connIsConnected
  }, [connIsConnected, game.gameId, hostIsBlack]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (undoBanner !== 'rejected') return
    const t = setTimeout(() => setUndoBanner(null), 4000)
    return () => clearTimeout(t)
  }, [undoBanner])

  const effectiveAiMode = aiMode && !connIsConnected
  const undoLockedOnline = connIsConnected && (undoBanner === 'sent' || undoBanner === 'incoming')
  const localPlayer = connIsConnected
    ? (conn.role === 'host' ? (hostIsBlack ? 1 : 2) : (hostIsBlack ? 2 : 1))
    : null

  const guestAwaitingRoomInit =
    connIsConnected && conn.role === 'guest' && !p2pRoomSynced

  const rankedEloReportedRef = useRef(null)
  const rankedLoginNudgeRef = useRef(null)
  const reportRankedResult = platform.reportResult
  /** 见证/天梯相关非阻断提示（替代仅 console / alert） */
  const [p2pComplianceBanner, setP2pComplianceBanner] = useState(null)

  useEffect(() => {
    const onReject = (e) => {
      const m = e.detail?.message ?? '天梯成绩未计入：见证校验失败'
      console.warn('[ranked]', m)
      setP2pComplianceBanner({ kind: 'ranked_witness', message: m })
    }
    const onServerWitness = (e) => {
      const m = e.detail?.message ?? '服务端见证未通过'
      console.warn('[witness]', m)
      setP2pComplianceBanner({ kind: 'witness_sync', message: m })
    }
    const onRankedOk = (e) => {
      const d = e.detail ?? {}
      const delta = d.eloChange
      let message = '天梯成绩已计入。'
      if (d.elo != null && delta != null) {
        message = `天梯已结算 · Elo ${d.elo}（${delta >= 0 ? '+' : ''}${delta}）`
      } else if (d.elo != null) {
        message = `天梯已结算 · Elo ${d.elo}`
      }
      setP2pComplianceBanner({ kind: 'ranked_ok', message })
    }
    window.addEventListener('platform:witness_rejected', onReject)
    window.addEventListener('platform:witness_server_error', onServerWitness)
    window.addEventListener('platform:ranked_recorded', onRankedOk)
    return () => {
      window.removeEventListener('platform:witness_rejected', onReject)
      window.removeEventListener('platform:witness_server_error', onServerWitness)
      window.removeEventListener('platform:ranked_recorded', onRankedOk)
    }
  }, [])

  /** 天梯房但从未登录：对局结束提示去大厅登录（无法上报） */
  useEffect(() => {
    if (!game.gameOver || ladderMode !== 'ranked') return
    if (!connIsConnected) return
    if (platform.user?.userId) return
    if (rankedLoginNudgeRef.current === game.gameId) return
    rankedLoginNudgeRef.current = game.gameId
    setP2pComplianceBanner({
      kind: 'ranked_login',
      message: '本局为天梯对局，但未登录账号，段位分无法结算。请返回大厅注册/登录后再匹配天梯。',
    })
  }, [
    game.gameOver,
    game.gameId,
    ladderMode,
    connIsConnected,
    platform.user?.userId,
  ])

  useEffect(() => {
    if (!game.gameOver || ladderMode !== 'ranked') return
    if (!platform.user?.userId || localPlayer == null) return
    if (rankedEloReportedRef.current === game.gameId) return
    rankedEloReportedRef.current = game.gameId
    let outcome
    if (game.isDraw) outcome = 'draw'
    else if (game.resignedPlayer != null) {
      outcome = game.resignedPlayer === localPlayer ? 'lose' : 'win'
    } else {
      const w = game.moveHistory.length > 0 ? game.moveHistory[game.moveHistory.length - 1].player : null
      outcome = w === localPlayer ? 'win' : 'lose'
    }
    const chainTip =
      game.moveHistory.length > 0
        ? game.moveHistory[game.moveHistory.length - 1].hash
        : game.genesisHash
    reportRankedResult(outcome, { gameId: game.gameId, chainHash: chainTip })
  }, [
    game.gameOver,
    game.gameId,
    game.isDraw,
    game.resignedPlayer,
    game.moveHistory,
    ladderMode,
    localPlayer,
    platform.user?.userId,
    reportRankedResult,
  ])

  // 大厅导入的棋谱（router state）
  useEffect(() => {
    const rec = location.state?.gomokuImport
    if (!rec) return
    let cancelled = false
    const rest = { ...location.state }
    delete rest.gomokuImport
    ;(async () => {
      const ok = await game.loadFromExport(rec)
      navigate(location.pathname, { replace: true, state: rest })
      if (cancelled) return
      if (!ok) {
        alert('棋谱加载失败')
        return
      }
      setAiMode(false)
      setCurrentView('game')
      setShowVictoryOverlay(Boolean(rec.result && rec.result !== 'in_progress'))
      replay.enterReplay()
    })()
    return () => { cancelled = true }
  }, [location.state?.gomokuImport, game.loadFromExport, navigate, location.pathname, replay.enterReplay]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── AI ────────────────────────────────────────────────────────────────────
  const { isThinking } = useAI({
    board: game.board,
    currentPlayer: game.currentPlayer,
    aiMode: effectiveAiMode,
    difficulty,
    styleId,
    gameOver: game.gameOver,
    onAIMove: useCallback((r, c) => placeStoneRef.current(r, c), []),
  })

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handlePlaceStone = useCallback(async (r, c) => {
    if (game.moveHistory.length === 0) startTimer()
    const result = await game.placeStone(r, c)
    if (result?.illegal) {
      setGomokuRuleHint(GOMOKU_RULE_HINTS[result.reason] ?? `禁手（${result.reason}）`)
    } else {
      setGomokuRuleHint(null)
    }
    const c_ = connRef.current
    if (result && (result.ok || result.won || result.draw) && c_.isConnected) {
      c_.sendMove(r, c, result.hash, result.player)
      c_.sendMoveWitness?.({
        gameId: game.gameId,
        n: result.num,
        r: result.r,
        c: result.c,
        player: result.player,
        coord: result.coord,
        hash: result.hash,
      })
    }
    return result
  }, [game.moveHistory.length, game.placeStone, startTimer])

  const handleNewGame = useCallback(() => {
    setShowVictoryOverlay(false)
    resetTimers()
    const connected = connRef.current?.isConnected
    const role = connRef.current?.role
    let nextHb = hostIsBlack
    if (connected && role === 'host') {
      nextHb = !hostIsBlack
      setHostIsBlack(nextHb)
    }
    const newId = game.newGame()
    if (connected) {
      const c0 = connRef.current
      c0.sendNewGame(newId, { hostIsBlack: nextHb })
      if (role === 'host') c0.sendWitnessRoomInit?.(newId, nextHb)
    }
  }, [game.newGame, resetTimers, hostIsBlack])

  handleNewGameRef.current = handleNewGame

  const handleUndo = useCallback(() => {
    if (game.gameOver) return
    const c_ = connRef.current
    if (!c_?.isConnected) {
      game.undoMove(effectiveAiMode)
      return
    }
    if (undoSentRef.current || undoBanner === 'incoming') return
    undoSentRef.current = true
    setUndoBanner('sent')
    c_.sendUndoRequest?.()
  }, [game, effectiveAiMode, undoBanner])

  const handlePeerUndoAccept = useCallback(() => {
    undoMoveRef.current(false)
    connRef.current?.sendUndoResponse?.(true)
    setUndoBanner(null)
  }, [])

  const handlePeerUndoReject = useCallback(() => {
    connRef.current?.sendUndoResponse?.(false)
    setUndoBanner(null)
  }, [])

  const handleResign = useCallback(() => {
    const resigned = game.currentPlayer
    game.resignGame()
    stopTimer()
    const c_ = connRef.current
    if (c_.isConnected) {
      c_.sendWitnessResign?.(game.gameId, resigned)
      c_.sendResign()
    }
  }, [game.resignGame, game.currentPlayer, game.gameId, stopTimer])

  const handleToggleAI = useCallback(() => {
    setAiMode((v) => !v)
    game.newGame()
    resetTimers()
  }, [game.newGame, resetTimers])

  // ─── Mode select view ───────────────────────────────────────────────────────
  if (currentView === 'mode') {
    return (
      <ModeSelect
        gameId={selectedGame}
        webrtc={webrtc}
        sig={sig}
        onSelectMode={(mode, opts) => {
          if (mode === 'ai') {
            setAiMode(true)
            if (opts?.difficulty) setDifficulty(opts.difficulty)
            if (opts?.styleId)    setStyleId(opts.styleId)
          } else {
            setAiMode(false)
          }
          setCurrentView('game')
        }}
        onBack={() => navigate('/')}
        autoJoinOffer={autoJoinOffer}
        autoJoinRoomCode={autoJoinRoomCode}
      />
    )
  }

  // ─── Game view ─────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col"
      style={{ minHeight: '100svh', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
    >
      <Header
        moveCount={game.moveHistory.length}
        gameId={game.gameId}
        onBackToLobby={() => navigate('/')}
      />

      {p2pComplianceBanner && (
        <div
          className="mx-3 mt-2 md:mt-3 px-3 py-2.5 rounded-md flex gap-2 items-start"
          style={{
            background: p2pComplianceBanner.kind === 'ranked_ok'
              ? 'color-mix(in srgb, var(--accent-success, #2d6a4f) 14%, var(--bg-surface))'
              : 'color-mix(in srgb, var(--accent-danger, #b45309) 12%, var(--bg-surface))',
            border: p2pComplianceBanner.kind === 'ranked_ok'
              ? '1px solid color-mix(in srgb, var(--accent-success, #2d6a4f) 40%, transparent)'
              : '1px solid color-mix(in srgb, var(--accent-danger, #b45309) 35%, transparent)',
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <span aria-hidden="true" style={{ flexShrink: 0 }}>
            {p2pComplianceBanner.kind === 'ranked_ok' ? '✓' : '⚠️'}
          </span>
          <div className="flex-1 min-w-0">{p2pComplianceBanner.message}</div>
          <button
            type="button"
            onClick={() => setP2pComplianceBanner(null)}
            className="shrink-0 text-xs opacity-80 hover:opacity-100"
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              padding: '2px 8px',
              background: 'var(--bg-primary)',
            }}
          >
            关闭
          </button>
        </div>
      )}

      {/* ── Mobile player cards ─────────────────────────────────────── */}
      <div
        className="md:hidden flex gap-2 px-3 py-2 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingLeft: 'max(12px, env(safe-area-inset-left))',
          paddingRight: 'max(12px, env(safe-area-inset-right))',
        }}
      >
        <div className="flex-1">
          <PlayerCard
            player={1} name="黑方"
            type={
              effectiveAiMode
                ? 'LOCAL'
                : connIsConnected
                  ? (localPlayer === 1 ? '本机 · 执黑' : '对手 · P2P')
                  : 'LOCAL'
            }
            timer={timers.black}
            isActive={game.currentPlayer === 1 && !game.gameOver}
          />
        </div>
        <div className="flex-1">
          <PlayerCard
            player={2}
            name={effectiveAiMode ? 'AI' : '白方'}
            type={
              effectiveAiMode
                ? `AI · ${difficulty.toUpperCase()}`
                : connIsConnected
                  ? (localPlayer === 2 ? '本机 · 执白' : '对手 · P2P')
                  : 'LOCAL'
            }
            timer={timers.white}
            isActive={game.currentPlayer === 2 && !game.gameOver}
          />
        </div>
      </div>

      {selectedGame === 'gomoku' && !connIsConnected && (
        <div
          className="md:hidden flex items-center gap-2 px-3 py-2 flex-shrink-0 border-b"
          style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}
        >
          <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>规则</span>
          <select
            value={game.rulePreset}
            onChange={(e) => {
              game.setRulePreset(e.target.value)
              setGomokuRuleHint(null)
            }}
            disabled={game.moveHistory.length > 0 || replay.isReplaying}
            className="flex-1 min-w-0 rounded px-2 py-1.5 text-xs"
            style={{
              border: '1px solid var(--border-color)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
            }}
          >
            {Object.values(gomokuGame.RULES).map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-1" style={{ minHeight: 0 }}>

        {/* ── Left Sidebar (desktop) ──────────────────────────────── */}
        <aside className="hidden md:flex md:flex-col w-56 flex-shrink-0 overflow-y-auto" style={{ borderRight: '1px solid var(--border-color)' }}>
          <div className="p-5 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <PlayerCard
                player={1} name="黑方"
                type={
                  effectiveAiMode
                    ? 'PLAYER · LOCAL'
                    : connIsConnected
                      ? (localPlayer === 1 ? '本机 · 执黑' : '对手 · P2P')
                      : 'PLAYER · LOCAL'
                }
                timer={timers.black}
                isActive={game.currentPlayer === 1 && !game.gameOver}
              />
              <PlayerCard
                player={2}
                name={effectiveAiMode ? 'AI' : '白方'}
                type={
                  effectiveAiMode
                    ? `AI · ${difficulty.toUpperCase()}`
                    : connIsConnected
                      ? (localPlayer === 2 ? '本机 · 执白' : '对手 · P2P')
                      : 'PLAYER · LOCAL'
                }
                timer={timers.white}
                isActive={game.currentPlayer === 2 && !game.gameOver}
              />
            </div>

            <ControlButtons
              onNewGame={handleNewGame}
              onUndo={handleUndo}
              onToggleAI={handleToggleAI}
              onExport={game.exportGame}
              onResign={handleResign}
              aiMode={effectiveAiMode}
              gameOver={game.gameOver}
              canUndo={game.moveHistory.length > 0 && !undoLockedOnline}
              canReplay={game.gameOver && game.moveHistory.length > 0}
              onReplay={() => { setShowVictoryOverlay(false); replay.enterReplay() }}
            />

            {selectedGame === 'gomoku' && !connIsConnected && (
              <label className="flex flex-col gap-1.5">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  五子棋规则
                </span>
                <select
                  value={game.rulePreset}
                  onChange={(e) => {
                    game.setRulePreset(e.target.value)
                    setGomokuRuleHint(null)
                  }}
                  disabled={game.moveHistory.length > 0 || replay.isReplaying}
                  className="rounded px-2 py-1.5 text-xs"
                  style={{
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {Object.values(gomokuGame.RULES).map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {game.moveHistory.length > 0 && (
                  <span className="text-[9px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                    新局开始后可切换规则
                  </span>
                )}
              </label>
            )}

            {connIsConnected && (
              <div style={{
                padding: '8px 10px',
                border: `1px solid ${conn.isEncrypted ? 'var(--accent-success, #2d6a4f)' : 'var(--border-color)'}`,
                borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 6,
                background: conn.isEncrypted
                  ? 'color-mix(in srgb, var(--accent-success, #2d6a4f) 8%, var(--bg-surface))'
                  : 'var(--bg-surface)',
              }}>
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: conn.isEncrypted ? 'var(--accent-success, #2d6a4f)' : 'var(--accent-primary)',
                  flexShrink: 0,
                }} />
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
                  {conn.isEncrypted ? '🔐 E2E ENCRYPTED' : 'P2P CONNECTED'}
                  <div style={{ marginTop: 1, opacity: 0.7 }}>
                    {sig.isConnected ? 'ROOM CODE' : 'DIRECT · SDP'}
                    {webrtc.connType === 'lan'     && ' · 🏠 LAN'}
                    {webrtc.connType === 'internet' && ' · 🌐 INET'}
                    {webrtc.connType === 'relay'   && ' · ☁ RELAY'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* ── Board ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-auto flex flex-col">
          {gomokuRuleHint && selectedGame === 'gomoku' && !replay.isReplaying && (
            <div
              role="status"
              className="mx-2 mt-2 px-3 py-2 rounded text-xs shrink-0"
              style={{
                background: 'color-mix(in srgb, var(--accent-danger, #c1121f) 12%, var(--bg-surface))',
                border: '1px solid color-mix(in srgb, var(--accent-danger, #c1121f) 35%, var(--border-color))',
                color: 'var(--text-primary)',
              }}
            >
              {gomokuRuleHint}
            </div>
          )}
          <BoardArea
            board={displayBoard}
            currentPlayer={game.currentPlayer}
            moveHistory={game.moveHistory}
            gameOver={game.gameOver}
            winningLine={displayWinningLine}
            lastMove={displayLastMove}
            hoverCell={replay.isReplaying ? null : game.hoverCell}
            setHoverCell={replay.isReplaying ? () => {} : game.setHoverCell}
            isThinking={isThinking}
            isDraw={game.isDraw}
            resignedPlayer={game.resignedPlayer}
            placeStone={replay.isReplaying ? () => {} : handlePlaceStone}
            newGame={handleNewGame}
            aiMode={effectiveAiMode}
            localPlayer={localPlayer}
            showVictoryOverlay={showVictoryOverlay && !replay.isReplaying}
            replayInfo={replay.isReplaying ? { index: replay.replayIndex, total: replay.totalMoves } : null}
            onReplay={() => { setShowVictoryOverlay(false); replay.enterReplay() }}
            onVictoryExport={game.exportGame}
            interactionLocked={guestAwaitingRoomInit}
          />
          {replay.isReplaying && (
            <ReplayBar
              isReplaying={replay.isReplaying}
              replayIndex={replay.replayIndex}
              totalMoves={replay.totalMoves}
              onStepBack={replay.stepBackward}
              onStepForward={replay.stepForward}
              onGoToStart={replay.goToStart}
              onGoToEnd={replay.goToEnd}
              onGoTo={replay.goTo}
              onExit={replay.exitReplay}
              isAutoPlaying={replay.isAutoPlaying}
              isLooping={replay.isLooping}
              playbackSpeed={replay.playbackSpeed}
              onToggleAutoPlay={replay.toggleAutoPlay}
              onToggleLooping={replay.toggleLooping}
              onSetSpeed={replay.setSpeed}
            />
          )}
        </div>

        {/* ── Right Sidebar (desktop) ─────────────────────────────── */}
        <aside
          className="hidden lg:flex lg:flex-col w-56 flex-shrink-0"
          style={{ borderLeft: '1px solid var(--border-color)', overflow: 'hidden' }}
        >
          <div className="p-5 flex-shrink-0">
            <TrustBadge level={game.trustLevel} moveCount={game.moveHistory.length} />
          </div>
          <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '0 20px 20px' }}>
            <MoveHistory
              moveHistory={game.moveHistory}
              genesisHash={game.genesisHash}
              highlightIndex={replay.isReplaying ? replay.replayIndex - 1 : -1}
            />
          </div>
        </aside>

      </div>

      {/* ── Mobile bottom bar ───────────────────────────────────────── */}
      <div
        className="md:hidden flex gap-1 px-2 flex-shrink-0"
        style={{
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-secondary)',
          paddingTop: 8,
          paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        }}
      >
        {[
          { label: '新局', onClick: handleNewGame },
          { label: '悔棋', onClick: handleUndo, disabled: game.moveHistory.length === 0 || game.gameOver || undoLockedOnline },
          { label: '认输', onClick: handleResign, disabled: game.gameOver || game.moveHistory.length === 0 },
          { label: '导出', onClick: game.exportGame },
        ].map(({ label, onClick, disabled }) => (
          <button
            key={label}
            onClick={onClick}
            disabled={disabled}
            style={{
              flex: 1,
              padding: '10px 4px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 12,
              letterSpacing: '0.05em',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <Footer gameId={game.gameId} networkMode={game.networkMode} isEncrypted={conn.isEncrypted} />

      {undoBanner === 'sent' && (
        <div style={{
          position: 'fixed',
          bottom: 'max(80px, calc(env(safe-area-inset-bottom) + 64px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          padding: '12px 20px',
          borderRadius: 8,
          background: 'var(--bg-surface)',
          border: '1px solid var(--accent-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 13,
          maxWidth: 'min(420px, calc(100vw - 32px))',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          已发送悔棋请求，等待对方同意…
        </div>
      )}
      {undoBanner === 'incoming' && (
        <div style={{
          position: 'fixed',
          bottom: 'max(80px, calc(env(safe-area-inset-bottom) + 64px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          padding: '14px 18px',
          borderRadius: 8,
          background: 'var(--bg-surface)',
          border: '1px solid var(--accent-primary)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 13,
          maxWidth: 'min(420px, calc(100vw - 32px))',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}>
          <span>对方请求悔棋一步</span>
          <button
            type="button"
            onClick={handlePeerUndoAccept}
            style={{
              padding: '8px 16px',
              background: 'var(--accent-primary)',
              border: 'none',
              borderRadius: 4,
              color: '#000',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            同意
          </button>
          <button
            type="button"
            onClick={handlePeerUndoReject}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: 4,
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            拒绝
          </button>
        </div>
      )}
      {undoBanner === 'rejected' && (
        <div style={{
          position: 'fixed',
          bottom: 'max(80px, calc(env(safe-area-inset-bottom) + 64px))',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1001,
          padding: '12px 20px',
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--accent-danger, #8b3a3a) 15%, var(--bg-surface))',
          border: '1px solid var(--accent-danger, #8b3a3a)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-primary)',
          fontSize: 13,
          maxWidth: 'min(420px, calc(100vw - 32px))',
          textAlign: 'center',
        }}>
          对方拒绝了悔棋请求
        </div>
      )}

      {showDisconnectBanner && (
        <div style={{
          position: 'fixed',
          top: 'max(60px, calc(env(safe-area-inset-top) + 12px))',
          left: '50%', transform: 'translateX(-50%)',
          background: 'var(--accent-danger, #8b3a3a)', color: '#fff',
          padding: '10px 24px', borderRadius: 6, zIndex: 1000,
          fontFamily: 'var(--font-primary, monospace)', fontSize: 13,
          letterSpacing: '0.05em',
        }}>
          ⚠ PEER DISCONNECTED — GAME PAUSED
        </div>
      )}
    </div>
  )
}
