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
- Only files whose **first line is `---`** (Hexo front matter) are published; others are skipped as drafts.
- A `YYYYMMDD-` filename prefix is stripped to keep URLs clean.
- Images: `vault/images/` is copied into `source/images/` (additive copy, not a mirror — manually-managed images like the sidebar QR code survive), and `](images/…)` references are rewritten to `](/images/…)` so both Obsidian and the live site resolve them.
- Override the vault path with `BLOG_VAULT=/other/path npm run publish`.

## Deploy architecture

Hosted on Cloudflare **Workers** (Workers Builds, *not* Pages), Worker project name `blog`. Cloudflare builds from the `main` branch of `ChaoquanTao/Hexo` with **Build command `npx hexo generate`** and **Deploy command `npx wrangler deploy`**. `wrangler.jsonc` serves `./public` as static assets and binds the custom domain `singularities.cc`.

- The `deploy:` block in `_config.yml` (`hexo-deployer-git` → `ChaoquanTao.github.io`) is **legacy GitHub Pages and unused**. Do not run `hexo deploy` / `npm run deploy` for production, and never set Cloudflare's deploy command to `hexo deploy` (it fails with `hexo: not found`).

## Theme: vendored volantis

The volantis theme is **vendored as real files in `themes/hexo-theme-volantis/`** and must stay that way. Do **not** convert it to an npm dependency or git submodule — under Hexo 7.3 it fails to load from `node_modules` (blank site), and a submodule breaks Cloudflare's clone.

**Theme config is duplicated across two files:** `_config.hexo-theme-volantis.yml` (the active one, since `theme: hexo-theme-volantis` in `_config.yml`) and `_config.volantis.yml` (a kept-in-sync duplicate). When changing theme settings, edit **both** to keep them identical.

**Customize without editing theme source** via convention files under `source/_volantis/` (see `themes/hexo-theme-volantis/scripts/helpers/custom-files.js`):
- `style.styl` — `@import`ed *after* the theme's own styles, so it overrides defaults (also `first.styl` / `dark.styl` / `darkVar.styl`).
- View injection points `headBegin/headEnd/header/side/topMeta/bottomMeta/footer/postEnd/bodyBegin/bodyEnd` → `source/_volantis/<point>.ejs`.

## Custom render filter

`scripts/mermaid-filter.js` (an `after_post_render` filter) rescues ```` ```mermaid ```` blocks that Hexo's highlighter mangles into `<figure class="highlight plaintext">`, converting them to `<pre class="mermaid">`. **It deliberately does NOT decode HTML entities** (`&lt;` etc. stay encoded) — mermaid.js runs its own entity decode, so decoding here would double-process. Preserve that behavior if editing.

## Comments

Comments use **Waline** (`comments.service: waline` in both theme configs). The Waline server is deployed separately on **Vercel + Neon Postgres** (Waline does not support a Cloudflare Workers backend). The blog config only needs `comments.waline.serverURL` pointing at that Vercel URL.
