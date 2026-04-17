#!/usr/bin/env bash
# optimize-loop.sh — 驱动 openclaw 对 gomoku-react 执行自循环优化
# 用法: OPENCLAW_GATEWAY_TOKEN=<token> ./optimize-loop.sh [最大轮数，默认10]

set -euo pipefail

PROJECT="/Users/charles/Desktop/folder/gomoku-react"
MAX_ROUNDS="${1:-10}"
REPORT_DIR="$PROJECT/.claude"
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-}"

if [[ -z "$TOKEN" ]]; then
  echo "❌ 需要设置 OPENCLAW_GATEWAY_TOKEN"
  exit 1
fi

export OPENCLAW_GATEWAY_TOKEN="$TOKEN"
cd "$PROJECT"
mkdir -p "$REPORT_DIR"

ROUND=0
CONSECUTIVE_EMPTY=0

while [[ $ROUND -lt $MAX_ROUNDS ]]; do
  ROUND=$((ROUND + 1))
  REPORT="$REPORT_DIR/loop-report-$ROUND.md"

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔁 第 $ROUND 轮优化开始 $(date '+%H:%M:%S')"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  # 拼接上一轮上下文
  PREV_CONTEXT=""
  if [[ $ROUND -gt 1 && -f "$REPORT_DIR/loop-report-$((ROUND-1)).md" ]]; then
    PREV_CONTEXT="上一轮报告末尾：$(tail -15 "$REPORT_DIR/loop-report-$((ROUND-1)).md")"
  fi

  MSG="你正在 /Users/charles/Desktop/folder/gomoku-react 项目中执行第 ${ROUND} 轮自循环优化。
请严格按照项目 CLAUDE.md 中的【自循环优化协议】执行 STEP1~STEP5。
${PREV_CONTEXT}

额外要求：
- 将完整报告写入 .claude/loop-report-${ROUND}.md
- 报告最后一行格式：PROPOSALS_EXECUTED=<数字> PROPOSALS_PRUNED=<数字>
- 若本轮无任何新提案，最后一行写：NO_NEW_PROPOSALS=true"

  # 调用 openclaw agent（本地模式，不依赖 Gateway 路由）
  openclaw agent --local --message "$MSG" 2>&1 | tee "/tmp/openclaw-round-$ROUND.log"

  # 解析终止条件
  if [[ -f "$REPORT" ]]; then
    if grep -q "NO_NEW_PROPOSALS=true" "$REPORT"; then
      CONSECUTIVE_EMPTY=$((CONSECUTIVE_EMPTY + 1))
      echo "⚠️  本轮无新提案（连续 $CONSECUTIVE_EMPTY 轮）"
      [[ $CONSECUTIVE_EMPTY -ge 2 ]] && { echo "✅ 连续2轮无新提案，退出"; break; }
    else
      CONSECUTIVE_EMPTY=0
    fi

    EXECUTED=$(grep -oP 'PROPOSALS_EXECUTED=\K\d+' "$REPORT" 2>/dev/null || echo "0")
    PRUNED=$(grep -oP 'PROPOSALS_PRUNED=\K\d+' "$REPORT" 2>/dev/null || echo "0")
    echo "📊 本轮：执行 $EXECUTED 个，剪枝 $PRUNED 个"

    if [[ "$EXECUTED" == "0" && "${PRUNED:-0}" -gt 0 ]]; then
      echo "✅ 所有提案均被剪枝，退出循环"
      break
    fi
  fi

  sleep 5
done

echo ""
echo "🏁 优化循环结束，共执行 $ROUND 轮"
echo "📁 报告: $REPORT_DIR/loop-report-*.md"
