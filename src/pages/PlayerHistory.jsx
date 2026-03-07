import { useEffect, useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

export default function PlayerHistory() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [matches, setMatches] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)

      // Fetch player info from leaderboard view
      const { data: lbData } = await supabase
        .from('leaderboard')
        .select('*')
        .eq('id', id)
        .single()

      if (lbData) {
        setPlayer(lbData)
        setStats({
          wins: lbData.total_wins,
          losses: lbData.total_losses,
          winPct: lbData.win_pct,
          streak: lbData.current_streak,
        })
      }

      // Fetch matches involving this player
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id,
          created_at,
          photo_url,
          winner_id,
          player1:player1_id(id, name),
          player2:player2_id(id, name)
        `)
        .or(`player1_id.eq.${id},player2_id.eq.${id}`)
        .order('created_at', { ascending: false })

      setMatches(matchData || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  function getOpponent(match) {
    return match.player1.id === id ? match.player2 : match.player1
  }

  function isWin(match) {
    return match.winner_id === id
  }

  // Calculate best streak and head-to-head records from match data
  const { bestStreak, headToHead } = useMemo(() => {
    if (matches.length === 0) return { bestStreak: 0, headToHead: {} }

    // Best streak — walk matches in chronological order
    const chronological = [...matches].reverse()
    let best = 0
    let current = 0
    let lastResult = null

    for (const match of chronological) {
      const won = match.winner_id === id
      if (won === lastResult) {
        current++
      } else {
        current = 1
        lastResult = won
      }
      if (lastResult && current > best) best = current
    }

    // Head-to-head
    const h2h = {}
    for (const match of matches) {
      const opponent = match.player1.id === id ? match.player2 : match.player1
      if (!h2h[opponent.id]) {
        h2h[opponent.id] = { name: opponent.name, wins: 0, losses: 0 }
      }
      if (match.winner_id === id) {
        h2h[opponent.id].wins++
      } else {
        h2h[opponent.id].losses++
      }
    }

    return { bestStreak: best, headToHead: h2h }
  }, [matches, id])

  if (loading) {
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] px-4 pt-6">
        <div className="max-w-md mx-auto">
          <div className="h-6 w-32 bg-gray-700 rounded animate-pulse mb-4" />
          <div className="bg-[var(--color-card)] rounded-xl p-4 animate-pulse mb-6">
            <div className="h-5 w-48 bg-gray-700 rounded mb-2" />
            <div className="h-5 w-36 bg-gray-700 rounded" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-[var(--color-card)] rounded-xl p-4 animate-pulse mb-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-gray-700 rounded-lg" />
                <div>
                  <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
                  <div className="h-5 w-32 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] pb-8">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-[var(--color-bg)] pt-[env(safe-area-inset-top)]">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <Link
            to="/"
            className="text-gray-400 hover:text-white transition-colors text-lg"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-bold">
            {player?.name}'s Matches
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)]">
        {/* Stats Card */}
        {stats && (
          <div className="bg-[var(--color-card)] rounded-xl p-4 mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">
                  {stats.wins}-{stats.losses}
                </p>
                <p className="text-xs text-gray-400">Record</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.winPct}%</p>
                <p className="text-xs text-gray-400">Win %</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.streak && stats.streak !== 'W0' && stats.streak !== 'L0'
                    ? stats.streak.startsWith('W')
                      ? `🔥 ${stats.streak.substring(1)}`
                      : `❄️ ${stats.streak.substring(1)}`
                    : '—'}
                </p>
                <p className="text-xs text-gray-400">Streak</p>
              </div>
            </div>
            {bestStreak > 1 && (
              <p className="text-center text-xs text-gray-500 mt-3 pt-3 border-t border-gray-700/50">
                Best win streak: 🔥 {bestStreak}
              </p>
            )}
          </div>
        )}

        {/* Head-to-Head */}
        {Object.keys(headToHead).length > 0 && (
          <div className="bg-[var(--color-card)] rounded-xl px-4 py-3 mb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Head to Head
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {Object.values(headToHead).map((opp) => (
                <span key={opp.name} className="text-sm text-gray-300">
                  vs {opp.name}:{' '}
                  <span className={opp.wins > opp.losses ? 'text-green-400' : opp.wins < opp.losses ? 'text-red-400' : 'text-gray-400'}>
                    {opp.wins}-{opp.losses}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Match History */}
        {matches.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">
            No matches yet — hit the table!
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Match History
            </p>
            {matches.map((match) => {
              const opponent = getOpponent(match)
              const won = isWin(match)

              return (
                <Link
                  key={match.id}
                  to={`/match/${match.id}`}
                  className="flex items-center gap-3 bg-[var(--color-card)] hover:bg-[var(--color-card-hover)]
                             rounded-xl p-3 transition-colors"
                >
                  {/* Win/loss indicator bar */}
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${
                    won ? 'bg-green-500' : 'bg-red-500'
                  }`} />

                  {/* Photo thumbnail */}
                  {match.photo_url && (
                    <img
                      src={match.photo_url}
                      alt="Match"
                      loading="lazy"
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400">
                      {format(new Date(match.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className={`font-semibold ${won ? 'text-green-400' : 'text-red-400'}`}>
                      {won ? `Beat ${opponent.name}` : `Lost to ${opponent.name}`}
                    </p>
                  </div>

                  <span className="text-gray-500 text-sm">→</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
