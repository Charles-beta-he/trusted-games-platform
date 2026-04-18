/**
 * 通用游戏组件测试文件
 * 
 * 验证组件可以正确导入和使用
 */

import { describe, it, expect } from 'vitest'

describe('Game Components', () => {
  it('should export GameHeader', async () => {
    const GameHeader = await import('./GameHeader.jsx')
    expect(GameHeader.default).toBeDefined()
    expect(typeof GameHeader.default).toBe('function')
  })

  it('should export GameVictory', async () => {
    const GameVictory = await import('./GameVictory.jsx')
    expect(GameVictory.default).toBeDefined()
    expect(typeof GameVictory.default).toBe('function')
  })

  it('should export GameControls', async () => {
    const GameControls = await import('./GameControls.jsx')
    expect(GameControls.default).toBeDefined()
    expect(typeof GameControls.default).toBe('function')
  })
})