// Cloudflare Pages Functions：访问统计 + 游戏心愿单
// - POST /api/track            记录一次浏览（view）或下载点击（click）
// - GET  /api/stats            返回所有游戏的统计数据
// - POST /api/suggest          访客提交心愿单（带简单限流：每 IP 10 分钟 5 条）
// - GET  /api/suggestions      管理端查询心愿单（?key=管理密码）
// - POST /api/suggest-delete   管理端删除心愿单（?key=管理密码）
//
// 需要给 Pages 项目绑定名为 GAME_STATS 的 KV 命名空间。
// 未绑定时接口返回 { ok: false }，前端会自动降级，不影响其他功能。

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' },
  });

async function checkAdmin(kv, key) {
  if (!key) return false;
  const real = await kv.get('admin:suggest-key');
  return !!real && key === real;
}

async function checkRateLimit(kv, ip, now) {
  const key = 'rl:' + ip;
  let rec = { t: 0, n: 0 };
  try {
    const raw = await kv.get(key);
    if (raw) rec = JSON.parse(raw);
  } catch (e) {}
  if (now - rec.t > 600000) rec = { t: now, n: 0 };
  rec.n += 1;
  await kv.put(key, JSON.stringify(rec));
  return rec.n <= 5;
}

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const kv = context.env && context.env.GAME_STATS;
  if (!kv) return json({ ok: false, reason: 'no-kv' });

  if (path === '/api/track') {
    let body = {};
    try { body = await context.request.json(); } catch (e) {}
    const game = String(body.game || '').slice(0, 120);
    if (!game) return json({ ok: false, reason: 'bad-request' });

    const action = body.action === 'view' ? 'view' : 'click';
    const link = String(body.link || '').slice(0, 60) || 'total';

    const key = 'g:' + game;
    let data = { views: 0, clicks: { total: 0 }, last: '' };
    try {
      const raw = await kv.get(key);
      if (raw) data = JSON.parse(raw);
    } catch (e) {}

    if (action === 'view') {
      data.views = (data.views || 0) + 1;
    } else {
      data.clicks = data.clicks || { total: 0 };
      data.clicks.total = (data.clicks.total || 0) + 1;
      data.clicks[link] = (data.clicks[link] || 0) + 1;
    }
    data.last = new Date().toISOString();

    await kv.put(key, JSON.stringify(data));
    return json({ ok: true });
  }

  if (path === '/api/suggest') {
    let body = {};
    try { body = await context.request.json(); } catch (e) {}
    const game = String(body.game || '').trim().slice(0, 100);
    const note = String(body.note || '').trim().slice(0, 1000);
    const contact = String(body.contact || '').trim().slice(0, 100);
    if (!game) return json({ ok: false, reason: 'empty-game' });

    const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
    if (!(await checkRateLimit(kv, ip, Date.now()))) {
      return json({ ok: false, reason: 'rate-limited' }, 429);
    }

    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    await kv.put('s:' + id, JSON.stringify({ game, note, contact, time: new Date().toISOString() }));
    return json({ ok: true });
  }

  if (path === '/api/suggest-delete') {
    if (!(await checkAdmin(kv, url.searchParams.get('key') || ''))) {
      return json({ ok: false, reason: 'bad-key' }, 403);
    }
    let body = {};
    try { body = await context.request.json(); } catch (e) {}
    const id = String(body.id || '');
    if (!id.startsWith('s:') || id.length > 60) return json({ ok: false, reason: 'bad-id' });
    await kv.delete(id);
    return json({ ok: true });
  }

  return context.next();
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const kv = context.env && context.env.GAME_STATS;
  if (!kv) return json({ ok: false, reason: 'no-kv' });

  if (path === '/api/stats') {
    const out = {};
    let cursor;
    do {
      const list = await kv.list({ prefix: 'g:', limit: 1000, cursor });
      await Promise.all(
        list.keys.map(async (k) => {
          try {
            const v = await kv.get(k.name);
            if (v) out[k.name.slice(2)] = JSON.parse(v);
          } catch (e) {}
        })
      );
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
    return json(out);
  }

  if (path === '/api/suggestions') {
    if (!(await checkAdmin(kv, url.searchParams.get('key') || ''))) {
      return json({ ok: false, reason: 'bad-key' }, 403);
    }
    const out = [];
    let cursor;
    do {
      const list = await kv.list({ prefix: 's:', limit: 500, cursor });
      await Promise.all(
        list.keys.map(async (k) => {
          try {
            const v = await kv.get(k.name);
            if (v) out.push({ id: k.name, ...JSON.parse(v) });
          } catch (e) {}
        })
      );
      cursor = list.list_complete ? undefined : list.cursor;
    } while (cursor);
    out.sort((a, b) => (b.time || '').localeCompare(a.time || ''));
    return json({ ok: true, items: out });
  }

  return context.next();
}
