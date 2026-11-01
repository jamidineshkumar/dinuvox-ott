const SUPABASE_URL = process.env.SUPABASE_URL || "https://gnexauqypriiaxjgmdtl.supabase.co";
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

async function getLiveServer() {
  if (!KEY) throw new Error("Missing Vercel environment variable SUPABASE_PUBLISHABLE_KEY");
  const endpoint = new URL("/rest/v1/media_server_registry", SUPABASE_URL);
  endpoint.search = new URLSearchParams({ id: "eq.1", select: "public_url,is_online,updated_at" }).toString();
  const response = await fetch(endpoint, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    cache: "no-store"
  });
  if (!response.ok) throw new Error("Could not read media server registry");
  const rows = await response.json();
  const row = rows[0];
  if (!row || !row.is_online || !row.public_url) return null;
  const parsed = new URL(row.public_url);
  if (parsed.protocol !== "https:" || !/^[a-z0-9-]+\.trycloudflare\.com$/i.test(parsed.hostname)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const health = await fetch(parsed.origin + "/api/health", {
      headers: { "User-Agent": "DinuVoX-Permanent-Link/1.0" },
      cache: "no-store",
      signal: controller.signal
    });
    if (!health.ok) return null;
    const data = await health.json();
    return data && data.ok ? { url: parsed.origin, updated_at: row.updated_at } : null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "GET") return res.status(405).json({ online: false, error: "Method not allowed" });
  try {
    const live = await getLiveServer();
    return res.status(200).json({ online: !!live, updated_at: live?.updated_at || null });
  } catch (error) {
    console.error("DinuVoX status check failed:", error.message);
    return res.status(200).json({ online: false });
  }
};