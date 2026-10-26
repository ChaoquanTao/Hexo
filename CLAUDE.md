# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

A Hexo static blog deployed on **Cloudflare Workers** at https://singularities.cc. `README.md` is the authoritative ops runbook (in Chinese) — read it for deploy troubleshooting; this file covers architecture and the non-obvious constraints.

## Commands

```bash
npm run sync        # mirror Obsidian vault → source/_posts (+images), no commit. For local preview.
npm run publish     # sync + git commit + git push origin main → triggers Cloudflare auto-deploy
npx hexo server     # local preview at http://localhost:4000 (run after `npm run sync`)
npx hexo generate   # build static site into public/ (rarely run by hand)
npx hexo clean      # delete db.json and public/
```

- **Never invoke a bare `hexo`** — it is not installed globally. Always use `npx hexo …` or an `npm run` script.
- There are no tests, linters, or a build step beyond `hexo generate`.

## Content authoring model (critical)

**Articles are NOT written in this repo.** They live in a separate Obsidian vault git repo (`ChaoquanTao/Blog`) at `/Users/tco1wx/blog`. `publish.sh` is a one-way bridge from the vault into Hexo:

- It **mirrors** `*.md` from the vault top level into `source/_posts` — it `rm -f source/_posts/*.md` first, so deleting a post in the vault deletes it here on next sync. Do not hand-edit files in `source/_posts`; changes are wiped on the next sync.
- Only files whose **first line is `---`** (Hexo front matter) are published; others are skipped as drafts. Posts with `published: false` in front matter are also skipped (e.g. WeChat-only articles).
- A `YYYYMMDD-` filename prefix is stripped to keep URLs clean.
- Images: `vault/images/` is copied into `source/images/` (additive copy, not a mirror — manually-managed images like the sidebar QR code survive), and `](images/…)` references are rewritten to `](/images/…)` so both Obsidian and the live site resolve them.
- Override the vault path with `BLOG_VAULT=/other/path npm run publish`.

## Deploy architecture

Hosted on Cloudflare **Workers** (Workers Builds, *not* Pages), Worker project name `blog`. Cloudflare builds from the `main` branch of `ChaoquanTao/Hexo` with **Build command `npx hexo generate`** and **Deploy command `npx wrangler deploy`**. `wrangler.jsonc` serves `./public` as static assets and binds the custom domain `singularities.cc`.

- The `deploy:` block in `_config.yml` (`hexo-deployer-git` → `ChaoquanTao.github.io`) is **legacy GitHub Pages and unused**. Do not run `hexo deploy` / `npm run deploy` for production, and never set Cloudflare's deploy command to `hexo deploy` (it fails with `hexo: not found`).

## Theme: singularity (custom, active)

The active theme is **`themes/singularity/`** (`theme: singularity` in `_config.yml`), a small hand-written EJS theme in a paper/ink reading style modeled on felixrieseberg.com. There's no build step: plain `source/css/main.css` and `source/js/main.js`.

- **Config:** `themes/singularity/_config.yml` (menu, homepage hero text, WeChat QR, Waline, Vercount). Pagination is off (`per_page: 0` in `_config.yml`) because the homepage lists every post grouped by year.
- **Helpers** live in `themes/singularity/scripts/helpers.js`:
  - `reading_time` strips svg/pre/figure/mjx before counting.
  - `strip_title_h1` drops a leading `# 标题` that duplicates the post title.
  - `singularity_svg` generates the homepage black-hole grid at build time.
- **Light/dark** is driven by CSS tokens on `:root`, with the dark palette applied both under `prefers-color-scheme` and `[data-theme="dark"]`. The toggle stores the choice in `localStorage.theme`.
- **Waline** uses `path = decodeURI(location.pathname)`, the same as volantis did, so existing comments and view counts still map. Keep it that way.
- **Mermaid** is loaded from unpkg in `main.js` only on pages that contain `pre.mermaid`.

The old **volantis** theme is still vendored in `themes/hexo-theme-volantis/` (with `_config.hexo-theme-volantis.yml` / `_config.volantis.yml` / `source/_volantis/`) for rollback only. Switching back means setting `theme: hexo-theme-volantis` and restoring `per_page: 10`. Never convert a theme to an npm dependency or git submodule: under Hexo 7.3 it fails to load from `node_modules` (blank site), and a submodule breaks Cloudflare's clone.

## Custom render filter

`scripts/mermaid-filter.js` (an `after_post_render` filter) rescues ```` ```mermaid ```` blocks that Hexo's highlighter mangles into `<figure class="highlight plaintext">`, converting them to `<pre class="mermaid">`. **It deliberately does NOT decode HTML entities** (`&lt;` etc. stay encoded) — mermaid.js runs its own entity decode, so decoding here would double-process. Preserve that behavior if editing.

## Comments

Comments use **Waline** (`comments.service: waline` in both theme configs). The Waline server is deployed separately on **Vercel + Neon Postgres** (Waline does not support a Cloudflare Workers backend). The blog config only needs `comments.waline.serverURL` pointing at that Vercel URL.
