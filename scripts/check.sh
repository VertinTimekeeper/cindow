#!/usr/bin/env bash
#
# 本地检查（替代远程 CI 的最低门槛）
#
# 依次执行：依赖安装（已装则跳过）→ prisma generate → 类型检查 → 构建
# 任一步失败立即以非零码退出，可直接用于 pre-push 钩子或手动执行。
#
# 用法：
#   bash scripts/check.sh
#   bash scripts/check.sh --skip-build     # 只想快速做类型检查时
#
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

SKIP_BUILD=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "未知参数：$arg（可用：--skip-build）" >&2; exit 2 ;;
  esac
done

if [ -t 1 ]; then
  C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_ERR=$'\033[31m'; C_OFF=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_ERR=""; C_OFF=""
fi

step() { printf '%s==>%s %s\n' "$C_INFO" "$C_OFF" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$C_OK" "$C_OFF" "$*"; }
fail() { printf '%s  xx%s %s\n' "$C_ERR" "$C_OFF" "$*" >&2; exit 1; }

command -v node >/dev/null 2>&1 || fail "未找到 node，请先安装 Node.js ≥ 20.9"
command -v npm  >/dev/null 2>&1 || fail "未找到 npm"

# 1) 依赖：node_modules 存在且不比 lockfile 旧时跳过
step "依赖"
LOCK_STAMP="node_modules/.package-lock.json"
if [ -d node_modules ] && [ -f "$LOCK_STAMP" ] && [ -f package-lock.json ] && [ package-lock.json -ot "$LOCK_STAMP" ]; then
  ok "依赖已是最新，跳过 npm ci"
else
  npm ci --no-audit --no-fund || fail "npm ci 失败（可尝试删除 node_modules 后重跑，或检查网络）"
  ok "npm ci 完成"
fi

# 2) Prisma Client
step "Prisma Client"
npx prisma generate >/dev/null 2>&1 || fail "prisma generate 失败"
ok "已生成"

# 3) 类型检查
step "类型检查"
npx tsc --noEmit || fail "类型检查未通过"
ok "无类型错误"

# 4) 构建
if [ "$SKIP_BUILD" = "1" ]; then
  step "构建"
  ok "已按 --skip-build 跳过"
else
  step "构建"
  npm run build || fail "构建失败"
  ok "构建通过"
fi

printf '\n%s全部通过%s\n' "$C_OK" "$C_OFF"
