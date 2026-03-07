import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    async function fetchMatch() {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id,
          created_at,
          photo_url,
          winner_id,
          player1:player1_id(id, name),
          player2:player2_id(id, name)
        `)
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching match:', error)
      } else {
        setMatch(data)
      }
      setLoading(false)
    }

    fetchMatch()
  }, [id])

  // Close fullscreen on Escape key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') setFullscreen(false)
    }
    if (fullscreen) {
      document.addEventListener('keydown', handleKey)
      return () => document.removeEventListener('keydown', handleKey)
    }
  }, [fullscreen])

  if (loading) {
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] px-4 pt-6">
        <div className="max-w-md mx-auto">
          <div className="h-6 w-24 bg-gray-700 rounded animate-pulse mb-6" />
          <div className="h-4 w-40 bg-gray-700 rounded animate-pulse mb-3" />
          <div className="h-8 w-56 bg-gray-700 rounded animate-pulse mb-6" />
          <div className="h-72 bg-gray-700 rounded-xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-dvh bg-[var(--color-bg)] px-4 pt-6 text-center">
        <p className="text-gray-400 mt-16">Match not found.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 text-green-400 hover:text-green-300"
        >
          Go back home
        </button>
      </div>
    )
  }

  const winner = match.player1.id === match.winner_id ? match.player1 : match.player2
  const loser = match.player1.id === match.winner_id ? match.player2 : match.player1

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pt-6 pb-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-10 bg-[var(--color-bg)] pt-[env(safe-area-inset-top)]">
          <div className="max-w-md mx-auto px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="text-gray-400 hover:text-white transition-colors text-lg block"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Spacer for fixed header */}
        <div className="h-12" />

        {/* Match detail card */}
        <div className="bg-[var(--color-card)] rounded-xl p-5 mb-6">
          {/* Date */}
          <p className="text-gray-400 text-sm mb-3">
            {format(new Date(match.created_at), "EEEE, MMMM d, yyyy 'at' h:mm a")}
          </p>

          {/* Result */}
          <h1 className="text-2xl font-bold">
            <span className="text-green-400">{winner.name}</span>
            {' beat '}
            <span className="text-white">{loser.name}</span>
          </h1>
        </div>

        {/* Photo — tap to view fullscreen */}
        {match.photo_url && (
          <>
            <p className="text-xs text-gray-500 mb-2 text-center">
              Tap photo to view full size
            </p>
            <button
              onClick={() => setFullscreen(true)}
              className="w-full block"
            >
              <img
                src={match.photo_url}
                alt={`${winner.name} vs ${loser.name}`}
                className="w-full rounded-xl"
                loading="lazy"
              />
            </button>
          </>
        )}
      </div>

      {/* Fullscreen photo overlay */}
      {fullscreen && match.photo_url && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white text-lg
                       bg-white/10 hover:bg-white/20 rounded-full w-10 h-10
                       flex items-center justify-center transition-colors z-10"
          >
            ✕
          </button>
          <img
            src={match.photo_url}
            alt={`${winner.name} vs ${loser.name}`}
            className="max-w-full max-h-full object-contain p-4"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
