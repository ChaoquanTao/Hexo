# Tau's Blog — 运维手册

个人博客,Hexo 生成,部署在 **Cloudflare Workers**,线上地址 **https://singularities.cc** 。
这份 README 是给未来的自己看的:**怎么写、怎么发、出问题怎么查**。

---

## 一、日常操作(最常用)

文章**只在 Obsidian vault 里写**:`/Users/tco1wx/blog`(它是独立 git 仓库 `ChaoquanTao/Blog`)。
Hexo 这个仓库**不要手写文章**,都靠脚本从 vault 同步过来。

```bash
# 1. 本地预览(同步 vault → source/_posts,然后起本地服务)
npm run sync
npx hexo server          # 打开 http://localhost:4000

# 2. 发布(同步 + 自动 commit + push → Cloudflare 自动部署)
npm run publish
```

发布后等 1~2 分钟,刷新 https://singularities.cc 即可。

### 写文章的规矩
- 文件放在 vault 顶层,文件名建议 `YYYYMMDD-标题.md`(同步时会自动去掉日期前缀,URL 干净)。
- **必须带 Hexo front matter**(文件首行是 `---`),否则会被当成草稿**跳过、不发布**:
  ```markdown
  ---
  title: 文章标题
  date: 2026-06-16 10:00:00
  tags: 标签
  categories: 分类
  ---
  正文...
  ```
- 想存草稿:不写 front matter 即可,留在 vault 里不会发出去。
- 图片放 vault 的 `images/` 目录,正文用相对路径引用:`![说明](images/xxx.svg)`。
  同步时会自动拷到 `source/images/` 并把引用改写成 `/images/xxx.svg`(Obsidian 和线上都能显示)。

### `npm run publish` 做了什么(`publish.sh`)
1. 以 vault 为**唯一来源**镜像同步 `*.md` → `source/_posts`(vault 删了文章,这边也删)。
2. 跳过没有 front matter 的草稿/笔记。
3. 去掉文件名的 `YYYYMMDD-` 前缀。
4. 同步 `images/` 目录,改写图片引用路径。
5. `git commit` + `git push origin main` → 触发 Cloudflare 构建部署。

> vault 路径可用环境变量覆盖:`BLOG_VAULT=/别的/路径 npm run publish`

---

## 二、部署架构(出问题前先了解)

| 项 | 值 |
|---|---|
| 托管 | Cloudflare **Workers**(Workers Builds,不是 Pages) |
| Worker 项目名 | `blog` |
| 自定义域名 | `singularities.cc`(zone 在本账号,`wrangler.jsonc` 里 `custom_domain`) |
| 备用域名 | `blog.taochq96.workers.dev`(公司代理会拦,平时别用) |
| 源码仓库 | `ChaoquanTao/Hexo`,从 `main` 分支构建 |
| 文章仓库 | `ChaoquanTao/Blog`(Obsidian vault) |
| 主题 | volantis,**实体文件 vendored 在 `themes/hexo-theme-volantis/`** |

### Cloudflare 后台构建配置(Settings → Builds)
| 字段 | 值 |
|---|---|
| Build command | `npx hexo generate` |
| Deploy command | `npx wrangler deploy` |
| Non-prod deploy | `npx wrangler versions upload`(默认) |

`wrangler.jsonc` 负责:把 `./public` 作为静态资源托管 + 绑定自定义域名。

---

## 三、千万别做的事(踩过的坑)

- ❌ **别**把 volantis 改回 npm 依赖或 git submodule。它在 Hexo 7.3 下无法从 node_modules 加载(会导致**全站空白页**),必须保持 `themes/` 里的实体文件。submodule 还会让 Cloudflare clone 报 `update repository submodules` 错。
- ❌ Cloudflare 的 Deploy command **别**写成 `hexo deploy`(那是推到旧 GitHub Pages 的,会报 `hexo: not found`)。
- ❌ 命令行**别**直接敲 `hexo`(没全局安装),用 `npx hexo ...` 或 `npm run ...`。

---

## 四、常见问题速查

- **改了文章但线上没更新?** → 确认跑的是 `npm run publish`(不是只 `sync`);看 Cloudflare 后台部署日志。
- **某篇文章没发出来?** → 多半是缺 front matter 被当草稿跳过了(`npm run sync` 会打印"跳过"列表)。
- **图片不显示?** → 本地图放 vault `images/`、用 `![](images/xxx)` 引用;外链图(sinaimg/csdn 等)失效是图床问题,与本仓库无关。两篇 Netty 老文里 `<img src="/Users/chaoquantao/...typora...">` 是早就坏的本地路径,需手动换图。
- **公司内网打不开 `singularities.cc`?** → 多为浏览器/DNS 缓存,开无痕窗口试;新域名也可能被企业代理临时归类拦截,等几天或找 IT 申诉。

---

## 五、本地常用命令

```bash
npm run sync       # 仅同步 vault → source/_posts(+images)
npm run publish    # 同步 + 提交 + 推送(发布)
npx hexo server    # 本地预览 http://localhost:4000
npx hexo clean     # 清掉 db.json 和 public/
npx hexo generate  # 只生成 public/(一般不用手动跑)
```
