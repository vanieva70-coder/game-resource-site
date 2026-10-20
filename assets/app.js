'use strict';

/* ============ 工具函数 ============ */
const $ = (sel) => document.querySelector(sel);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const PROVIDER_COLORS = {
  baidu: '#0e83ff', quark: '#00c07b', aliyun: '#ff6a00', xunlei: '#2f6bff',
  '123': '#3b6fff', lanzou: '#4f9cff', tianyi: '#00a3ff', weiyun: '#2fb3ff',
  onedrive: '#0078d4', mega: '#d9272e', google: '#4285f4', telegram: '#2aabee',
};
const providerColor = (t) => PROVIDER_COLORS[t] || '#7c5cff';

/* ============ 全局状态 ============ */
const state = {
  site: {}, games: [], search: '', category: 'all',
  tags: new Set(), sort: 'new', stats: null, current: null,
};

/* ============ 初始化 ============ */
async function init() {
  let data;
  try {
    const res = await fetch('data/games.json');
    if (!res.ok) throw new Error(res.status);
    data = await res.json();
  } catch (e) {
    $('#list-view').innerHTML =
      '<div class="empty-state"><div class="empty-icon">⚠️</div><p>无法加载数据文件 data/games.json</p>' +
      '<p class="empty-sub">请通过本地服务器访问（如 python -m http.server），或检查文件是否存在。</p></div>';
    return;
  }
  state.site = data.site || {};
  state.games = Array.isArray(data.games) ? data.games : [];

  applySiteMeta();
  buildChips();
  bindEvents();

  window.addEventListener('hashchange', route);
  route();
  loadStats().then(() => { if (state.stats) route(); }); // 拿到统计后刷新计数
}

/* ============ 站点元信息 ============ */
function applySiteMeta() {
  const name = state.site.name || '游戏资源站';
  $('#brand-name').textContent = name;
  $('#site-name').textContent = name;
  $('#site-desc').textContent = state.site.description || '';
  $('#footer-text').textContent = state.site.footer || '';
  document.title = name;

  const totalLinks = state.games.reduce((n, g) => n + (g.links || []).length, 0);
  const cats = new Set(state.games.map((g) => g.category).filter(Boolean));
  $('#hero-stats').innerHTML =
    `<span>${state.games.length} 款游戏</span><span>${totalLinks} 条网盘链接</span><span>${cats.size} 个分类</span>`;

  if (state.site.announcement) {
    const el = $('#announcement');
    el.innerHTML =
      `<span class="announcement-text">${esc(state.site.announcement)}</span>` +
      '<button class="announcement-close" title="关闭">✕</button>';
    el.hidden = sessionStorage.getItem('ann-closed') === '1';
    el.querySelector('.announcement-close').addEventListener('click', () => {
      el.hidden = true;
      sessionStorage.setItem('ann-closed', '1');
    });
  }
}

/* ============ 筛选条件（自动从数据生成） ============ */
function buildChips() {
  const catChips = $('#category-chips');
  const cats = [];
  for (const g of state.games) if (g.category && !cats.includes(g.category)) cats.push(g.category);
  catChips.innerHTML =
    '<button class="chip active" data-cat="all">全部</button>' +
    cats.map((c) => `<button class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('');

  const tagChips = $('#tag-chips');
  const tags = [];
  for (const g of state.games) for (const t of g.tags || []) if (t && !tags.includes(t)) tags.push(t);
  tagChips.innerHTML = tags.map((t) => `<button class="chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('');
}

/* ============ 事件绑定 ============ */
function bindEvents() {
  let debounce;
  $('#search-input').addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.search = e.target.value; renderList(); }, 120);
  });
  $('#sort-select').addEventListener('change', (e) => { state.sort = e.target.value; renderList(); });

  $('#category-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    state.category = b.dataset.cat;
    document.querySelectorAll('#category-chips .chip').forEach((c) => c.classList.toggle('active', c === b));
    renderList();
  });
  $('#tag-chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tag]');
    if (!b) return;
    const t = b.dataset.tag;
    if (state.tags.has(t)) state.tags.delete(t); else state.tags.add(t);
    b.classList.toggle('active');
    renderList();
  });

  $('#main').addEventListener('click', onMainClick);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox(); });
}

function onMainClick(e) {
  const dl = e.target.closest('[data-download]');
  if (dl) { track('click', state.current && state.current.id || '', dl.dataset.link || ''); return; }
  const cp = e.target.closest('[data-copy]');
  if (cp) { e.preventDefault(); copyText(cp.dataset.copy || '', cp); }
  const sh = e.target.closest('[data-shot]');
  if (sh) openLightbox(sh.dataset.shot);
}

/* ============ 列表筛选与渲染 ============ */
function filteredGames() {
  const q = state.search.trim().toLowerCase();
  let list = state.games.filter((g) => {
    const inCat = state.category === 'all' || g.category === state.category;
    const inTags = state.tags.size === 0 || [...state.tags].every((t) => (g.tags || []).includes(t));
    const hay = [g.title, g.originalTitle, g.category, g.description, g.publisher, (g.tags || []).join(' ')].join(' ').toLowerCase();
    const inQ = !q || hay.includes(q);
    return inCat && inTags && inQ;
  });
  list = [...list].sort((a, b) =>
    state.sort === 'name' ? a.title.localeCompare(b.title, 'zh') : (b.addedAt || '').localeCompare(a.addedAt || ''));
  return list;
}

function cardHtml(g) {
  const st = state.stats && state.stats[g.id];
  const links = (g.links || []).map((l) => `<span class="mini-badge" style="--c:${providerColor(l.type)}">${esc(l.name)}</span>`).join('');
  return `<article class="game-card">
    <a href="#/game/${encodeURIComponent(g.id)}" class="card-cover">
      <img src="${esc(g.cover)}" alt="${esc(g.title)}" loading="lazy">
      ${g.featured ? '<span class="featured-badge">🔥 推荐</span>' : ''}
    </a>
    <div class="card-body">
      <div class="card-top"><span class="cat-chip">${esc(g.category || '')}</span><span class="card-meta">${esc(g.version || '')}</span></div>
      <a class="card-title" href="#/game/${encodeURIComponent(g.id)}">${esc(g.title)}</a>
      ${g.originalTitle ? `<p class="card-sub">${esc(g.originalTitle)}</p>` : ''}
      <div class="card-tags">${(g.tags || []).slice(0, 3).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join('')}</div>
      <div class="card-bottom">
        <div class="mini-badges">${links}</div>
        ${st ? `<span class="card-count" title="下载次数">⬇ ${(st.clicks && st.clicks.total) || 0}</span>` : ''}
      </div>
    </div>
  </article>`;
}

function renderList() {
  $('#detail-view').hidden = true;
  $('#list-view').hidden = false;
  const list = filteredGames();
  $('#game-grid').innerHTML = list.map(cardHtml).join('');
  $('#result-count').textContent = `共 ${list.length} 款游戏`;
  $('#empty-state').hidden = list.length > 0;
  document.title = state.site.name || '游戏资源站';
}

/* ============ 详情页 ============ */
function renderDetail(id) {
  const g = state.games.find((x) => x.id === id);
  if (!g) { renderList(); return; }
  state.current = g;
  document.title = `${g.title} - ${state.site.name || '游戏资源站'}`;
  $('#list-view').hidden = true;
  const dv = $('#detail-view');
  dv.hidden = false;

  const st = state.stats && state.stats[g.id];
  const info = [];
  if (g.version) info.push(['版本', g.version]);
  if (g.size) info.push(['大小', g.size]);
  if (g.platform) info.push(['平台', g.platform.join(' / ')]);
  if (g.language) info.push(['语言', g.language]);
  if (g.publisher) info.push(['开发商', g.publisher]);
  if (g.releaseDate) info.push(['发售日期', g.releaseDate]);

  const links = (g.links || []).map((l) => {
    const lc = (st && st.clicks && st.clicks[l.name]) || 0;
    const copyAll = l.url + (l.code ? `，提取码：${l.code}` : '');
    return `<div class="link-card">
      <span class="link-dot" style="background:${providerColor(l.type)}"></span>
      <div class="link-info">
        <div class="link-name">${esc(l.name)}</div>
        ${l.code ? `<div class="link-code">提取码 <code>${esc(l.code)}</code> <button class="btn-mini" data-copy="${esc(l.code)}">复制</button></div>` : ''}
      </div>
      <div class="link-actions">
        ${lc ? `<span class="link-count">已下载 ${lc} 次</span>` : ''}
        <button class="btn btn-ghost" data-copy="${esc(copyAll)}">复制链接+提取码</button>
        <a class="btn btn-primary" href="${esc(l.url)}" target="_blank" rel="noopener nofollow" data-download data-link="${esc(l.name)}">打开网盘 ↗</a>
      </div>
    </div>`;
  }).join('');

  const shots = (g.screenshots || []).length
    ? `<h3 class="section-title">游戏截图</h3><div class="shots">${g.screenshots.map((s) => `<button class="shot" data-shot="${esc(s)}"><img src="${esc(s)}" alt="游戏截图" loading="lazy"></button>`).join('')}</div>`
    : '';
  const related = state.games.filter((x) => x.id !== g.id && x.category === g.category).slice(0, 4);

  dv.innerHTML = `
    <div class="detail-head"><a class="back-btn" href="#/">← 返回列表</a></div>
    <div class="detail-grid">
      <div class="detail-cover">
        <img src="${esc(g.cover)}" alt="${esc(g.title)}">
        ${g.featured ? '<span class="featured-badge">🔥 推荐</span>' : ''}
      </div>
      <div class="detail-info">
        <h2 class="detail-title">${esc(g.title)}</h2>
        ${g.originalTitle ? `<p class="detail-sub">${esc(g.originalTitle)}</p>` : ''}
        <div class="detail-meta-line">
          <span class="cat-chip">${esc(g.category || '')}</span>
          ${(g.tags || []).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join('')}
        </div>
        ${st ? `<div class="detail-stats"><span>👁 浏览 ${st.views || 0}</span><span>⬇ 下载 ${(st.clicks && st.clicks.total) || 0}</span></div>` : ''}
        ${g.description ? `<p class="detail-desc">${esc(g.description)}</p>` : ''}
        <div class="info-grid">${info.map(([k, v]) => `<div class="info-item"><span class="info-key">${k}</span><span class="info-val">${esc(v)}</span></div>`).join('')}</div>
      </div>
    </div>
    ${g.note ? `<div class="note-box">📌 ${esc(g.note)}</div>` : ''}
    ${g.buyUrl ? `<div class="buy-box">
      <span class="buy-icon">🛒</span>
      <div class="buy-text">
        <div class="buy-title">支持正版</div>
        <div class="buy-sub">喜欢这款游戏？去官方商店购买正版，支持开发者做出更好的作品</div>
      </div>
      <a class="btn btn-buy" href="${esc(g.buyUrl)}" target="_blank" rel="noopener nofollow">前往购买正版 ↗</a>
    </div>` : ''}
    <h3 class="section-title">下载链接</h3>
    <div class="link-list">${links || '<p class="empty-sub">暂无下载链接</p>'}</div>
    ${shots}
    ${related.length ? `<h3 class="section-title">同类推荐</h3><div class="game-grid related-grid">${related.map(cardHtml).join('')}</div>` : ''}
  `;
  window.scrollTo({ top: 0 });
  track('view', g.id);
}

/* ============ 路由 ============ */
function route() {
  const h = location.hash;
  if (h.startsWith('#/game/')) renderDetail(decodeURIComponent(h.slice(7)));
  else renderList();
}

/* ============ 访问统计（Cloudflare Pages Functions + KV） ============ */
async function loadStats() {
  try {
    const res = await fetch('/api/stats', { cache: 'no-store' });
    if (!res.ok) return;
    const j = await res.json();
    if (j && typeof j === 'object' && !Array.isArray(j) && j.ok !== false) state.stats = j;
  } catch (e) { /* 统计不可用时静默降级 */ }
}

function track(action, gameId, linkName) {
  if (!gameId) return;
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, game: gameId, link: linkName || '' }),
      keepalive: true,
    });
  } catch (e) { /* 忽略 */ }
}

/* ============ 复制到剪贴板 ============ */
function copyText(text, el) {
  const done = () => {
    const old = el.textContent;
    el.textContent = '已复制 ✓';
    el.classList.add('copied');
    setTimeout(() => { el.textContent = old; el.classList.remove('copied'); }, 1600);
  };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); done(); } catch (e) {}
  document.body.removeChild(ta);
}

/* ============ 截图灯箱 ============ */
function openLightbox(src) {
  let lb = document.getElementById('lightbox');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightbox';
    lb.innerHTML = '<img alt="">';
    lb.addEventListener('click', () => lb.classList.remove('show'));
    document.body.appendChild(lb);
  }
  lb.querySelector('img').src = src;
  requestAnimationFrame(() => lb.classList.add('show'));
}

function closeLightbox() {
  const lb = document.getElementById('lightbox');
  if (lb) lb.classList.remove('show');
}

init();
