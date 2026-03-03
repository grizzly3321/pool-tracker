# 🎱 Pool Bet Tracker

A Progressive Web App for tracking pool/billiards matches and bets between friends.

- **Players:** Jon, Jim, Jim Jr., Drew
- **Buy-in:** $50 each ($200 pot)
- **Deadline:** January 1, 2027
- **Winner:** Highest win percentage

## Features

- **Leaderboard** — live rankings with win/loss records, win %, and streak badges
- **Record Matches** — select 2 players, pick the winner, snap a photo for proof
- **Player History** — full match history, head-to-head records, best streaks
- **Match Detail** — fullscreen photo viewer for each match
- **SMS Notifications** — optional Twilio integration texts all players after each match
- **Offline Support** — cached leaderboard and photos work without internet
- **Installable PWA** — add to home screen on any phone, works like a native app

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | React + Vite |
| Styling | Tailwind CSS |
| Backend/DB | Supabase (Postgres + storage) |
| PWA | vite-plugin-pwa |
| SMS | Twilio (optional) |

## Setup

### 1. Install dependencies

```bash
cd pool-tracker
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Create a new project (name it "pool-tracker")
3. Wait for the project to finish provisioning

### 3. Run the database migration

1. In your Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Open `supabase/migrations/001_initial_schema.sql` and paste the entire contents
4. Click **Run**

This creates:
- `players` table (with Jon, Jim, Jim Jr., Drew pre-seeded)
- `matches` table (with check constraints)
- `leaderboard` view (auto-computes wins, losses, win %, streaks)
- `match-photos` storage bucket (public access)
- Row Level Security policies

### 4. Configure environment variables

1. In your Supabase dashboard, go to **Settings → API**
2. Copy your **Project URL** and **anon public key**
3. Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Run the app

```bash
npm run dev
```

Open http://localhost:5173 on your browser or phone (same WiFi network).

## Deployment (Vercel)

```bash
# Push to GitHub
git init
git add .
git commit -m "Pool tracker v1"
git remote add origin https://github.com/YOUR-USERNAME/pool-tracker.git
git push -u origin main
```

Then in Vercel:
1. Import your GitHub repo
2. Add environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
3. Deploy!

## Install on Phones

- **iPhone:** Open in Safari → Share → "Add to Home Screen"
- **Android:** Open in Chrome → Menu → "Install App"

## SMS Notifications (Optional)

### 1. Add player phone numbers

In the Supabase SQL Editor:

```sql
UPDATE players SET phone = '+15551234567' WHERE name = 'Jon';
UPDATE players SET phone = '+15559876543' WHERE name = 'Jim';
UPDATE players SET phone = '+15551112222' WHERE name = 'Jim Jr.';
UPDATE players SET phone = '+15553334444' WHERE name = 'Drew';
```

### 2. Deploy the Edge Function

```bash
npx supabase functions deploy notify-match
```

### 3. Set Twilio secrets

```bash
npx supabase secrets set TWILIO_ACCOUNT_SID=your_sid
npx supabase secrets set TWILIO_AUTH_TOKEN=your_token
npx supabase secrets set TWILIO_PHONE_NUMBER=+15550001111
npx supabase secrets set APP_URL=https://your-app.vercel.app
```

After setup, every recorded match sends a text to all 4 players:
> 🎱 Jon beat Drew! Jon is now 8-3 (72.7%). View: https://your-app.vercel.app

## Project Structure

```
pool-tracker/
├── public/
│   ├── favicon.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── components/
│   ├── lib/
│   │   └── supabase.js
│   ├── pages/
│   │   ├── Leaderboard.jsx
│   │   ├── PlayerHistory.jsx
│   │   ├── RecordMatch.jsx
│   │   └── MatchDetail.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase/
│   ├── functions/
│   │   └── notify-match/
│   │       └── index.ts
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.example
├── index.html
└── vite.config.js
```
