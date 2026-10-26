(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, el) { return (el || d).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  };
  var loadScript = function (src) {
    return new Promise(function (resolve, reject) {
      var s = d.createElement('script'); s.src = src; s.onload = resolve; s.onerror = reject; d.head.appendChild(s);
    });
  };
  var loadCss = function (href) {
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = href; d.head.appendChild(l);
  };
  var isDark = function () {
    var t = root.dataset.theme;
    return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  /* 明暗模式：跟随系统 → 浅色 → 深色 */
  var toggle = $('#theme-toggle');
  var labels = { auto: '跟随系统', light: '浅色', dark: '深色' };
  var paint = function (mode) {
    if (mode === 'auto') delete root.dataset.theme; else root.dataset.theme = mode;
    if (toggle) { toggle.dataset.mode = mode; toggle.setAttribute('aria-label', '明暗模式：' + labels[mode]); }
  };
  paint(store.get('theme') || 'auto');
  if (toggle) toggle.addEventListener('click', function () {
    var next = { auto: 'light', light: 'dark', dark: 'auto' }[toggle.dataset.mode || 'auto'];
    store.set('theme', next === 'auto' ? null : next);
    paint(next);
    d.dispatchEvent(new CustomEvent('themechange'));
  });

  /* 首页 / 归档：展开更早的年份 */
  $$('[data-show-older]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('[data-older]').forEach(function (el) { el.hidden = false; });
      b.parentNode.remove();
    });
  });

  /* 文章页：顶部阅读条 + 进度 */
  var strip = $('#strip'), content = $('#content');
  if (strip && content) {
    var bar = $('#bar'), pct = $('#pct'), head = $('.phead'), ticking = false;
    var update = function () {
      ticking = false;
      var r = content.getBoundingClientRect();
      var total = r.height - window.innerHeight * 0.6;
      var p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
      bar.style.width = (p * 100).toFixed(1) + '%';
      pct.textContent = Math.round(p * 100) + '%';
      var on = head.getBoundingClientRect().bottom < 0;
      strip.classList.toggle('on', on);
      strip.setAttribute('aria-hidden', on ? 'false' : 'true');
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* 目录：高亮当前小节 */
  var tocLinks = $$('#toc a');
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {};
    tocLinks.forEach(function (a) {
      var id = decodeURIComponent((a.getAttribute('href') || '').slice(1));
      if (id) byId[id] = a;
    });
    var heads = $$('.content h1[id], .content h2[id], .content h3[id]').filter(function (h) { return byId[h.id]; });
    var current = null;
    var mark = function (h) {
      if (current) current.classList.remove('on');
      current = byId[h.id]; current.classList.add('on');
    };
    var io = new IntersectionObserver(function () {
      var last = null;
      heads.forEach(function (h) { if (h.getBoundingClientRect().top < 120) last = h; });
      if (last) mark(last); else if (current) { current.classList.remove('on'); current = null; }
    }, { rootMargin: '0px 0px -60% 0px', threshold: [0, 1] });
    heads.forEach(function (h) { io.observe(h); });
  }

  /* 标题自带「一、」「1.」之类编号时，不再叠加自动编号 */
  if (content && $$('h2', content).some(function (h) { return /^\s*([一二三四五六七八九十]+[、.．]|\d+(\.\d+)*[、.．\s])/.test(h.textContent); })) {
    content.classList.add('self-numbered');
  }

  /* 代码块：语言标签 + 复制 */
  $$('.content figure.highlight').forEach(function (fig) {
    var lang = (fig.className.split(/\s+/)[1] || '').replace(/^(plaintext|plain|text)$/, '');
    var barEl = d.createElement('div');
    barEl.className = 'code-bar';
    barEl.innerHTML = '<span></span><button type="button">复制</button>';
    barEl.firstChild.textContent = lang;
    fig.insertBefore(barEl, fig.firstChild);
    var btn = barEl.lastChild;
    btn.addEventListener('click', function () {
      var code = $('td.code pre', fig) || $('pre', fig);
      var text = $$('.line', code).map(function (l) { return l.textContent; }).join('\n') || code.textContent;
      navigator.clipboard.writeText(text).then(function () {
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = '复制'; }, 1600);
      }, function () { btn.textContent = '复制失败'; });
    });
  });

  /* mermaid：只在有图的页面加载 */
  var diagrams = $$('pre.mermaid');
  var mermaidSrc = $$('pre.mermaid').map(function (el) { return el.innerHTML; });
  var renderMermaid = function () {
    diagrams.forEach(function (el, i) { el.removeAttribute('data-processed'); el.innerHTML = mermaidSrc[i]; });
    window.mermaid.initialize({ startOnLoad: false, theme: isDark() ? 'dark' : 'neutral', fontFamily: 'Fira Sans, PingFang SC, Microsoft YaHei, sans-serif', securityLevel: 'strict' });
    window.mermaid.run({ nodes: diagrams });
  };
  if (diagrams.length) {
    loadScript('https://unpkg.com/mermaid@10.9.1/dist/mermaid.min.js').then(function () {
      renderMermaid();
      d.addEventListener('themechange', renderMermaid);
    }, function () {});
  }

  /* Waline 评论 + 浏览量 */
  var wl = $('#waline');
  if (wl) {
    var cfg = JSON.parse(wl.dataset.config);
    var path = decodeURI(location.pathname);
    $$('.waline-pageview-count').forEach(function (el) { el.dataset.path = path; });
    var start = function () {
      loadCss(cfg.css);
      loadScript(cfg.js).then(function () {
        wl.innerHTML = '';
        window.Waline.init({
          el: '#waline', serverURL: cfg.serverURL, path: path,
          meta: cfg.meta, requiredMeta: cfg.requiredMeta,
          pageview: true, comment: true,
          locale: { placeholder: cfg.placeholder }
        });
      }, function () { wl.innerHTML = '<p class="loading">评论加载失败，请稍后刷新重试。</p>'; });
    };
    // 进入视口附近再加载，首屏不被评论脚本拖慢；但浏览量要在首屏就计数，所以最多等 2.5 秒
    var started = false;
    var go = function () { if (!started) { started = true; start(); } };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { ob.disconnect(); go(); } }, { rootMargin: '600px' }).observe(wl);
      setTimeout(go, 2500);
    } else go();
  }

  /* 搜索：/ 打开，读取 hexo-generator-json-content 生成的 content.json */
  var dlg = $('#search'), input = $('#search-q'), res = $('#search-res'), hint = $('#search-hint');
  if (dlg && typeof dlg.showModal === 'function') {
    var index = null, sel = -1;
    var esc = function (s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var hl = function (s, q) {
      var i = s.toLowerCase().indexOf(q);
      return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + q.length)) + '</mark>' + esc(s.slice(i + q.length));
    };
    var load = function () {
      if (index) return Promise.resolve(index);
      return fetch(dlg.dataset.src).then(function (r) { return r.json(); }).then(function (j) {
        index = (j.posts || j).map(function (p) {
          return { title: p.title || '', path: '/' + (p.path || '').replace(/^\//, ''), text: (p.text || '').replace(/\s+/g, ' '), date: p.date };
        });
        return index;
      });
    };
    var pick = function (i) {
      var items = $$('a', res);
      if (!items.length) return;
      sel = (i + items.length) % items.length;
      items.forEach(function (a, k) { a.setAttribute('aria-selected', k === sel ? 'true' : 'false'); });
      items[sel].scrollIntoView({ block: 'nearest' });
    };
    var run = function () {
      var q = input.value.trim().toLowerCase();
      sel = -1;
      if (!q) { res.innerHTML = ''; hint.textContent = '输入关键词开始搜索 · ↑ ↓ 选择 · ↵ 打开'; return; }
      load().then(function (list) {
        var hits = [];
        list.forEach(function (p) {
          var inTitle = p.title.toLowerCase().indexOf(q), inText = p.text.toLowerCase().indexOf(q);
          if (inTitle < 0 && inText < 0) return;
          var from = Math.max(0, inText - 24);
          var snip = inText < 0 ? p.text.slice(0, 80) : (from ? '…' : '') + p.text.slice(from, inText + 80);
          hits.push({ p: p, score: (inTitle >= 0 ? 0 : 1), snip: snip });
        });
        hits.sort(function (a, b) { return a.score - b.score || (b.p.date > a.p.date ? 1 : -1); });
        res.innerHTML = hits.slice(0, 30).map(function (h) {
          return '<li><a href="' + esc(h.p.path) + '" aria-selected="false"><span class="st">' + hl(h.p.title, q) + '</span><span class="sd">' + hl(h.snip, q) + '</span></a></li>';
        }).join('');
        hint.textContent = hits.length ? '找到 ' + hits.length + ' 篇 · ↑ ↓ 选择 · ↵ 打开' : '没有找到相关文章';
        if (hits.length) pick(0);
      }, function () { hint.textContent = '索引加载失败'; });
    };
    var open = function () { dlg.showModal(); input.select(); load(); };
    $('#search-open').addEventListener('click', open);
    input.addEventListener('input', run);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pick(sel + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pick(sel - 1); }
      else if (e.key === 'Enter') { var a = $$('a', res)[sel]; if (a) { e.preventDefault(); location.href = a.href; } }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === '/' && !dlg.open && !/^(INPUT|TEXTAREA|SELECT)$/.test(d.activeElement.tagName) && !d.activeElement.isContentEditable) {
        e.preventDefault(); open();
      }
    });
  } else if ($('#search-open')) {
    $('#search-open').hidden = true;
  }
})();
