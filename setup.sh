#!/usr/bin/env bash
# setup.sh — chạy 1 lần duy nhất khi clone repo về máy mới
# Tự động cài dependencies + cài git hook

set -e
CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RESET='\033[0m'
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo -e "${CYAN}╔══════════════════════════════════════╗${RESET}"
echo -e "${CYAN}║   English App — Setup                ║${RESET}"
echo -e "${CYAN}╚══════════════════════════════════════╝${RESET}"
echo ""

# 1. Cài npm dependencies
echo -e "  ${CYAN}→${RESET} npm install..."
cd "$REPO_ROOT"
npm install --silent
echo -e "  ${GREEN}✓${RESET} Dependencies installed"

# 2. Copy pre-push hook vào .git/hooks/
HOOK_SRC="$REPO_ROOT/pre-push"
HOOK_DEST="$REPO_ROOT/.git/hooks/pre-push"

if [ ! -f "$HOOK_SRC" ]; then
  echo -e "  ${YELLOW}⚠${RESET} Không tìm thấy file pre-push — hook không được cài"
else
  cp "$HOOK_SRC" "$HOOK_DEST"
  chmod +x "$HOOK_DEST"
  echo -e "  ${GREEN}✓${RESET} Git pre-push hook đã được cài"
fi

echo ""
echo -e "  ${GREEN}✅ Setup xong!${RESET}"
echo ""
echo -e "  Từ giờ chỉ cần:"
echo -e "  ${CYAN}  git add .${RESET}"
echo -e "  ${CYAN}  git commit -m \"your message\"${RESET}"
echo -e "  ${CYAN}  git push${RESET}"
echo ""
echo -e "  Hook sẽ tự động build + deploy lên gh-pages trước khi push."
echo ""
