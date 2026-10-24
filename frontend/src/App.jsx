import { useState, useEffect } from 'react'
import './App.css'

function App() {
  /* Audio Player State */
  const [activeSong, setActiveSong] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [audioRef] = useState(new Audio())

  const [inputText, setInputText] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [likedSongs, setLikedSongs] = useState(() => {
    const saved = localStorage.getItem("moodtune_likes")
    return saved ? JSON.parse(saved) : []
  })

  const [currentView, setCurrentView] = useState("search") // "search", "home", "moods", "playlists"
  const [recentSongs, setRecentSongs] = useState(() => {
    const saved = localStorage.getItem("moodtune_recent")
    return saved ? JSON.parse(saved) : []
  })
  const [playlist, setPlaylist] = useState(() => {
    const saved = localStorage.getItem("moodtune_playlist")
    return saved ? JSON.parse(saved) : []
  })

  const togglePlaylist = (song) => {
    setPlaylist(prev => {
      const exists = prev.some(s => s.title === song.title)
      let updated
      if (exists) {
        updated = prev.filter(s => s.title !== song.title)
      } else {
        updated = [...prev, song]
      }
      localStorage.setItem("moodtune_playlist", JSON.stringify(updated))
      return updated
    })
  }

  const handleComingSoon = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    alert("Feature coming soon!");
  }

  // Always generates a Tamil-specific Spotify playlist search URL
  const getTamilPlaylistUrl = (mood) => {
    const m = (mood || '').toLowerCase()
    const queries = {
      happy:   'Tamil Kuthu Hits',
      joy:     'Tamil Kuthu Hits',
      sad:     'Tamil Sad Melody Songs',
      sadness: 'Tamil Sad Melody Songs',
      angry:   'Kollywood Mass BGM Tamil',
      anger:   'Kollywood Mass BGM Tamil',
      love:    'Tamil Romance Melody',
      romantic:'Tamil Romance Melody',
      calm:    'Tamil Relaxing Chill Songs',
      relief:  'Tamil Relaxing Chill Songs',
      neutral: 'Tamil Hits Playlist',
      party:   'Tamil Party Songs',
      focus:   'Tamil BGM Focus',
      workout: 'Tamil Mass Beats Workout',
    }
    const query = queries[m] || `Tamil ${mood} Songs`
    return `https://open.spotify.com/search/${encodeURIComponent(query)}/playlists`
  }

  const analyzeMood = async (overrideText) => {
    const query = typeof overrideText === 'string' ? overrideText : inputText
    if (!query.trim()) return

    // Close player on new search
    if (activeSong) {
      audioRef.pause()
      setActiveSong(null)
      setIsPlaying(false)
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setCurrentView("search")

    try {
      const response = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: query, model: "simple" }),
      })

      if (!response.ok) {
        throw new Error("Failed to connect to MoodTune API")
      }

      const data = await response.json()
      setResult(data)
    } catch (err) {
      console.error(err)
      setError(err.message || "Something went wrong. Ensure backend is running.")
    } finally {
      setLoading(false)
    }
  }

  const toggleLike = (song) => {
    setLikedSongs(prev => {
      const exists = prev.some(s => s.title === song.title)
      let updated
      if (exists) {
        updated = prev.filter(s => s.title !== song.title)
      } else {
        updated = [...prev, song]
      }
      localStorage.setItem("moodtune_likes", JSON.stringify(updated))
      return updated
    })
  }

  const handlePlayFull = async (song) => {
    if (activeSong?.title === song.title) {
      togglePlayPause()
    } else {
      audioRef.pause()
      setActiveSong(song)
      setIsPlaying(false)

      setRecentSongs(prev => {
        const filtered = prev.filter(s => s.title !== song.title)
        const updated = [song, ...filtered].slice(0, 12)
        localStorage.setItem("moodtune_recent", JSON.stringify(updated))
        return updated
      })

      try {
        const response = await fetch("http://localhost:8000/get_youtube_audio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: song.title,
            artist: song.artist
          }),
        })

        if (response.ok) {
          const data = await response.json()

          if (data.audio_url) {
            audioRef.src = data.audio_url
            audioRef.volume = volume
            audioRef.play().catch(e => {
              console.error("YouTube playback error:", e)
              if (song.preview_audio) {
                audioRef.src = song.preview_audio
                audioRef.play()
              }
            })
            setIsPlaying(true)
          } else if (song.preview_audio) {
            audioRef.src = song.preview_audio
            audioRef.volume = volume
            audioRef.play().catch(e => console.error("Playback error:", e))
            setIsPlaying(true)
          }
        } else {
          if (song.preview_audio) {
            audioRef.src = song.preview_audio
            audioRef.volume = volume
            audioRef.play().catch(e => console.error("Playback error:", e))
            setIsPlaying(true)
          }
        }
      } catch (err) {
        console.error("Error:", err)
        if (song.preview_audio) {
          audioRef.src = song.preview_audio
          audioRef.volume = volume
          audioRef.play().catch(e => console.error("Playback error:", e))
          setIsPlaying(true)
        }
      }
    }
  }

  const togglePlayPause = () => {
    if (isPlaying) {
      audioRef.pause()
      setIsPlaying(false)
    } else {
      audioRef.play().catch(e => console.error("Playback error:", e))
      setIsPlaying(true)
    }
  }

  // Audio event listeners
  audioRef.ontimeupdate = () => setCurrentTime(audioRef.currentTime)
  audioRef.onloadedmetadata = () => {
    setDuration(audioRef.duration)
    // Auto-skip first 3 seconds if it's a preview (often has intro)
    if (audioRef.duration <= 35) { // iTunes previews are ~30s
      audioRef.currentTime = 3
    }
  }
  audioRef.onended = () => {
    setIsPlaying(false)
    playNextTrack()
  }

  const playNextTrack = () => {
    if (result && result.recommendations && activeSong) {
      const currentIndex = result.recommendations.findIndex(s => s.title === activeSong.title)
      if (currentIndex !== -1 && currentIndex < result.recommendations.length - 1) {
        handlePlayFull(result.recommendations[currentIndex + 1])
      }
    }
  }

  const playPreviousTrack = () => {
    if (result && result.recommendations && activeSong) {
      const currentIndex = result.recommendations.findIndex(s => s.title === activeSong.title)
      if (currentIndex > 0) {
        handlePlayFull(result.recommendations[currentIndex - 1])
      } else {
        audioRef.currentTime = 0
      }
    }
  }

  const handleSeek = (e) => {
    const seekTime = (e.target.value / 100) * duration
    if (!isNaN(seekTime)) {
      audioRef.currentTime = seekTime
      setCurrentTime(seekTime)
    }
  }

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100
    setVolume(newVolume)
    audioRef.volume = newVolume
  }

  const formatTime = (time) => {
    if (isNaN(time) || !isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 40;
      const y = (e.clientY / window.innerHeight - 0.5) * 40;
      
      const blobs = document.querySelectorAll('.fixed.inset-0.z-0 > div');
      blobs.forEach((blob, i) => {
        const factor = (i + 1) * 0.5;
        blob.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* Atmospheric Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-tertiary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[100px]" />
      </div>

      {/* TopNavBar */}
      <header className="fixed top-0 w-full z-50 bg-background/60 backdrop-blur-xl border-b border-white/5">
        <div className="flex justify-between items-center px-container-padding h-16 md:h-20 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary/30">
              <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
            </div>
            <h1 className="font-display-lg text-2xl md:text-3xl text-white tracking-tight">MoodTune</h1>
          </div>
          <div className="flex items-center gap-8">
            <nav className="hidden md:flex items-center gap-8 text-on-surface-variant font-title-md">
              <button className={`${currentView === 'home' ? 'text-secondary' : 'hover:text-white'} transition-colors duration-300`} onClick={() => setCurrentView('home')}>Home</button>
              <button className={`${currentView === 'moods' ? 'text-secondary' : 'hover:text-white'} transition-colors duration-300`} onClick={() => setCurrentView('moods')}>Moods</button>
              <button className={`${currentView === 'playlists' ? 'text-secondary' : 'hover:text-white'} transition-colors duration-300`} onClick={() => setCurrentView('playlists')}>Playlists</button>
              <button className={`${currentView === 'likes' ? 'text-secondary' : 'hover:text-white'} transition-colors duration-300`} onClick={() => setCurrentView('likes')}>Liked</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="relative z-10 pt-32 pb-48 px-container-padding max-w-7xl mx-auto">
        {/* Hero Section */}
        <section className="text-center mb-20">
          <p className="font-title-md text-on-surface-variant/80 mb-8">Discover music that resonates with your feelings.</p>
          {/* Mood Input Card */}
          <div className="max-w-3xl mx-auto">
            <div className="glass-card p-2 md:p-3 rounded-[32px] relative group border-white/10">
              <div className="flex flex-col md:flex-row items-center gap-2">
                <div className="flex-grow w-full md:w-auto px-6 py-4 flex items-center gap-4">
                  <span className="material-symbols-outlined text-primary/60">edit_note</span>
                  <input 
                    className="w-full bg-transparent border-none focus:ring-0 text-xl text-on-surface placeholder:text-on-surface-variant/30 py-0" 
                    placeholder="How are you feeling right now?" 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') analyzeMood()
                    }}
                  />
                </div>
                <button 
                  className="w-full md:w-auto bg-primary text-on-primary px-8 py-4 rounded-[24px] font-title-md flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  onClick={() => analyzeMood()}
                  disabled={loading || !inputText.trim()}
                >
                  <span>{loading ? "Analyzing..." : "Get Recommendations"}</span>
                  {!loading && <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>}
                </button>
              </div>
            </div>

            {/* Quick Mood Picks - only show on search view when no results */}
            {currentView === 'search' && !result && !loading && (
              <div className="mt-6 flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                {['Feeling Happy', 'A bit Sad', 'Angry & Frustrated', 'Romantic Vibes', 'Calm & Relaxed'].map(mood => (
                  <button 
                    key={mood}
                    className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-on-surface-variant hover:text-white hover:bg-white/10 hover:border-white/20 transition-all font-label-sm active:scale-95"
                    onClick={() => {
                      setInputText(mood)
                      analyzeMood(mood)
                    }}
                    disabled={loading}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 text-error font-title-md">{error}</div>
          )}

          {/* Mood Status */}
          {result && (
            <div className="mt-12 space-y-6 max-w-md mx-auto">
              <div className="inline-flex items-center gap-3 px-6 py-2.5 rounded-full bg-surface-container-high/50 border border-white/10 backdrop-blur-sm">
                <span className="material-symbols-outlined text-secondary text-sm animate-pulse">equalizer</span>
                <span className="font-label-sm uppercase tracking-[0.2em] text-on-surface-variant">
                  Detected Mood: <span className="text-secondary font-bold">{result.mood.toUpperCase()}</span>
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between font-label-sm text-on-surface-variant px-1">
                  <span className="opacity-60 uppercase tracking-widest">Confidence</span>
                  <span className="text-primary font-bold">{Math.round(result.confidence * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_8px_rgba(208,188,255,0.4)] transition-all duration-1000" 
                    style={{ width: `${result.confidence * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Search Results View */}
        {currentView === "search" && result && (
          <>
            {/* Music Recommendation Grid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {result.recommendations.map((song, i) => (
                <div key={i} className="glass-card group rounded-[32px] overflow-hidden relative flex flex-row border-white/5 h-48 md:h-56">
                  <div className="w-[40%] shrink-0 relative overflow-hidden bg-surface-container-highest">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40 z-10"></div>
                    {song.image ? (
                      <img 
                        alt={song.title} 
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                        src={song.image} 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-white/20">music_note</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-grow p-6 flex flex-col justify-between relative z-20">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col min-w-0 pr-2">
                        <span className="text-primary font-label-sm uppercase tracking-widest mb-1">
                          {(i + 1).toString().padStart(2, '0')}
                        </span>
                        <h3 className="font-headline-lg text-white text-xl md:text-2xl truncate" title={song.title}>{song.title}</h3>
                        <p className="text-white/60 font-title-md truncate" title={song.artist}>{song.artist}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          className={`shrink-0 w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors text-white ${playlist.some(s => s.title === song.title) ? 'bg-secondary/20 border-secondary text-secondary' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}
                          onClick={() => togglePlaylist(song)}
                          title="Add to Playlist"
                        >
                          <span className="material-symbols-outlined text-xl">{playlist.some(s => s.title === song.title) ? 'playlist_add_check' : 'playlist_add'}</span>
                        </button>
                        <button 
                          className={`shrink-0 w-10 h-10 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors text-white ${likedSongs.some(s => s.title === song.title) ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 hover:bg-white/20'}`}
                          onClick={() => toggleLike(song)}
                        >
                          <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: likedSongs.some(s => s.title === song.title) ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-start">
                      <button 
                        className={`px-6 py-2 rounded-full font-title-md flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl ${activeSong?.title === song.title && isPlaying ? 'bg-secondary text-on-secondary' : 'bg-white text-surface'}`}
                        onClick={() => handlePlayFull(song)}
                      >
                        {activeSong?.title === song.title && isPlaying ? (
                          <>
                            <span className="material-symbols-outlined text-on-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>pause</span>
                            Pause
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                            Play
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </section>

            {/* Tag Pills Section */}
            {result.genres && result.genres.length > 0 && (
              <section className="mt-20 flex flex-wrap justify-center gap-3">
                {result.genres.map((g, i) => (
                  <button key={i} className="px-6 py-2.5 rounded-full bg-surface-container/50 border border-white/5 text-on-surface-variant font-label-sm hover:text-secondary hover:border-secondary/50 hover:bg-secondary/5 transition-all active:scale-95 uppercase tracking-wider">
                    #{g}
                  </button>
                ))}
              </section>
            )}

            {/* Full Playlist CTA */}
            <section className="mt-20 text-center">
              <a 
                href={getTamilPlaylistUrl(result.mood)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 bg-secondary/20 border border-secondary/30 text-secondary px-12 py-5 rounded-full font-title-md hover:bg-secondary/30 hover:scale-105 active:scale-95 transition-all glow-green"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>sensors</span>
                Open Tamil Playlist on Spotify
              </a>
            </section>
          </>
        )}

        {/* Home / Recently Played View */}
        {currentView === "home" && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
              <h2 className="text-2xl md:text-3xl font-headline-lg text-white">Quick Picks</h2>
            </div>
            {recentSongs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                {recentSongs.map((song, i) => (
                  <div 
                    key={i} 
                    className="group flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handlePlayFull(song)}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 relative overflow-hidden rounded-md bg-surface-container-highest">
                      {song.image ? (
                        <img 
                          alt={song.title} 
                          className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" 
                          src={song.image} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-white/20">music_note</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {activeSong?.title === song.title && isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0 pr-2 flex-grow">
                      <h3 className={`font-title-md truncate text-sm md:text-base mb-0.5 ${activeSong?.title === song.title ? 'text-secondary' : 'text-white group-hover:underline'}`} title={song.title}>
                        {song.title}
                      </h3>
                      <p className="text-on-surface-variant text-xs md:text-sm truncate" title={song.artist}>
                        {song.artist}
                      </p>
                    </div>

                    <button 
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(song)
                      }}
                      title="Like"
                    >
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: likedSongs.some(s => s.title === song.title) ? "'FILL' 1" : "'FILL' 0", color: likedSongs.some(s => s.title === song.title) ? 'var(--primary)' : 'inherit' }}>favorite</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-[32px] text-center border-white/5 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/50 mb-4">music_off</span>
                <p className="font-title-md text-on-surface-variant text-lg">Your quick picks are empty.</p>
                <p className="text-on-surface-variant/60">Search for a mood above to start playing music!</p>
              </div>
            )}
          </section>
        )}

        {/* Moods View */}
        {currentView === "moods" && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">mood</span>
              <h2 className="text-2xl md:text-3xl font-headline-lg text-white">Explore Moods</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { name: 'Happy', icon: 'sentiment_satisfied', color: 'from-yellow-500/20 to-orange-500/20', border: 'border-yellow-500/30' },
                { name: 'Sad', icon: 'sentiment_dissatisfied', color: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-500/30' },
                { name: 'Romantic', icon: 'favorite', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30' },
                { name: 'Angry', icon: 'local_fire_department', color: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30' },
                { name: 'Chill', icon: 'self_improvement', color: 'from-teal-500/20 to-emerald-500/20', border: 'border-teal-500/30' },
                { name: 'Party', icon: 'celebration', color: 'from-purple-500/20 to-fuchsia-500/20', border: 'border-purple-500/30' },
                { name: 'Focus', icon: 'psychology', color: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30' },
                { name: 'Workout', icon: 'fitness_center', color: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30' },
              ].map(mood => (
                <button
                  key={mood.name}
                  onClick={() => {
                    setInputText(mood.name)
                    analyzeMood(mood.name)
                  }}
                  className={`flex flex-col items-center justify-center gap-4 p-6 md:p-8 rounded-3xl bg-gradient-to-br ${mood.color} border ${mood.border} hover:scale-105 active:scale-95 transition-all group`}
                >
                  <span className="material-symbols-outlined text-4xl md:text-5xl text-white group-hover:scale-110 transition-transform">
                    {mood.icon}
                  </span>
                  <span className="font-headline-lg text-lg md:text-xl text-white tracking-wide">{mood.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Playlists View */}
        {currentView === "playlists" && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">queue_music</span>
              <h2 className="text-2xl md:text-3xl font-headline-lg text-white">Your Playlist</h2>
            </div>
            {playlist.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                {playlist.map((song, i) => (
                  <div 
                    key={i} 
                    className="group flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handlePlayFull(song)}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 relative overflow-hidden rounded-md bg-surface-container-highest">
                      {song.image ? (
                        <img 
                          alt={song.title} 
                          className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" 
                          src={song.image} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-white/20">music_note</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {activeSong?.title === song.title && isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0 pr-2 flex-grow">
                      <h3 className={`font-title-md truncate text-sm md:text-base mb-0.5 ${activeSong?.title === song.title ? 'text-secondary' : 'text-white group-hover:underline'}`} title={song.title}>
                        {song.title}
                      </h3>
                      <p className="text-on-surface-variant text-xs md:text-sm truncate" title={song.artist}>
                        {song.artist}
                      </p>
                    </div>

                    <button 
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePlaylist(song)
                      }}
                      title="Remove from Playlist"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-[32px] text-center border-white/5 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/50 mb-4">music_off</span>
                <p className="font-title-md text-on-surface-variant text-lg">Your playlist is empty.</p>
                <p className="text-on-surface-variant/60">Search for a mood and click the + button to add songs here!</p>
              </div>
            )}
          </section>
        )}

        {/* Liked Songs View */}
        {currentView === "likes" && (
          <section className="animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
              <span className="material-symbols-outlined text-primary text-3xl">favorite</span>
              <h2 className="text-2xl md:text-3xl font-headline-lg text-white">Liked Songs</h2>
            </div>
            {likedSongs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                {likedSongs.map((song, i) => (
                  <div 
                    key={i} 
                    className="group flex items-center gap-4 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => handlePlayFull(song)}
                  >
                    <div className="w-14 h-14 md:w-16 md:h-16 shrink-0 relative overflow-hidden rounded-md bg-surface-container-highest">
                      {song.image ? (
                        <img 
                          alt={song.title} 
                          className="w-full h-full object-cover group-hover:opacity-50 transition-opacity" 
                          src={song.image} 
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-2xl text-white/20">music_note</span>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                          {activeSong?.title === song.title && isPlaying ? 'pause' : 'play_arrow'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col min-w-0 pr-2 flex-grow">
                      <h3 className={`font-title-md truncate text-sm md:text-base mb-0.5 ${activeSong?.title === song.title ? 'text-secondary' : 'text-white group-hover:underline'}`} title={song.title}>
                        {song.title}
                      </h3>
                      <p className="text-on-surface-variant text-xs md:text-sm truncate" title={song.artist}>
                        {song.artist}
                      </p>
                    </div>

                    <button 
                      className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-primary hover:text-white hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleLike(song)
                      }}
                      title="Unlike"
                    >
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 rounded-[32px] text-center border-white/5 flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/50 mb-4">favorite_border</span>
                <p className="font-title-md text-on-surface-variant text-lg">You haven't liked any songs yet.</p>
                <p className="text-on-surface-variant/60">Click the heart icon on any song to add it to your Liked Songs!</p>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Persistent Music Player Bar */}
      {activeSong && (
        <footer className="fixed bottom-0 left-0 w-full z-50 player-bar flex items-center px-container-padding md:h-32">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-[1fr_auto_1fr] md:grid-cols-3 items-center gap-4 md:gap-8 py-4">
            
            {/* Left: Track Info */}
            <div className="flex items-center gap-4 md:gap-6 min-w-0">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl overflow-hidden border border-white/10 shrink-0 shadow-lg bg-surface-container-highest">
                {activeSong.image ? (
                  <img alt="Album" className="w-full h-full object-cover" src={activeSong.image} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-white/20">music_note</span>
                  </div>
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-on-surface font-headline-lg text-lg md:text-xl truncate mb-1">{activeSong.title}</h4>
                <p className="text-on-surface-variant font-title-md text-sm md:text-base truncate">{activeSong.artist}</p>
              </div>
            </div>

            {/* Center: Controls */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-4 md:gap-8">
                <button className="text-on-surface-variant hover:text-white transition-colors hidden md:block" onClick={handleComingSoon}>
                  <span className="material-symbols-outlined text-2xl">shuffle</span>
                </button>
                <button 
                  className="text-white hover:scale-110 transition-transform"
                  onClick={playPreviousTrack}
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>skip_previous</span>
                </button>
                <button 
                  className="w-12 h-12 md:w-14 md:h-14 bg-white rounded-full flex items-center justify-center text-surface hover:scale-105 active:scale-95 transition-all shadow-xl"
                  onClick={togglePlayPause}
                >
                  <span className="material-symbols-outlined text-3xl md:text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {isPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button 
                  className="text-white hover:scale-110 transition-transform"
                  onClick={playNextTrack}
                >
                  <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>skip_next</span>
                </button>
                <button className="text-on-surface-variant hover:text-white transition-colors hidden md:block" onClick={handleComingSoon}>
                  <span className="material-symbols-outlined text-2xl">repeat</span>
                </button>
              </div>
              <div className="w-full max-w-lg flex items-center gap-4">
                <span className="text-xs font-label-sm text-on-surface-variant w-10 text-right">{formatTime(currentTime)}</span>
                <div className="h-1.5 flex-grow progress-track rounded-full relative group cursor-pointer">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={duration ? (currentTime / duration) * 100 : 0}
                    onChange={handleSeek}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div 
                    className="absolute inset-y-0 left-0 bg-primary rounded-full group-hover:bg-secondary transition-colors z-10" 
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  ></div>
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md z-10" 
                    style={{ left: `calc(${duration ? (currentTime / duration) * 100 : 0}% - 8px)` }}
                  ></div>
                </div>
                <span className="text-xs font-label-sm text-on-surface-variant w-10">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right: Volume & Queue */}
            <div className="flex items-center justify-end gap-4 md:gap-8">
              <button 
                className="text-on-surface-variant hover:text-white transition-colors"
                onClick={() => {
                  audioRef.pause()
                  setActiveSong(null)
                  setIsPlaying(false)
                }}
                title="Close Player"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
              <div className="hidden md:flex items-center gap-4 group">
                <span className="material-symbols-outlined text-2xl text-on-surface-variant group-hover:text-white">
                  {volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
                </span>
                <div className="w-24 lg:w-32 h-1.5 progress-track rounded-full relative cursor-pointer">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume * 100}
                    onChange={handleVolumeChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                  />
                  <div 
                    className="absolute inset-y-0 left-0 bg-white/40 rounded-full group-hover:bg-primary transition-colors z-10" 
                    style={{ width: `${volume * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

          </div>
        </footer>
      )}

      {/* Mobile Navigation (Overlaying Player) */}
      <nav className="md:hidden fixed bottom-24 left-4 right-4 z-40 bg-surface-container-low/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-2 flex justify-around">
        <button className={`flex flex-col items-center justify-center rounded-xl px-6 py-2 ${currentView === 'home' ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:text-white'}`} onClick={() => setCurrentView('home')}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
          <span className="font-label-sm mt-1">Home</span>
        </button>
        <button className={`flex flex-col items-center justify-center rounded-xl px-6 py-2 ${currentView === 'moods' ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:text-white'}`} onClick={() => setCurrentView('moods')}>
          <span className="material-symbols-outlined">mood</span>
          <span className="font-label-sm mt-1">Moods</span>
        </button>
        <button className={`flex flex-col items-center justify-center rounded-xl px-6 py-2 ${currentView === 'playlists' ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:text-white'}`} onClick={() => setCurrentView('playlists')}>
          <span className="material-symbols-outlined">queue_music</span>
          <span className="font-label-sm mt-1">Playlists</span>
        </button>
        <button className={`flex flex-col items-center justify-center rounded-xl px-6 py-2 ${currentView === 'likes' ? 'text-secondary bg-secondary/10' : 'text-on-surface-variant hover:text-white'}`} onClick={() => setCurrentView('likes')}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: currentView === 'likes' ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
          <span className="font-label-sm mt-1">Likes</span>
        </button>
      </nav>
    </>
  )
}

export default App
