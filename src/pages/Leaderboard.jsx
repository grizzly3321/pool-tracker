import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

export default function Leaderboard() {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)

  // Pull-to-refresh state
  const containerRef = useRef(null)
  const touchStartY = useRef(0)
  const [pullDistance, setPullDistance] = useState(0)
  const PULL_THRESHOLD = 80

  const fetchLeaderboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')

    if (error) {
      console.error('Error fetching leaderboard:', error)
    } else {
      setPlayers(data || [])
      setLastUpdated(new Date())
    }

    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Pull-to-refresh handlers
  function handleTouchStart(e) {
    if (containerRef.current?.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }

  function handleTouchMove(e) {
    if (touchStartY.current === 0) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.5, 120))
    }
  }

  function handleTouchEnd() {
    if (pullDistance >= PULL_THRESHOLD) {
      fetchLeaderboard(true)
    }
    setPullDistance(0)
    touchStartY.current = 0
  }

  const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600']

  return (
    <div
      ref={containerRef}
      className="min-h-dvh bg-[var(--color-bg)] px-4 pb-24 pt-10 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className="flex justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullDistance > 0 ? pullDistance : 0 }}
      >
        <div className={`flex items-center gap-2 text-sm text-gray-400 ${
          pullDistance >= PULL_THRESHOLD ? 'text-green-400' : ''
        }`}>
          <span
            className="inline-block transition-transform duration-200"
            style={{ transform: `rotate(${pullDistance >= PULL_THRESHOLD ? 180 : 0}deg)` }}
          >
            ↓
          </span>
          {pullDistance >= PULL_THRESHOLD ? 'Release to refresh' : 'Pull to refresh'}
        </div>
      </div>

      {/* Refreshing spinner */}
      {refreshing && (
        <div className="flex justify-center mb-3">
          <span className="w-5 h-5 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">🎱 Pool Bet Tracker</h1>
        <p className="text-sm text-gray-400 mt-1">
          Pot: $200 · Ends: Jan 1, 2027
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
          {lastUpdated && !loading && (
            <span> · Updated {format(lastUpdated, 'h:mm a')}</span>
          )}
        </p>
      </div>

      {/* Leaderboard */}
      <div className="space-y-3 max-w-md mx-auto">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-card)] rounded-xl p-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full" />
                  <div className="h-5 w-24 bg-gray-700 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-5 w-10 bg-gray-700 rounded" />
                  <div className="h-5 w-14 bg-gray-700 rounded" />
                </div>
              </div>
            </div>
          ))
        ) : players.length === 0 ? (
          <p className="text-center text-gray-400 mt-8">
            No matches recorded yet. Start playing!
          </p>
        ) : (
          players.map((player, index) => (
            <Link
              key={player.id}
              to={`/player/${player.id}`}
              className="block bg-[var(--color-card)] hover:bg-[var(--color-card-hover)]
                         rounded-xl p-4 transition-colors active:scale-[0.98] duration-150"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className={`text-lg font-bold w-8 text-center ${
                      rankColors[index] || 'text-gray-500'
                    }`}
                  >
                    #{index + 1}
                  </span>
                  <span className="font-semibold text-lg">{player.name}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-300">
                    {player.total_wins}-{player.total_losses}
                  </span>
                  <span className="font-bold text-white min-w-[3rem] text-right">
                    {player.win_pct}%
                  </span>
                  <StreakBadge streak={player.current_streak} />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Record Match Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(3.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[var(--color-bg)] via-[var(--color-bg)] to-transparent">
        <Link
          to="/record"
          className="block w-full max-w-md mx-auto bg-green-600 hover:bg-green-700
                     text-white text-center font-bold py-4 rounded-xl text-lg
                     transition-colors active:scale-[0.98]"
        >
          + Record Match
        </Link>
      </div>
    </div>
  )
}

function StreakBadge({ streak }) {
  if (!streak || streak === 'W0' || streak === 'L0') return null

  const type = streak.charAt(0)
  const count = parseInt(streak.substring(1), 10)

  if (count <= 1) return null

  if (type === 'W') {
    return (
      <span className="bg-green-900/50 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
        🔥 W{count}
      </span>
    )
  }

  return (
    <span className="bg-red-900/50 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
      ❄️ L{count}
    </span>
  )
}
