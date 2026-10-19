// Cloudflare Pages Functions：访问统计
// - POST /api/track  记录一次浏览（action: view）或一次下载点击（action: click）
// - GET  /api/stats  返回所有游戏的统计数据
//
// 需要给 Pages 项目绑定名为 GAME_STATS 的 KV 命名空间（见 README.md）。
// 未绑定时接口返回 { ok: false }，前端会自动隐藏统计信息，不影响其他功能。

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json;charset=utf-8', 'cache-control': 'no-store' },
  });

export async function onRequestPost(context) {
  const url = new URL(context.request.url);
  if (url.pathname !== '/api/track') return context.next();

  const kv = context.env && context.env.GAME_STATS;
  if (!kv) return json({ ok: false, reason: 'no-kv' });

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

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  if (url.pathname !== '/api/stats') return context.next();

  const kv = context.env && context.env.GAME_STATS;
  if (!kv) return json({ ok: false, reason: 'no-kv' });

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
