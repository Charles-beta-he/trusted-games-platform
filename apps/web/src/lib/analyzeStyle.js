/**
 * 个人棋风分析器
 *
 * 从 IndexedDB 读取历史对局，统计落子模式，
 * 生成个人 StyleProfile。
 *
 * 至少需要 10 局数据，建议 20 局以上。
 */

import { BOARD_SIZE, SCORE } from './constants.js'
import { evaluatePosition } from './ai.js'
import { savePersonalStyle } from './ai-styles.js'

const DB_NAME = 'GomokuDB'
const CENTER = (BOARD_SIZE - 1) / 2  // 7

/** 读取所有已完成对局 */
function loadGames() {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onerror = () => resolve([])
    req.onsuccess = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('games')) return resolve([])
      const tx = db.transaction('games', 'readonly')
      const store = tx.objectStore('games')
      const all = store.getAll()
      all.onsuccess = () => resolve(all.result ?? [])
      all.onerror = () => resolve([])
    }
  })
}

/**
 * 判断一步棋是否是防守性落子：
 * 如果这步棋阻断了对手的一个 >= OPEN_THREE 威胁，视为防守
 */
function isDefensiveMove(boardBefore, r, c, player) {
  const opponent = player === 1 ? 2 : 1
  boardBefore[r][c] = opponent
  const threatScore = evaluatePosition(boardBefore, r, c, opponent)
  boardBefore[r][c] = 0
  return threatScore >= SCORE.OPEN_THREE
}

/**
 * 判断一步棋是否是进攻性落子：
 * 如果落子后己方在该位置评分 >= OPEN_THREE，视为进攻
 */
function isAttackMove(boardAfter, r, c, player) {
  const score = evaluatePosition(boardAfter, r, c, player)
  return score >= SCORE.OPEN_THREE
}

/** 计算落子到中腹的距离权重（0~1，越近中腹越高） */
function centerScore(r, c) {
  const dist = Math.max(Math.abs(r - CENTER), Math.abs(c - CENTER))
  return Math.max(0, 1 - dist / CENTER)
}

/**
 * 分析对局历史，返回个人棋风 profile
 * @param {Array} games - IndexedDB 中的对局记录数组
 * @returns {{ params, meta }} StyleProfile
 */
export function analyzeGames(games) {
  const completed = games.filter(g => g.gameOver && g.moves?.length >= 5)

  if (completed.length < 3) {
    return null  // 数据不足
  }

  let totalMoves = 0
  let attackCount = 0
  let defenseCount = 0
  let centerSum = 0

  for (const game of completed) {
    const moves = game.moves
    // 重建棋盘逐步分析（player 1 = 奇数步，player 2 = 偶数步）
    const board = Array.from({ length: BOARD_SIZE }, () => new Array(BOARD_SIZE).fill(0))

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i]
      // 只分析 player 1（本地玩家通常是黑方）
      const player = (i % 2 === 0) ? 1 : 2
      if (player !== 1) {
        board[move.r][move.c] = player
        continue
      }

      const isDef = isDefensiveMove(board, move.r, move.c, player)
      board[move.r][move.c] = player
      const isAtk = isAttackMove(board, move.r, move.c, player)

      if (isDef) defenseCount++
      if (isAtk) attackCount++
      centerSum += centerScore(move.r, move.c)
      totalMoves++
    }
  }

  if (totalMoves === 0) return null

  const attackRate  = attackCount / totalMoves   // 0~1
  const defenseRate = defenseCount / totalMoves  // 0~1
  const centerPref  = centerSum / totalMoves     // 0~1

  // 映射到风格参数
  // attack:  [0.6, 1.8]  based on attack rate
  // defense: [0.6, 1.8]  based on defense rate
  // center:  [0, 0.5]    based on center preference
  const attack  = 0.6 + attackRate * 1.2
  const defense = 0.6 + defenseRate * 1.2
  const center  = centerPref * 0.5

  const profile = {
    id: 'personal',
    name: '我的棋风',
    nameEn: 'My Style',
    desc: `基于 ${completed.length} 局对局生成`,
    icon: '👤',
    params: {
      attack:  Math.round(attack  * 100) / 100,
      defense: Math.round(defense * 100) / 100,
      center:  Math.round(center  * 100) / 100,
      noise:   0.05,
    },
    meta: {
      gamesAnalyzed: completed.length,
      attackRate:    Math.round(attackRate  * 100),
      defenseRate:   Math.round(defenseRate * 100),
      centerPref:    Math.round(centerPref  * 100),
      generatedAt:   Date.now(),
    },
  }

  return profile
}

/**
 * 从 IndexedDB 读取数据、分析并保存个人棋风
 * @returns {Promise<{profile, error}>}
 */
export async function generatePersonalStyle() {
  try {
    const games = await loadGames()
    const profile = analyzeGames(games)
    if (!profile) {
      const count = games.filter(g => g.gameOver && g.moves?.length >= 5).length
      return {
        profile: null,
        error: count < 3
          ? `数据不足（当前 ${count} 局，至少需要 3 局完整对局）`
          : '分析失败，请稍后重试',
      }
    }
    savePersonalStyle(profile)
    return { profile, error: null }
  } catch (e) {
    return { profile: null, error: '读取对局数据失败' }
  }
}
