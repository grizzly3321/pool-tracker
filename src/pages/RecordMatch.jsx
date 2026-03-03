import { useEffect, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function RecordMatch() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState([])
  const [winner, setWinner] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const objectUrlRef = useRef(null)

  useEffect(() => {
    async function fetchPlayers() {
      const { data } = await supabase
        .from('players')
        .select('id, name')
        .order('name')
      setPlayers(data || [])
    }
    fetchPlayers()

    // Cleanup object URLs on unmount
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [])

  function togglePlayer(player) {
    setError(null)
    if (selected.find((p) => p.id === player.id)) {
      setSelected(selected.filter((p) => p.id !== player.id))
      if (winner?.id === player.id) setWinner(null)
    } else if (selected.length < 2) {
      setSelected([...selected, player])
    } else {
      // Replace the first selected with the new one
      if (winner?.id === selected[0].id) setWinner(null)
      setSelected([selected[1], player])
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setPhoto(file)

    // Revoke previous object URL
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)

    const url = URL.createObjectURL(file)
    objectUrlRef.current = url
    setPreview(url)
  }

  function clearPhoto() {
    setPhoto(null)
    setPreview(null)
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }

  async function compressImage(file) {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxWidth = 1200
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => resolve(blob),
          'image/jpeg',
          0.8
        )
      }
      img.src = URL.createObjectURL(file)
    })
  }

  async function handleSubmit() {
    if (selected.length !== 2 || !winner || !photo) return

    // Show confirmation first
    if (!confirming) {
      setConfirming(true)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      // Compress and upload photo
      const compressed = await compressImage(photo)
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('match-photos')
        .upload(filename, compressed, { contentType: 'image/jpeg' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('match-photos')
        .getPublicUrl(filename)

      const photoUrl = urlData.publicUrl

      // Insert match record
      const loser = selected.find((p) => p.id !== winner.id)
      const { data: matchData, error: insertError } = await supabase
        .from('matches')
        .insert({
          player1_id: winner.id,
          player2_id: loser.id,
          winner_id: winner.id,
          photo_url: photoUrl,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // Fire-and-forget SMS notifications via edge function
      if (matchData?.id) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
        if (supabaseUrl && supabaseAnonKey) {
          fetch(`${supabaseUrl}/functions/v1/notify-match`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({ matchId: matchData.id }),
          }).catch(() => {}) // Ignore errors — match is already saved
        }
      }

      setSuccess(`${winner.name} beat ${loser.name}!`)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      console.error('Error submitting match:', err)
      setError('Failed to record match. Please try again.')
      setConfirming(false)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = selected.length === 2 && winner && photo && !submitting
  const loser = winner ? selected.find((p) => p.id !== winner.id) : null

  // Figure out which step the user is on (for progress dots)
  const currentStep = selected.length < 2 ? 1 : !winner ? 2 : !photo ? 3 : 4

  return (
    <div className="min-h-dvh bg-[var(--color-bg)] px-4 pt-6 pb-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-gray-400 hover:text-white transition-colors text-lg"
            >
              ← Cancel
            </Link>
            <h1 className="text-xl font-bold">Record Match</h1>
          </div>
          {/* Step indicator */}
          {!success && (
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    step <= currentStep ? 'bg-green-500' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {success ? (
          <div className="text-center mt-16">
            <p className="text-5xl mb-4">🎱</p>
            <p className="text-2xl font-bold text-green-400">{success}</p>
            <p className="text-gray-400 mt-3">Returning to leaderboard...</p>
          </div>
        ) : (
          <>
            {/* Step 1: Who played? */}
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Who played?
                <span className="text-gray-600 normal-case font-normal ml-2">
                  Select 2
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {players.map((player) => {
                  const isSelected = selected.find((p) => p.id === player.id)
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player)}
                      className={`min-h-[48px] py-4 rounded-xl font-semibold text-lg transition-all
                                  duration-150 active:scale-[0.96]
                        ${
                          isSelected
                            ? 'bg-green-600 text-white ring-2 ring-green-400 shadow-lg shadow-green-900/30'
                            : 'bg-[var(--color-card)] text-gray-300 hover:bg-[var(--color-card-hover)]'
                        }`}
                    >
                      {player.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Step 2: Who won? */}
            {selected.length === 2 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Who won?
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {selected.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => {
                        setWinner(player)
                        setConfirming(false)
                        setError(null)
                      }}
                      className={`min-h-[48px] py-4 rounded-xl font-semibold text-lg transition-all
                                  duration-150 active:scale-[0.96]
                        ${
                          winner?.id === player.id
                            ? 'bg-yellow-500 text-black ring-2 ring-yellow-300 shadow-lg shadow-yellow-900/30'
                            : 'bg-[var(--color-card)] text-gray-300 hover:bg-[var(--color-card-hover)]'
                        }`}
                    >
                      {winner?.id === player.id ? '👑 ' : ''}
                      {player.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Photo */}
            {winner && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
                  Match Photo
                  <span className="text-gray-600 normal-case font-normal ml-2">
                    Required — the proof!
                  </span>
                </h2>
                {preview ? (
                  <div className="relative">
                    <img
                      src={preview}
                      alt="Match preview"
                      className="w-full rounded-xl max-h-64 object-cover"
                    />
                    <button
                      onClick={clearPhoto}
                      className="absolute top-2 right-2 bg-black/70 hover:bg-black/90
                                 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <div className="bg-[var(--color-card)] rounded-xl p-8 text-center
                                    hover:bg-[var(--color-card-hover)] transition-colors
                                    border-2 border-dashed border-gray-700 min-h-[48px]">
                      <p className="text-3xl mb-2">📷</p>
                      <p className="text-gray-400">Take photo or upload</p>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-4 bg-red-900/30 border border-red-800 text-red-400
                              text-sm rounded-xl px-4 py-3 text-center">
                {error}
              </div>
            )}

            {/* Confirmation dialog */}
            {confirming && canSubmit && (
              <div className="mb-4 bg-[var(--color-card)] rounded-xl p-4 text-center
                              border border-gray-700">
                <p className="text-lg font-semibold mb-1">
                  <span className="text-green-400">{winner.name}</span>
                  {' beat '}
                  <span className="text-white">{loser.name}</span>
                  ?
                </p>
                <p className="text-sm text-gray-400 mb-4">
                  This can't be undone
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="flex-1 py-3 rounded-xl font-semibold bg-gray-700 text-gray-300
                               hover:bg-gray-600 transition-colors min-h-[48px]"
                  >
                    Go Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl font-semibold bg-green-600 text-white
                               hover:bg-green-700 transition-colors active:scale-[0.98] min-h-[48px]"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Confirm'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Submit button (before confirmation) */}
            {!confirming && (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`w-full min-h-[48px] py-4 rounded-xl font-bold text-lg transition-all
                  ${
                    canSubmit
                      ? 'bg-green-600 hover:bg-green-700 text-white active:scale-[0.98]'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                Submit Match
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
