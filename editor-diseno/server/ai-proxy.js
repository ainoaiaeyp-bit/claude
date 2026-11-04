'use strict';
/**
 * Proxy de IA para Lienzo (sin dependencias, Node >= 18).
 *
 * El navegador envía {system, user, max_tokens, model} con el token de sesión de Supabase.
 * El servidor comprueba el token, aplica un límite por usuario y llama a Anthropic con TU clave,
 * que nunca llega al navegador.
 *
 * Variables de entorno:
 *   ANTHROPIC_API_KEY   (obligatoria) clave de Anthropic
 *   SUPABASE_URL        URL del proyecto de Supabase (para verificar sesiones)
 *   SUPABASE_ANON_KEY   clave anon de Supabase
 *   ALLOW_ANON=1        permite usar la IA sin sesión (NO recomendado en público)
 *   AI_RATE_PER_HOUR    peticiones por usuario y hora (por defecto 30)
 *   AI_MAX_TOKENS       tope de tokens de salida (por defecto 3000)
 *   AI_MODELS           modelos permitidos, separados por comas
 *   ALLOWED_ORIGIN      origen CORS permitido (solo si el editor está en otro dominio)
 *   PORT                puerto (por defecto 8787)
 *   ANTHROPIC_URL       endpoint de Anthropic (solo para pruebas)
 */
const http = require('http');

const env = process.env;
const PORT = +env.PORT || 8787;
const API_KEY = env.ANTHROPIC_API_KEY || '';
const SB_URL = (env.SUPABASE_URL || '').replace(/\/+$/, '');
const SB_KEY = env.SUPABASE_ANON_KEY || '';
const ALLOW_ANON = env.ALLOW_ANON === '1';
const LIMIT = +env.AI_RATE_PER_HOUR || 30;
const MAX_TOKENS = +env.AI_MAX_TOKENS || 3000;
const MODELS = (env.AI_MODELS || 'claude-sonnet-5-5,claude-haiku-5-5,claude-opus-5-5').split(',').map(s => s.trim()).filter(Boolean);
const ORIGIN = env.ALLOWED_ORIGIN || '';
const UPSTREAM = env.ANTHROPIC_URL || 'https://api.anthropic.com/v1/messages';

if (!API_KEY) { console.error('Falta ANTHROPIC_API_KEY'); process.exit(1); }
if (!ALLOW_ANON && !(SB_URL && SB_KEY)) {
  console.error('Configura SUPABASE_URL y SUPABASE_ANON_KEY para verificar sesiones (o ALLOW_ANON=1 bajo tu responsabilidad).');
  process.exit(1);
}

const tokenCache = new Map(); // token -> {id, exp}
const hits = new Map();       // userId -> [timestamps]

async function userFromToken(token) {
  const c = tokenCache.get(token);
  if (c && c.exp > Date.now()) return c.id;
  const r = await fetch(SB_URL + '/auth/v1/user', { headers: { apikey: SB_KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !u.id) return null;
  tokenCache.set(token, { id: u.id, exp: Date.now() + 60_000 });
  if (tokenCache.size > 5000) tokenCache.clear();
  return u.id;
}

function rateLimited(id) {
  const now = Date.now(), win = 3_600_000;
  const arr = (hits.get(id) || []).filter(t => now - t < win);
  if (arr.length >= LIMIT) { hits.set(id, arr); return true; }
  arr.push(now); hits.set(id, arr); return false;
}

function send(res, status, body, extra = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra);
  if (ORIGIN) {
    headers['Access-Control-Allow-Origin'] = ORIGIN;
    headers['Access-Control-Allow-Headers'] = 'authorization, content-type';
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Vary'] = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req, max = 200_000) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > max) { reject(Object.assign(new Error('Petición demasiado grande'), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') return send(res, 204, {});
    if (url.pathname === '/api/health') return send(res, 200, { ok: true });
    if (url.pathname !== '/api/ai' || req.method !== 'POST') return send(res, 404, { error: 'No encontrado' });

    let uid = 'anon';
    if (!ALLOW_ANON || SB_URL) {
      const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const id = token && SB_URL ? await userFromToken(token) : null;
      if (!id) { if (!ALLOW_ANON) return send(res, 401, { error: 'Inicia sesión para usar la IA' }); }
      else uid = id;
    }
    if (rateLimited(uid)) return send(res, 429, { error: `Has alcanzado el límite de ${LIMIT} peticiones por hora` });

    let b;
    try { b = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.status || 400, { error: e.status ? e.message : 'JSON no válido' }); }
    const system = typeof b.system === 'string' ? b.system.slice(0, 20_000) : '';
    const user = typeof b.user === 'string' ? b.user.slice(0, 20_000) : '';
    if (!user) return send(res, 400, { error: 'Falta el texto de la petición' });
    const model = MODELS.includes(b.model) ? b.model : MODELS[0];
    const max_tokens = Math.max(16, Math.min(MAX_TOKENS, Math.floor(+b.max_tokens) || 1000));

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    let r;
    try {
      r = await fetch(UPSTREAM, {
        method: 'POST', signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model, max_tokens, system, messages: [{ role: 'user', content: user }] })
      });
    } finally { clearTimeout(timer); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error('Anthropic', r.status, j && j.error && j.error.message);
      return send(res, r.status === 429 ? 429 : 502, { error: r.status === 429 ? 'El servicio de IA está saturado, inténtalo en un momento' : 'Error del servicio de IA' });
    }
    const text = (j.content || []).filter(x => x.type === 'text').map(x => x.text).join('');
    send(res, 200, { text });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Error interno' });
  }
});

server.listen(PORT, () => console.log(`Proxy de IA de Lienzo escuchando en :${PORT}`));
