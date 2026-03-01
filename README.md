# Collectra

Retro collector channels for cards, games, and magazines with collection tracking, social sharing, and market-facing target analytics.

## 1. Prerequisites

- Node.js 20+
- npm 10+
- Supabase project

## 2. Install + run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with your Supabase project values.

## 3. Supabase setup

Run the SQL in `supabase/schema.sql` in your Supabase SQL editor.
If you are upgrading an existing project, re-run it so the Social tables (`profiles`, `friendships`, `social_messages`) and cover-art columns are added.

Enable email/password authentication in Supabase Auth.

## 4. Core channels

- `Collection`: add and manage tracked items
- `Social`: add friends, view their shared collection covers, and chat
- `Market`: rollup analytics from saved targets
- `Play`: placeholder channel (future launch support)
- `Options`: account/session actions

## 5. Deploy

1. Push repo to GitHub.
2. Import it into Vercel.
3. Add env vars:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.
