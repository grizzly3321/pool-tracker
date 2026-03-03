import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Leaderboard from './pages/Leaderboard'
import PlayerHistory from './pages/PlayerHistory'
import RecordMatch from './pages/RecordMatch'
import MatchDetail from './pages/MatchDetail'

function AnimatedRoutes() {
  const location = useLocation()
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('enter')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exit')
    }
  }, [location, displayLocation])

  function handleAnimationEnd() {
    if (transitionStage === 'exit') {
      setDisplayLocation(location)
      setTransitionStage('enter')
    }
  }

  return (
    <div
      className={transitionStage === 'enter' ? 'page-enter' : 'page-exit'}
      onAnimationEnd={handleAnimationEnd}
    >
      <Routes location={displayLocation}>
        <Route path="/" element={<Leaderboard />} />
        <Route path="/player/:id" element={<PlayerHistory />} />
        <Route path="/record" element={<RecordMatch />} />
        <Route path="/match/:id" element={<MatchDetail />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
    </BrowserRouter>
  )
}
