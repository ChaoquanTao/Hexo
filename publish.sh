#!/usr/bin/env bash
# 把 Obsidian vault (/Users/tco1wx/blog) 里的文章同步到 Hexo，并发布到 Cloudflare。
#
# 用法:
#   npm run sync       # 只同步到 source/_posts，不提交（本地 npx hexo server 预览用）
#   npm run publish    # 同步 + commit + push，触发 Cloudflare 自动部署
#
# 规则:
#   - 来源是 vault 顶层的 *.md（vault 为唯一来源，做镜像同步：vault 删了这边也删）
#   - 只发布带 Hexo front matter（首行是 ---）的文章，自动跳过草稿/笔记
#   - 文件名自动去掉 YYYYMMDD- 日期前缀，保持 URL 干净
#   - vault 路径可用环境变量 BLOG_VAULT 覆盖
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT="${BLOG_VAULT:-/Users/tco1wx/blog}"
POSTS="$HERE/source/_posts"

[ -d "$VAULT" ] || { echo "✗ vault 目录不存在: $VAULT （可用 BLOG_VAULT 环境变量指定）"; exit 1; }
mkdir -p "$POSTS"

# 以 vault 为唯一来源做镜像：先清空旧的 .md，再拷贝
rm -f "$POSTS"/*.md

n=0; skip=0
shopt -s nullglob
for f in "$VAULT"/*.md; do
  # 只发布带 front matter（首行是 ---）的文章，跳过草稿/笔记
  if IFS= read -r first < "$f" && [ "$first" = "---" ]; then
    base="$(basename "$f")"
    dest="${base#[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-}"   # 去掉 YYYYMMDD- 前缀
    cp "$f" "$POSTS/$dest"
    n=$((n + 1))
  else
    echo "  跳过(无 front matter): $(basename "$f")"
    skip=$((skip + 1))
  fi
done
echo "✓ 已同步 $n 篇文章到 source/_posts（跳过 $skip 个草稿/笔记）"

# --dry / --sync-only：只同步，不提交不推送
case "${1:-}" in
  --dry | --sync-only)
    echo "（仅同步模式：未提交、未推送。可用 'npx hexo server' 本地预览）"
    exit 0
    ;;
esac

cd "$HERE"
git add source/_posts
if git diff --cached --quiet; then
  echo "内容无变化，无需发布。"
  exit 0
fi
git commit -m "posts: 同步自 vault ($(date '+%Y-%m-%d %H:%M'))"
git push origin main
echo "✓ 已推送，Cloudflare 将自动重新部署。"
