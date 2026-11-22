/**
 * Egern 响应脚本：拦截 one.google.com 的 POST 响应，
 * 把响应体里的两组域名做字符串替换。
 *
 * 参数（可选，模块 env 覆盖）：
 *   ONLY_POST      "true"(默认) / "false"  只处理 POST
 *   PAIRS          "30tb.ai.pro.m=>30tb.m;20tb.m.v2=>20tb.m"
 *                  （分号分隔多组，=> 分隔新旧；留空用下方默认值）
 *   STRICT_BOUNDARY "true" / "false"(默认)  开启后按「不粘连」边界替换，
 *                  避免 20tb.m 误伤 20tb.m.v2 / 30tb.m 误伤 30tb.m.v3 之类的变体
 *
 * 日志：ctx.storage 里记录最近一次命中记录，键名 one-google-replace.last
 */

const DEFAULT_PAIRS = [
  ['30tb.ai.pro.m', '30tb.m'],
  ['20tb.m.v2', '20tb.m'],
];

function parsePairs(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return DEFAULT_PAIRS;
  const out = [];
  for (const part of raw.split(/[;；\n]/)) {
    const seg = part.trim();
    if (!seg) continue;
    const idx = seg.indexOf('=>');
    if (idx === -1) continue;
    const from = seg.slice(0, idx).trim();
    const to = seg.slice(idx + 2).trim();
    if (from && from !== to) out.push([from, to]);
  }
  return out.length ? out : DEFAULT_PAIRS;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceAll(text, from, to, strict) {
  if (!text.includes(from)) return { text, count: 0 };
  if (!strict) {
    const parts = text.split(from);
    return { text: parts.join(to), count: parts.length - 1 };
  }
  // 严格模式：前后不能紧挨 [A-Za-z0-9._-]，避免连到更长的变体域名
  const re = new RegExp('(?<![A-Za-z0-9._-])' + escapeRe(from) + '(?![A-Za-z0-9._-])', 'g');
  let count = 0;
  const replaced = text.replace(re, () => {
    count += 1;
    return to;
  });
  return { text: replaced, count };
}

function truthy(v, def) {
  if (v === undefined || v === null || v === '') return def;
  return String(v).toLowerCase() === 'true';
}

export default async function (ctx) {
  const env = ctx.env || {};
  const onlyPost = truthy(env.ONLY_POST, true);
  const strict = truthy(env.STRICT_BOUNDARY, false);
  const method = ((ctx.request && ctx.request.method) || 'GET').toUpperCase();

  if (onlyPost && method !== 'POST') return;

  const resp = ctx.response;
  if (!resp) return;

  const ctRaw = resp.headers.get('content-type') || '';
  const ct = ctRaw.toLowerCase();
  const textual =
    !ct ||
    /^(text\/|application\/(json|javascript|xml|x-www-form-urlencoded|problem\+json)|[^;]*\+(json|xml))/.test(ct);
  if (!textual) return;

  let body;
  try {
    body = await resp.text();
  } catch (e) {
    console.log('[replace-domains] read body failed: ' + e);
    return;
  }
  if (!body) return;

  let changed = false;
  let total = 0;
  const hits = [];
  for (const [from, to] of parsePairs(env.PAIRS)) {
    const r = replaceAll(body, from, to, strict);
    if (r.count > 0) {
      body = r.text;
      changed = true;
      total += r.count;
      hits.push(from + '=>' + to + ' x' + r.count);
    }
  }

  if (!changed) return;

  console.log('[replace-domains] ' + hits.join(', '));
  ctx.storage.set(
    'last',
    JSON.stringify({ time: new Date().toISOString(), url: ctx.request && ctx.request.url, hits })
  );
  console.log('[replace-domains] total replaced: ' + total);

  resp.headers.delete('content-length');
  resp.headers.delete('content-encoding');
  return { body };
}
