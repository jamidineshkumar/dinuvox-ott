const SUPABASE_URL = process.env.SUPABASE_URL || "https://gnexauqypriiaxjgmdtl.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  if (req.method !== "GET") return res.status(405).send("Method not allowed");
  try {
    if (!KEY) throw new Error("Missing Supabase publishable key");
    const endpoint = new URL("/rest/v1/media_server_registry", SUPABASE_URL);
    endpoint.search = new URLSearchParams({ id: "eq.1", select: "public_url,is_online" }).toString();
    const response = await fetch(endpoint, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      cache: "no-store"
    });
    if (!response.ok) throw new Error("Registry unavailable");
    const rows = await response.json();
    const row = rows[0];
    if (!row || !row.is_online || !row.public_url) return offline(res);
    const target = new URL(row.public_url);
    if (target.protocol !== "https:" || !/^[a-z0-9-]+\.trycloudflare\.com$/i.test(target.hostname)) {
      throw new Error("Invalid registered tunnel address");
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    let healthy = false;
    try {
      const health = await fetch(target.origin + "/api/health", {
        headers: { "User-Agent": "DinuVoX-Permanent-Link/1.0" },
        cache: "no-store",
        signal: controller.signal
      });
      if (health.ok) {
        const data = await health.json();
        healthy = !!(data && data.ok);
      }
    } finally {
      clearTimeout(timer);
    }
    if (!healthy) return offline(res);
    return res.redirect(302, target.origin + "/login");
  } catch (error) {
    console.error("DinuVoX launch failed:", error.message);
    return offline(res);
  }
};

function offline(res) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(503).send(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DinuVoX is offline</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 20% 10%,#33235e,transparent 42%),#080914;color:#f7f7ff;font-family:Segoe UI,Arial,sans-serif}.box{max-width:540px;margin:20px;padding:42px;border:1px solid #ffffff24;border-radius:22px;background:#15182ddd;text-align:center}.brand{font-weight:900;letter-spacing:2px;font-size:22px}h1{font-size:38px;margin:38px 0 12px}p{color:#a4a9c4;line-height:1.7}a{display:inline-block;margin-top:18px;padding:13px 20px;border:1px solid #ffffff35;border-radius:9px;color:white;text-decoration:none;font-size:12px;letter-spacing:1px}</style><div class="box"><div class="brand">ᗪIᑎᑌᐯO᙭</div><h1>The cinema is resting.</h1><p>DinuVoX is temporarily offline because its private media server is not running. Please try this same link again later.</p><a href="/">TRY AGAIN</a></div></html>`);
}