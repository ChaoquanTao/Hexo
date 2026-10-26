'use strict';

// 阅读时长：中文按 400 字/分钟，英文单词按 220 词/分钟
hexo.extend.helper.register('reading_time', function (html) {
  const text = String(html || '')
    .replace(/<(pre|svg|mjx-container|figure|style|script)\b[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const words = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  return Math.max(1, Math.ceil(cjk / 400 + words / 220));
});

// 按年份分组（posts 已按日期倒序）
hexo.extend.helper.register('group_by_year', function (posts) {
  const groups = [];
  posts.forEach(function (post) {
    const year = post.date.year();
    const last = groups[groups.length - 1];
    if (last && last.year === year) last.posts.push(post);
    else groups.push({ year: year, posts: [post] });
  });
  return groups;
});

// 首页题图：一张被「奇点」弯曲的时空网格。构建时生成，纯 SVG，颜色跟随主题变量。
hexo.extend.helper.register('singularity_svg', function () {
  const W = 1200, H = 440, cx = 760, cy = 220;
  const step = 30, sample = 8;
  // 点被拉向中心：位移 = 距离 × k / (1 + (r/s)^2)，越近越弯，但不会越过中心
  const warp = function (x, y) {
    const dx = x - cx, dy = y - cy;
    const r = Math.sqrt(dx * dx + dy * dy) || 1e-6;
    const pull = 0.9 / (1 + Math.pow(r / 95, 1.35));
    return [cx + dx * (1 - pull), cy + dy * (1 - pull)];
  };
  const fmt = function (n) { return Math.round(n * 10) / 10; };
  const line = function (pts) {
    return 'M' + pts.map(function (p) { return fmt(p[0]) + ' ' + fmt(p[1]); }).join('L');
  };
  const paths = [];
  for (let y = -step; y <= H + step; y += step) {
    const pts = [];
    for (let x = -step; x <= W + step; x += sample) pts.push(warp(x, y));
    paths.push(line(pts));
  }
  for (let x = cx % step - step; x <= W + step; x += step) {
    const pts = [];
    for (let y = -step; y <= H + step; y += sample) pts.push(warp(x, y));
    paths.push(line(pts));
  }
  return '<svg class="sg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid slice" role="img" aria-label="被奇点弯曲的时空网格">' +
    '<defs><radialGradient id="sg-fade" cx="' + (cx / W) + '" cy="0.5" r="0.75">' +
    '<stop offset="0" stop-color="#fff"/><stop offset="0.55" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></radialGradient>' +
    '<mask id="sg-mask"><rect width="' + W + '" height="' + H + '" fill="url(#sg-fade)"/></mask></defs>' +
    '<g class="sg-grid" mask="url(#sg-mask)"><path d="' + paths.join('') + '"/></g>' +
    '<g class="sg-core" transform="translate(' + cx + ' ' + cy + ')">' +
    '<ellipse class="sg-disk" rx="74" ry="15"/>' +
    '<circle class="sg-ring" r="27"/>' +
    '<circle class="sg-hole" r="19"/>' +
    '<circle class="sg-moon" r="3.2" transform="translate(66 0)"/>' +
    '</g></svg>';
});

// 正文开头若有一个与标题相同的 h1（Obsidian 里常见的「# 标题」），去掉它，避免标题重复、目录多一级
hexo.extend.helper.register('strip_title_h1', function (html, title) {
  const norm = function (s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, '').trim(); };
  return String(html || '').replace(/^\s*<h1\b[^>]*>([\s\S]*?)<\/h1>\s*/, function (m, inner) {
    return norm(inner) === norm(title) ? '' : m;
  });
});
