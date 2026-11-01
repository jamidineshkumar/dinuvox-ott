# DinuVoX OTT

A static Vercel frontend for the DinuVoX private media server.

## Architecture

- Vercel hosts this website.
- Supabase `media_server_registry` supplies the current Cloudflare Quick Tunnel URL.
- The laptop runs the existing Flask media server and publishes its current tunnel URL.
- The frontend checks `/api/health` and loads `/api/catalog` from the laptop server.
- The Flask application continues to own authentication and protected playback routes.

## Configure

1. In `config.js`, set the Supabase **publishable** key. Never use a service-role or secret key in browser code.
2. Deploy this repository to Vercel.
3. Add the exact Vercel production origin to the Flask `FRONTEND_ORIGINS` environment variable, e.g. `https://your-project.vercel.app`.
4. Restart the Flask launcher so the CORS allowlist takes effect.
5. Start the laptop launcher. The page polls the registry and server health every 20 seconds.

The movie catalogue is fetched from the laptop and therefore is unavailable while the laptop is offline. The Vercel website itself remains online. The login and protected playback routes stay on the Flask server.

## Security

Do not commit `.env`, SQLite databases, user data, tunnel publisher secrets, or Supabase service-role keys. The Supabase publishable key is intended for browser use and is restricted by RLS. Keep the registry table read-only to `anon` and `authenticated`.
