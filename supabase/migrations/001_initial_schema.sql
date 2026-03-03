-- ============================================================
-- Pool Bet Tracker — Initial Schema
-- ============================================================
-- Run this entire file in your Supabase dashboard:
--   SQL Editor → New Query → paste this → Run
-- ============================================================

-- -------------------------------------------------------
-- 1. Players table
-- -------------------------------------------------------
CREATE TABLE players (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL UNIQUE,
  phone      text,       -- for SMS notifications, e.g. '+15551234567'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- 2. Matches table
-- -------------------------------------------------------
CREATE TABLE matches (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id uuid        NOT NULL REFERENCES players(id),
  player2_id uuid        NOT NULL REFERENCES players(id),
  winner_id  uuid        NOT NULL REFERENCES players(id),
  photo_url  text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT winner_must_be_participant
    CHECK (winner_id = player1_id OR winner_id = player2_id),

  CONSTRAINT players_must_be_different
    CHECK (player1_id != player2_id)
);

-- Indexes for common queries
CREATE INDEX idx_matches_player1 ON matches(player1_id);
CREATE INDEX idx_matches_player2 ON matches(player2_id);
CREATE INDEX idx_matches_created ON matches(created_at DESC);

-- -------------------------------------------------------
-- 3. Leaderboard view
-- -------------------------------------------------------
-- Computes wins, losses, win%, and current streak per player.
-- Current streak: looks at most recent consecutive results
-- and returns e.g. 'W3' or 'L2'.
-- -------------------------------------------------------
CREATE OR REPLACE VIEW leaderboard AS
WITH match_results AS (
  -- Every match from the perspective of each participant
  SELECT
    m.id        AS match_id,
    p.id        AS player_id,
    p.name      AS player_name,
    m.winner_id,
    m.created_at,
    CASE WHEN m.winner_id = p.id THEN 'W' ELSE 'L' END AS result
  FROM players p
  JOIN matches m ON p.id = m.player1_id OR p.id = m.player2_id
),

-- Number each player's matches in reverse chronological order
numbered AS (
  SELECT *,
    ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY created_at DESC) AS rn
  FROM match_results
),

-- Find the first match where the result differs from the most recent
streak_break AS (
  SELECT
    player_id,
    MIN(rn) AS break_at
  FROM numbered
  WHERE rn > 1
    AND result != (
      SELECT n2.result FROM numbered n2
      WHERE n2.player_id = numbered.player_id AND n2.rn = 1
    )
  GROUP BY player_id
),

streak_calc AS (
  SELECT
    n.player_id,
    -- If no break found, the entire history is one streak
    (SELECT n2.result FROM numbered n2 WHERE n2.player_id = n.player_id AND n2.rn = 1)
      || COALESCE(sb.break_at - 1, MAX(n.rn))::text AS current_streak
  FROM numbered n
  LEFT JOIN streak_break sb ON sb.player_id = n.player_id
  GROUP BY n.player_id, sb.break_at
),

stats AS (
  SELECT
    p.id,
    p.name,
    COUNT(mr.match_id)                                    AS total_matches,
    COUNT(*) FILTER (WHERE mr.result = 'W')               AS total_wins,
    COUNT(*) FILTER (WHERE mr.result = 'L')               AS total_losses,
    CASE
      WHEN COUNT(mr.match_id) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE mr.result = 'W') * 100.0
        / COUNT(mr.match_id), 1
      )
    END AS win_pct
  FROM players p
  LEFT JOIN match_results mr ON mr.player_id = p.id
  GROUP BY p.id, p.name
)

SELECT
  s.id,
  s.name,
  s.total_matches,
  s.total_wins,
  s.total_losses,
  s.win_pct,
  COALESCE(sc.current_streak, 'W0') AS current_streak
FROM stats s
LEFT JOIN streak_calc sc ON sc.player_id = s.id
ORDER BY s.win_pct DESC, s.total_wins DESC;

-- -------------------------------------------------------
-- 4. Seed data — the 4 players
-- -------------------------------------------------------
INSERT INTO players (name) VALUES
  ('Jon'),
  ('Jim'),
  ('Jim Jr.'),
  ('Drew');

-- -------------------------------------------------------
-- 5. Storage bucket for match photos
-- -------------------------------------------------------
-- NOTE: Supabase creates storage buckets via the dashboard or API.
-- Run these statements to create the bucket programmatically:
INSERT INTO storage.buckets (id, name, public)
VALUES ('match-photos', 'match-photos', true)
ON CONFLICT (id) DO NOTHING;

-- -------------------------------------------------------
-- 6. Row Level Security (RLS)
-- -------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Players: anyone can read, only authenticated/anon can insert/update
CREATE POLICY "Anyone can view players"
  ON players FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert players"
  ON players FOR INSERT
  WITH CHECK (true);

-- Matches: anyone can read, anon can insert (no auth in this simple app)
CREATE POLICY "Anyone can view matches"
  ON matches FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert matches"
  ON matches FOR INSERT
  WITH CHECK (true);

-- Storage policies for match-photos bucket
-- Allow public read access
CREATE POLICY "Public read access for match photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'match-photos');

-- Allow anyone to upload match photos
CREATE POLICY "Anyone can upload match photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'match-photos');
