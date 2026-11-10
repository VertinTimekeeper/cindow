#!/usr/bin/env bash
#
# cindow 接入引导（幂等，可反复执行）
#
# 作用：检查依赖 → 配 git 身份 → clone 或 pull → 装依赖 → 初始化数据库 → 打印下一步
#
# 用法：
#   bash scripts/bootstrap.sh
#
# 可覆盖的环境变量（全部可选，脚本内不含任何密钥）：
#   CINDOW_DIR          目标目录（默认 ~/cindow；已在本仓库内运行时自动用当前仓库）
#   CINDOW_BRANCH       分支（默认 main）
#   GIT_REMOTE_URL      远程地址（默认 SSH 别名，失败会提示改用 HTTPS）
#   GIT_USER_NAME       本机提交身份名（如 cindow-cloud-1）
#   GIT_USER_EMAIL      本机提交邮箱（GitHub noreply）
#   DATABASE_URL        数据库连接串（缺省从 .env 读取；都没有则引导生成 .env）
#   CINDOW_SEED         是否写入演示数据：auto(默认) / 1 / 0
#   CINDOW_SKIP_DB      设为 1 时跳过数据库初始化
#
set -euo pipefail

REPO_SLUG="VertinTimekeeper/cindow"
REPO_SSH_DEFAULT="git@github-cindow-write:${REPO_SLUG}.git"
REPO_HTTPS="https://github.com/${REPO_SLUG}.git"
TARGET_DIR="${CINDOW_DIR:-$HOME/cindow}"
BRANCH="${CINDOW_BRANCH:-main}"
CINDOW_SEED="${CINDOW_SEED:-auto}"
CINDOW_SKIP_DB="${CINDOW_SKIP_DB:-0}"
MIN_NODE_MAJOR=20
MIN_NODE_MINOR=9

if [ -t 1 ]; then
  C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_OFF=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_WARN=""; C_ERR=""; C_OFF=""
fi

info() { printf '%s==>%s %s\n' "$C_INFO" "$C_OFF" "$*"; }
ok()   { printf '%s  ok%s %s\n' "$C_OK" "$C_OFF" "$*"; }
warn() { printf '%s  !!%s %s\n' "$C_WARN" "$C_OFF" "$*" >&2; }
hint() { printf '     → %s\n' "$*"; }
die()  { printf '%s  xx%s %s\n' "$C_ERR" "$C_OFF" "$*" >&2; exit 1; }

# ---------------------------------------------------------------- 1. 依赖检查
info "检查依赖"

command -v git >/dev/null 2>&1 || die "未找到 git，请先安装：https://git-scm.com/downloads"
ok "git $(git --version | awk '{print $3}')"

if ! command -v node >/dev/null 2>&1; then
  die "未找到 node。请安装 Node.js ≥ ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}：https://nodejs.org/ 或用 nvm"
fi

NODE_VERSION="$(node -v | sed 's/^v//')"
NODE_MAJOR="${NODE_VERSION%%.*}"
NODE_REST="${NODE_VERSION#*.}"
NODE_MINOR="${NODE_REST%%.*}"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ] || { [ "$NODE_MAJOR" -eq "$MIN_NODE_MAJOR" ] && [ "$NODE_MINOR" -lt "$MIN_NODE_MINOR" ]; }; then
  die "Node 版本过低：当前 v${NODE_VERSION}，需要 ≥ ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}（建议用 nvm 安装 LTS）"
fi
ok "node v${NODE_VERSION}"

command -v npm >/dev/null 2>&1 || die "未找到 npm（通常随 Node 一起安装）"
ok "npm $(npm -v)"

if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  warn "未安装 ffmpeg —— 不影响开发，但 scripts/make-sample-media.sh 会跳过示例视频生成"
  hint "macOS: brew install ffmpeg   Debian/Ubuntu: sudo apt install ffmpeg"
fi

# ---------------------------------------------------------------- 2. 定位仓库
info "定位仓库"

if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  TARGET_DIR="$REPO_ROOT"
  ok "已在仓库内：${TARGET_DIR}"
elif [ -d "${TARGET_DIR}/.git" ]; then
  ok "发现已有仓库：${TARGET_DIR}"
else
  REMOTE_URL="${GIT_REMOTE_URL:-$REPO_SSH_DEFAULT}"
  info "克隆 ${REMOTE_URL}"
  if ! git clone --branch "$BRANCH" "$REMOTE_URL" "$TARGET_DIR"; then
    warn "使用 ${REMOTE_URL} 克隆失败"
    hint "若还没配置 deploy key，请先按 docs/cloud-onboarding.md 第 1 节生成并登记"
    hint "也可以临时改用 HTTPS：GIT_REMOTE_URL=${REPO_HTTPS} bash scripts/bootstrap.sh"
    die "克隆失败，已停止（未做任何破坏性操作）"
  fi
  ok "克隆完成"
fi

cd "$TARGET_DIR"

# ---------------------------------------------------------------- 3. git 身份
info "配置 git 身份"

CURRENT_NAME="$(git config --get user.name || true)"
CURRENT_EMAIL="$(git config --get user.email || true)"

if [ -n "${GIT_USER_NAME:-}" ] && [ -n "${GIT_USER_EMAIL:-}" ]; then
  git config user.name "$GIT_USER_NAME"
  git config user.email "$GIT_USER_EMAIL"
  ok "已写入本仓库身份：${GIT_USER_NAME} <${GIT_USER_EMAIL}>"
elif [ -n "$CURRENT_NAME" ] && [ -n "$CURRENT_EMAIL" ]; then
  ok "沿用现有身份：${CURRENT_NAME} <${CURRENT_EMAIL}>"
else
  warn "未配置提交身份（只影响 commit，不影响 clone/pull）"
  hint "建议每台机器使用独立身份，例如："
  hint "  export GIT_USER_NAME=cindow-cloud-1"
  hint "  export GIT_USER_EMAIL=<GitHub数字ID>+cindow-cloud-1@users.noreply.github.com"
  hint "  数字 ID 查询：gh api user --jq .id（见 docs/cloud-onboarding.md 第 3 节）"
fi

# ---------------------------------------------------------------- 4. 同步代码
info "同步代码"

if [ -d .git ]; then
  if git rev-parse --abbrev-ref --symbolic-full-name '@{u}' >/dev/null 2>&1; then
    if git pull --ff-only; then
      ok "已更新到最新 ${BRANCH}"
    else
      warn "pull --ff-only 失败（可能有本地提交或分叉）"
      hint "查看状态：git status ；查看差异：git log --oneline HEAD..@{u}"
      hint "不要用 force push。需要变基时手动执行：git pull --rebase"
    fi
  else
    warn "当前分支未设置上游，跳过自动更新"
    hint "git branch --set-upstream-to=origin/${BRANCH} ${BRANCH}"
  fi
fi

# ---------------------------------------------------------------- 5. 安装依赖
info "安装依赖"

if [ -f package-lock.json ]; then
  if npm ci --no-audit --no-fund; then
    ok "npm ci 完成"
  else
    warn "npm ci 失败，尝试 npm install"
    npm install --no-audit --no-fund || die "依赖安装失败，请检查网络或 Node 版本"
  fi
else
  npm install --no-audit --no-fund
  ok "npm install 完成（未发现 package-lock.json）"
fi

# ---------------------------------------------------------------- 6. 环境变量
info "准备环境变量"

if [ -f .env ]; then
  ok "已存在 .env（不覆盖）"
elif [ -f .env.example ]; then
  cp .env.example .env
  warn "已从 .env.example 生成 .env —— 请按需修改，不要把 .env 提交到仓库"
  hint "编辑：${TARGET_DIR}/.env"
else
  warn "既没有 .env 也没有 .env.example，跳过"
fi

if [ -f .env ]; then
  # shellcheck disable=SC1091
  ENV_DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"' || true)"
else
  ENV_DATABASE_URL=""
fi
DATABASE_URL="${DATABASE_URL:-$ENV_DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  warn "未找到 DATABASE_URL，数据库初始化这一步会跳过"
  hint "在 .env 里写：DATABASE_URL=\"file:./dev.db\""
else
  case "$DATABASE_URL" in
    postgres://*|postgresql://*) DB_KIND="postgres" ;;
    file:*|*.db)                 DB_KIND="sqlite" ;;
    *)                           DB_KIND="sqlite" ;;
  esac
  ok "数据库类型：${DB_KIND}"
fi

# ---------------------------------------------------------------- 7. 初始化数据库
if [ "${CINDOW_SKIP_DB}" = "1" ]; then
  warn "CINDOW_SKIP_DB=1，跳过数据库初始化"
elif [ -z "${DATABASE_URL:-}" ]; then
  warn "跳过数据库初始化（缺少 DATABASE_URL）"
else
  info "初始化数据库"

  if [ "$DB_KIND" = "postgres" ]; then
    if [ -d prisma/migrations ]; then
      if npx prisma migrate deploy; then
        ok "prisma migrate deploy 完成"
      else
        warn "migrate deploy 失败（检查连接串与网络）；未自动改库"
      fi
    else
      warn "PostgreSQL 环境下还没有 prisma/migrations"
      hint "首次上生产前建议：npx prisma migrate dev --name init，并提交 prisma/migrations/"
      hint "临时对齐结构（开发库才可用）：npx prisma db push"
      if [ "${CINDOW_ALLOW_DB_PUSH:-0}" = "1" ]; then
        npx prisma db push || warn "db push 失败"
      fi
    fi
  else
    if npx prisma db push; then
      ok "SQLite 结构已同步（prisma/dev.db）"
    else
      warn "prisma db push 失败，请检查 .env 的 DATABASE_URL"
    fi

    if [ "$CINDOW_SEED" != "0" ]; then
      if npx tsx prisma/seed.ts; then
        ok "演示数据就绪"
      else
        warn "种子写入失败（通常是库已被占用或有历史数据），可手动执行：npm run db:seed"
      fi
    fi
  fi
fi

# ---------------------------------------------------------------- 8. 下一步
info "完成，下一步"
printf '  1) 启动开发服务：npm run dev        → http://localhost:3000\n'
printf '  2) 演示账号（仅本地种子数据）：demo@cindow.local / cindow1234\n'
printf '  3) 开工前请读：docs/cloud-onboarding.md（凭据、提交前检查、吊销流程）\n'
printf '  4) 提交前自检：git status && npm run build\n'
printf '  5) 分支保护与 PR 要求：docs/branch-protection.md\n'
