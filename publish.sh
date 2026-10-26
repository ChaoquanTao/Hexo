#!/usr/bin/env bash
# 把 Obsidian vault (/Users/tco1wx/blog) 里的文章同步到 Hexo，并发布到 Cloudflare。
#
# 用法:
#   npm run sync       # 只同步到 source/_posts，不提交（本地 npx hexo server 预览用）
#   npm run publish    # 同步 + 提交推送 vault + 提交推送 Hexo，触发 Cloudflare 自动部署
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
    # front matter 里写了 published: false 的文章不发布到博客（如只发公众号的文章）
    if awk 'NR>1 && /^---[[:space:]]*$/ {exit} NR>1 && /^published:[[:space:]]*false[[:space:]]*$/ {found=1} END {exit !found}' "$f"; then
      echo "  跳过(published: false): $(basename "$f")"
      skip=$((skip + 1))
      continue
    fi
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

# 同步图片目录（vault/images -> source/images，做镜像）
# 文章里用相对路径 images/xxx 引用，这里改写成站点绝对路径 /images/xxx，
# 这样 Obsidian 本地预览（相对路径）和 Hexo 线上（绝对路径）都能正确显示。
IMG_SRC="$VAULT/images"
IMG_DST="$HERE/source/images"
if [ -d "$IMG_SRC" ]; then
  mkdir -p "$IMG_DST"
  # 只拷贝 vault 图片（同名覆盖），不清空目录——保留 source/images 里手动管理的图
  # （如侧栏二维码 qrcode-mp.png）。注意：vault 里删掉的图不会自动从这里移除。
  cp -R "$IMG_SRC"/. "$IMG_DST"/
  # 改写 images/ 相对引用为站点绝对路径 /images/：
  #   - Markdown 图片  ](images/...)        -> ](/images/...)
  #   - HTML <img>     src="images/..."     -> src="/images/..."（含单/双引号）
  # 注意必须用绝对路径，否则 https 线上页面里相对路径会按当前文章 URL 解析而 404。
  find "$POSTS" -name '*.md' -exec sed -i '' -E \
    -e 's#\]\(images/#](/images/#g' \
    -e 's#(src=["'\''])images/#\1/images/#g' {} +
  echo "✓ 已同步图片 $(find "$IMG_SRC" -type f | wc -l | tr -d ' ') 个 -> source/images/（文章 images/ 引用已改写为 /images/）"
fi

# --dry / --sync-only：只同步，不提交不推送
case "${1:-}" in
  --dry | --sync-only)
    echo "（仅同步模式：未提交、未推送。可用 'npx hexo server' 本地预览）"
    exit 0
    ;;
esac

# 先提交并推送 vault（内容源头，ChaoquanTao/Blog）。
# vault 是文章的唯一来源，先把它的改动推上去，再发布 Hexo 站点。
# 注意：vault 目前没有 .gitignore，这里用 git add -A 会提交全部改动
#（含 .DS_Store / .obsidian/workspace.json / .omc/ / _wechat.html / 封面图等杂物）。
if git -C "$VAULT" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  vault_branch="$(git -C "$VAULT" rev-parse --abbrev-ref HEAD)"
  git -C "$VAULT" add -A
  if git -C "$VAULT" diff --cached --quiet; then
    echo "vault 无改动，无需提交。"
  else
    git -C "$VAULT" commit -m "publish: 同步 vault 内容 ($(date '+%Y-%m-%d %H:%M'))"
    git -C "$VAULT" push origin "$vault_branch"
    echo "✓ vault 已推送到 origin/${vault_branch}。"
  fi
else
  echo "⚠ vault ($VAULT) 不是 git 仓库，跳过 vault 提交推送。"
fi

cd "$HERE"
# 提交全部站点改动：vault 同步来的文章/图片 + 主题配置、自定义样式/视图等手动改动。
# .gitignore 已排除 public/、node_modules/、db.json、*.log 等构建产物，故 git add -A 是安全的。
git add -A
if git diff --cached --quiet; then
  echo "内容无变化，无需发布。"
  exit 0
fi
git commit -m "publish: 同步内容与配置 ($(date '+%Y-%m-%d %H:%M'))"
git push origin main
echo "✓ 已推送，Cloudflare 将自动重新部署。"
