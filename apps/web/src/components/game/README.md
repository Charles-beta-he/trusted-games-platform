/**
 * 通用游戏组件使用示例
 * 
 * 本文件展示如何将 GameHeader, GameVictory, GameControls 组件
 * 集成到现有游戏中，作为可选的抽象层
 */

import { useState, useCallback } from 'react'
import GameHeader from '../components/game/GameHeader.jsx'
import GameVictory from '../components/game/GameVictory.jsx'
import GameControls from '../components/game/GameControls.jsx'

/**
 * 示例：使用通用游戏组件的五子棋页面
 * 
 * 注意：这只是示例代码，实际使用时需要根据具体游戏逻辑进行调整
 */
export function ExampleGomokuPage() {
  // 模拟游戏状态
  const [gameState, setGameState] = useState({
    currentPlayer: 1,
    moveCount: 0,
    gameOver: false,
    winner: null,
    isDraw: false,
    lastHash: 'abc123def456...',
    moveHistory: [],
  })
  
  const [aiMode, setAiMode] = useState(false)
  
  // 游戏控制函数
  const handleNewGame = useCallback(() => {
    setGameState({
      currentPlayer: 1,
      moveCount: 0,
      gameOver: false,
      winner: null,
      isDraw: false,
      lastHash: '',
      moveHistory: [],
    })
  }, [])
  
  const handleUndo = useCallback(() => {
    if (gameState.moveCount > 0) {
      setGameState(prev => ({
        ...prev,
        moveCount: prev.moveCount - 1,
        currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
        moveHistory: prev.moveHistory.slice(0, -1),
      }))
    }
  }, [gameState.moveCount])
  
  const handleResign = useCallback(() => {
    if (!gameState.gameOver && gameState.moveCount > 0) {
      setGameState(prev => ({
        ...prev,
        gameOver: true,
        winner: prev.currentPlayer === 1 ? 2 : 1,
      }))
    }
  }, [gameState.gameOver, gameState.moveCount])
  
  const handleToggleAI = useCallback(() => {
    setAiMode(prev => !prev)
    handleNewGame()
  }, [handleNewGame])
  
  const handleExport = useCallback(() => {
    console.log('导出棋谱...')
  }, [])
  
  const handleReplay = useCallback(() => {
    console.log('开始回放...')
  }, [])

  
  return (
    <div className="flex flex-col min-h-screen">
      {/* 使用通用游戏头部 */}
      <GameHeader
        currentPlayer={gameState.currentPlayer}
        moveCount={gameState.moveCount}
        gameOver={gameState.gameOver}
        player1Name="黑方"
        player2Name="白方"
        onBackToLobby={() => console.log('返回大厅')}
        gameId="gomoku"
      >
        {/* 可以添加自定义内容 */}
        <div className="font-mono text-[10px] text-theme-muted">
          {aiMode ? 'AI模式' : '双人模式'}
        </div>
      </GameHeader>
      
      {/* 游戏主区域 */}
      <main className="flex-1 flex">
        {/* 侧边栏控制面板 */}
        <aside className="w-56 border-r border-theme p-4">
          <GameControls
            onNewGame={handleNewGame}
            onUndo={handleUndo}
            onResign={handleResign}
            onToggleAI={handleToggleAI}
            onExport={handleExport}
            onReplay={handleReplay}
            aiMode={aiMode}
            gameOver={gameState.gameOver}
            canUndo={gameState.moveCount > 0}
            canReplay={gameState.moveCount > 0}
            mode="all"
          />
        </aside>
        
        {/* 棋盘区域 */}
        <div className="flex-1 flex items-center justify-center">
          <div className="w-96 h-96 bg-amber-100 border-2 border-amber-800">
            {/* 这里是实际的棋盘组件 */}
            <div className="flex items-center justify-center h-full text-amber-800">
              棋盘区域
            </div>
          </div>
        </div>
      </main>
      
      {/* 使用通用胜利覆盖层 */}
      <GameVictory
        show={gameState.gameOver}
        winner={gameState.winner}
        isDraw={gameState.isDraw}
        lastHash={gameState.lastHash}
        onNewGame={handleNewGame}
        onReplay={handleReplay}
        onExport={handleExport}
        moveCount={gameState.moveCount}
        winnerNames={{ 1: '黑方', 2: '白方' }}
      />
    </div>
  )
}

/**
 * 示例：使用通用游戏组件的围棋页面
 * 
 * 围棋有额外的"跳过"按钮，可以通过 children 添加
 */
export function ExampleGoPage() {
  const [gameState, setGameState] = useState({
    currentPlayer: 1,
    moveCount: 0,
    gameOver: false,
    winner: null,
    isDraw: false,
    lastHash: '',
    moveHistory: [],
  })
  
  const [aiMode, setAiMode] = useState(false)
  
  const handlePass = useCallback(() => {
    console.log('跳过回合')
    setGameState(prev => ({
      ...prev,
      currentPlayer: prev.currentPlayer === 1 ? 2 : 1,
      moveCount: prev.moveCount + 1,
    }))
  }, [])
  
  return (
    <div className="flex flex-col min-h-screen">
      <GameHeader
        currentPlayer={gameState.currentPlayer}
        moveCount={gameState.moveCount}
        gameOver={gameState.gameOver}
        player1Name="黑方"
        player2Name="白方"
        onBackToLobby={() => console.log('返回大厅')}
        gameId="go"
      />
      
      <main className="flex-1 flex">
        <aside className="w-56 border-r border-theme p-4">
          {/* 使用 children 添加围棋专用的"跳过"按钮 */}
          <GameControls
            onNewGame={() => console.log('新游戏')}
            onUndo={() => console.log('悔棋')}
            onResign={() => console.log('认输')}
            onToggleAI={() => setAiMode(!aiMode)}
            onExport={() => console.log('导出')}
            onReplay={() => console.log('回放')}
            onPass={handlePass}  // 围棋专用
            aiMode={aiMode}
            gameOver={gameState.gameOver}
            canUndo={gameState.moveCount > 0}
            canReplay={gameState.moveCount > 0}
            mode="all"
          />
        </aside>
        
        <div className="flex-1 flex items-center justify-center">
          <div className="w-96 h-96 bg-amber-50 border-2 border-amber-900">
            <div className="flex items-center justify-center h-full text-amber-900">
              围棋棋盘
            </div>
          </div>
        </div>
      </main>
      
      <GameVictory
        show={gameState.gameOver}
        winner={gameState.winner}
        isDraw={gameState.isDraw}
        lastHash={gameState.lastHash}
        onNewGame={() => console.log('新游戏')}
        onReplay={() => console.log('回放')}
        onExport={() => console.log('导出')}
        moveCount={gameState.moveCount}
        winnerNames={{ 1: '黑方', 2: '白方' }}
      />
    </div>
  )
}

/**
 * 示例：自定义胜利覆盖层
 * 
 * 可以通过 children 添加自定义内容
 */
export function CustomVictoryOverlay() {
  const [show, setShow] = useState(true)
  
  return (
    <GameVictory
      show={show}
      winner={1}
      isDraw={false}
      lastHash="custom123..."
      onNewGame={() => setShow(false)}
      moveCount={42}
      winnerNames={{ 1: '黑方', 2: '白方' }}
    >
      {/* 自定义内容 */}
      <div className="mt-4 p-3 bg-white/50 border border-paper-dark">
        <div className="font-mono text-[10px] text-ink-faint">
          自定义统计信息
        </div>
        <div className="font-mono text-[9px] text-ink-faint mt-1">
          用时: 5分32秒 | 步数: 42
        </div>
      </div>
    </GameVictory>
  )
}

/**
 * 迁移指南：从现有组件迁移到通用组件
 * 
 * 1. Header -> GameHeader
 *    - 移除 theme switcher 和 animation toggle（保留在 Header 中）
 *    - 添加 currentPlayer 和 statusText 支持
 * 
 * 2. VictoryOverlay -> GameVictory
 *    - 添加 winnerNames 支持不同游戏的命名
 *    - 添加 subtitle 支持额外信息
 *    - 添加 children 支持自定义内容
 * 
 * 3. ControlButtons -> GameControls
 *    - 添加 className 支持自定义样式
 *    - 添加 children 支持自定义按钮
 *    - 保持 mode 参数兼容性
 * 
 * 注意：通用组件是可选的抽象层，现有组件可以继续使用。
 * 只有在需要跨游戏复用时才使用通用组件。