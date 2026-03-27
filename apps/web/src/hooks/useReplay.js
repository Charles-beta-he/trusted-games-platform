import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { BOARD_SIZE } from '@tg/core/constants'

export function useReplay(moveHistory) {
  const [replayIndex, setReplayIndex] = useState(0)   // 0 = 开局，moveHistory.length = 终局
  const [isReplaying, setIsReplaying] = useState(false)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [isLooping, setIsLooping] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1000)  // ms per step

  // 根据 replayIndex 重建棋盘快照（moveHistory 使用 r/c 字段）
  const replayBoard = useMemo(() => {
    const board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0))
    for (let i = 0; i < replayIndex; i++) {
      const { r, c, player } = moveHistory[i]
      if (r != null && c != null) board[r][c] = player
    }
    return board
  }, [moveHistory, replayIndex])

  const replayCurrentPlayer = replayIndex < moveHistory.length
    ? moveHistory[replayIndex]?.player ?? 1
    : null

  const lastReplayMove = replayIndex > 0
    ? { r: moveHistory[replayIndex - 1]?.r, c: moveHistory[replayIndex - 1]?.c }
    : null

  const goTo = useCallback((index) => {
    setReplayIndex(Math.max(0, Math.min(index, moveHistory.length)))
  }, [moveHistory.length])

  const stepForward  = useCallback(() => goTo(replayIndex + 1), [goTo, replayIndex])
  const stepBackward = useCallback(() => goTo(replayIndex - 1), [goTo, replayIndex])
  const goToStart    = useCallback(() => goTo(0),                [goTo])
  const goToEnd      = useCallback(() => goTo(moveHistory.length), [goTo, moveHistory.length])

  const enterReplay  = useCallback((autoPlay = false) => {
    setReplayIndex(0)
    setIsReplaying(true)
    if (autoPlay) setIsAutoPlaying(true)
  }, [])

  const exitReplay   = useCallback(() => {
    setIsReplaying(false)
    setReplayIndex(0)
    setIsAutoPlaying(false)
  }, [])

  const toggleAutoPlay = useCallback(() => setIsAutoPlaying(v => !v), [])
  const toggleLooping  = useCallback(() => setIsLooping(v => !v), [])
  const setSpeed       = useCallback((ms) => setPlaybackSpeed(ms), [])

  const autoPlayTimerRef = useRef(null)

  // Auto-play effect: 链式 setTimeout，每次 replayIndex 变化触发下一步
  useEffect(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current)
      autoPlayTimerRef.current = null
    }

    if (!isAutoPlaying || !isReplaying) return

    // 如果已经到终点
    if (replayIndex >= moveHistory.length) {
      if (isLooping) {
        setReplayIndex(0)
      } else {
        setIsAutoPlaying(false)
      }
      return
    }

    // 设置下一步的 timer
    autoPlayTimerRef.current = setTimeout(() => {
      setReplayIndex(prev => prev + 1)
    }, playbackSpeed)

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current)
        autoPlayTimerRef.current = null
      }
    }
  }, [isAutoPlaying, isReplaying, isLooping, playbackSpeed, replayIndex, moveHistory.length])

  return {
    isReplaying,
    replayIndex,
    replayBoard,
    replayCurrentPlayer,
    lastReplayMove,
    enterReplay,
    exitReplay,
    stepForward,
    stepBackward,
    goToStart,
    goToEnd,
    goTo,
    totalMoves: moveHistory.length,
    isAutoPlaying,
    isLooping,
    playbackSpeed,
    toggleAutoPlay,
    toggleLooping,
    setSpeed,
  }
}
