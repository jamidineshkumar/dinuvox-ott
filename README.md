# DinuVoX permanent link

This repository does not recreate or redesign the original Flask website. It provides a stable Vercel address that checks the Supabase media-server registry and redirects visitors to the currently active Cloudflare Quick Tunnel.

## Vercel environment variables

Set these in Project Settings → Environment Variables:

- `SUPABASE_URL` = `https://gnexauqypriiaxjgmdtl.supabase.co`
- `SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key (never the service-role/secret key)

Redeploy after adding variables.

## How it works

- `/` checks `/api/status` and launches the private cinema if the laptop server responds.
- `/api/launch` checks the current registry URL and `/api/health`, then redirects to the existing Flask `/login` page.
- If the laptop is off, a branded offline page appears. Visitors can retry using the same Vercel address.
- The original Flask website, styling, accounts, admin panel, movie catalogue and playback remain on the laptop and are not modified.

The browser address changes to the temporary Cloudflare URL after redirect. Visitors should bookmark and share the permanent Vercel address, not the redirected address. The permanent link always discovers the latest tunnel URL.
