import BoardCanvas from './BoardCanvas.jsx'

export default function BoardArea({
  board, currentPlayer, moveHistory, gameOver, winningLine,
  lastMove, hoverCell, setHoverCell, isThinking,
  isDraw, resignedPlayer, placeStone, newGame, aiMode, localPlayer,
  showVictoryOverlay, onReplay, replayInfo, onVictoryExport,
  interactionLocked = false,
}) {
  const moveNum = moveHistory.length
  const lastMovePlayer = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1].player : null
  const statusMain = interactionLocked
    ? '等待主机同步棋局…'
    : replayInfo
      ? `第 ${replayInfo.index} 手`
      : gameOver
        ? isDraw ? '平局' : `${resignedPlayer ? (resignedPlayer === 1 ? '白方' : '黑方') : (lastMovePlayer === 1 ? '黑方' : '白方')}胜`
        : currentPlayer === 1 ? '黑方落子' : '白方落子'

  const statusSub = interactionLocked
    ? 'ROOM INIT · P2P'
    : replayInfo
      ? `REPLAY · ${replayInfo.index} / ${replayInfo.total}`
      : gameOver
        ? `GAME OVER · ${moveNum} MOVES`
        : `GAME IN PROGRESS · MOVE ${moveNum + 1}`

  return (
    <main className="flex items-center justify-center p-2 md:p-8">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center min-h-[52px] flex flex-col items-center justify-center">
          <div className="font-calligraphy text-[22px] text-ink tracking-[4px] transition-all">
            {statusMain}
          </div>
          <div className="font-mono text-[11px] text-ink-faint tracking-[2px] mt-0.5">
            {statusSub}
          </div>
        </div>

        <BoardCanvas
          board={board}
          currentPlayer={currentPlayer}
          moveHistory={moveHistory}
          gameOver={gameOver}
          winningLine={winningLine}
          lastMove={lastMove}
          hoverCell={hoverCell}
          setHoverCell={setHoverCell}
          isThinking={isThinking}
          isDraw={isDraw}
          resignedPlayer={resignedPlayer}
          placeStone={placeStone}
          newGame={newGame}
          aiMode={aiMode}
          localPlayer={localPlayer}
          showVictoryOverlay={showVictoryOverlay}
          onReplay={onReplay}
          onVictoryExport={onVictoryExport}
          interactionLocked={interactionLocked}
        />
      </div>
    </main>
  )
}
