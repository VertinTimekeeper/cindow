#!/usr/bin/env bash
#
# 安装 / 卸载 pre-push 钩子（调用 scripts/check.sh）
#
# 用法：
#   bash scripts/install-hooks.sh              # 安装
#   bash scripts/install-hooks.sh --uninstall  # 卸载
#   bash scripts/install-hooks.sh --status     # 查看当前状态
#
# 说明：
#   - 钩子只在本机生效，不会提交到仓库（.git/hooks 不受版本控制）
#   - 紧急情况可用 git push --no-verify 跳过
#   - 想临时跳过重量级构建：CHECK_ARGS=--skip-build git push
#
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

HOOKS_DIR="$(git rev-parse --git-path hooks)"
[ "${HOOKS_DIR#/}" = "$HOOKS_DIR" ] && HOOKS_DIR="$ROOT/$HOOKS_DIR"
HOOK_FILE="$HOOKS_DIR/pre-push"
MARKER="# cindow-managed-pre-push"

case "${1:-install}" in
  install)
    mkdir -p "$HOOKS_DIR"
    if [ -f "$HOOK_FILE" ] && ! grep -q "$MARKER" "$HOOK_FILE"; then
      cp "$HOOK_FILE" "$HOOK_FILE.bak.$(date +%Y%m%d%H%M%S)"
      echo "已备份原有 pre-push 钩子"
    fi
    cat > "$HOOK_FILE" <<EOF
#!/usr/bin/env bash
$MARKER
# 由 scripts/install-hooks.sh 生成；卸载：bash scripts/install-hooks.sh --uninstall
# 跳过：git push --no-verify ；只做类型检查：CHECK_ARGS=--skip-build git push
set -euo pipefail
cd "\$(git rev-parse --show-toplevel)"
exec bash scripts/check.sh \${CHECK_ARGS:-}
EOF
    chmod +x "$HOOK_FILE"
    echo "已安装：$HOOK_FILE"
    echo "跳过方式：git push --no-verify"
    ;;
  --uninstall)
    if [ -f "$HOOK_FILE" ] && grep -q "$MARKER" "$HOOK_FILE"; then
      rm -f "$HOOK_FILE"
      echo "已卸载：$HOOK_FILE"
    else
      echo "未发现由本脚本安装的钩子，未做改动"
    fi
    ;;
  --status)
    if [ -f "$HOOK_FILE" ] && grep -q "$MARKER" "$HOOK_FILE"; then
      echo "已安装：$HOOK_FILE"
    elif [ -f "$HOOK_FILE" ]; then
      echo "存在其他来源的 pre-push 钩子（未被本脚本管理）：$HOOK_FILE"
    else
      echo "未安装"
    fi
    ;;
  *)
    echo "未知参数：$1（可用：--uninstall / --status）" >&2
    exit 2
    ;;
esac
