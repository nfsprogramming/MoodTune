import random
import urllib.parse
import requests
import concurrent.futures

def get_music_recommendation(emotion):
    """
    Returns a list of music genres/styles based on the detected emotion.
    Prioritizes Tamil Music methods.
    """
    emotion = emotion.lower()
    
    # Keeping genres for broad context
    mapping = {
        "happy": ["Anirudh Vibes", "Thalapathy Fast Beats", "Club Hits 2024", "Insta Trending Tamil"],
        "joy": ["Anirudh Vibes", "Thalapathy Fast Beats", "Club Hits 2024", "Insta Trending Tamil"],
        "sad": ["Sid Sriram Soul", "Pradeep Kumar Melodies", "AR Rahman 2020s", "Yuvan Drug"],
        "sadness": ["Sid Sriram Soul", "Pradeep Kumar Melodies", "AR Rahman 2020s", "Yuvan Drug"],
        "angry": ["Ani Rockstar Mode", "Santhosh Narayanan Raw", "Vikram Squad", "Leo Badass"],
        "anger": ["Ani Rockstar Mode", "Santhosh Narayanan Raw", "Vikram Squad", "Leo Badass"],
        "love": ["Pradeep Kumar Love", "GVM New Age", "Anirudh Melody", "Dhanush Love Hits"],
        "calm": ["Nivas K Prasanna", "Sean Roldan Chill", "Midnight Vibes", "Rain Effect"],
        "relief": ["Nivas K Prasanna", "Sean Roldan Chill", "Midnight Vibes", "Rain Effect"],
        "fear": ["Divine Connect", "Peaceful Flute", "Slow Piano", "Nature"],
        "neutral": ["Tamil Indie Scene", "Think Music Originals", "Coke Studio Tamil", "Vibe Mode"],
        "surprise": ["Remix Mode", "Trap City Tamil", "DJ Walta"],
        "disgust": ["Focus Beats", "Pure Instrumental", "Binary Beats"]
    }
    
    return mapping.get(emotion, ["Tamil Viral", "Trending Now"])

def get_itunes_metadata(song_title, artist):
    """
    Fetches cover art and preview link from iTunes API.
    Retries with just the song title if the combination fails.
    """
    def fetch(query_str):
        try:
            url = f"https://itunes.apple.com/search?term={urllib.parse.quote(query_str)}&entity=song&limit=1"
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                return response.json().get('results', [])
        except:
            return []
        return []

    # Attempt 1: Title + Artist
    # Remove any parenthetical info from artist for better search (e.g. "Anirudh (Leo)" -> "Anirudh")
    clean_artist = artist.split('(')[0].strip()
    results = fetch(f"{song_title} {clean_artist}")
    
    # Attempt 2: Just Title (if specific enough)
    if not results:
        results = fetch(song_title)

    if results:
        track = results[0]
        # cell phone quality 100x100 -> decent quality 600x600 replacement
        artwork_url = track.get('artworkUrl100', '').replace('100x100', '600x600')
        return {
            "image": artwork_url,
            "preview": track.get('previewUrl')
        }
    
    return {"image": None, "preview": None}


def get_specific_song_recommendations(emotion):
    """
    Returns specific modern Tamil song recommendations dynamically from YouTube (to ensure latest/upcoming songs)
    with a fallback to the static database.
    """
    emotion = emotion.lower()
    
    def create_spotify_search_link(song, artist):
        query = f"{song} {artist}"
        encoded_query = urllib.parse.quote(query)
        return f"https://open.spotify.com/search/{encoded_query}"

    # Map complex emotions to simple keys
    if emotion in ["joy", "surprise", "excited"]: emotion = "happy"
    if emotion in ["sadness", "disgust", "lonely", "grief"]: emotion = "sad"
    if emotion in ["anger", "frustrated"]: emotion = "angry"
    if emotion in ["relief", "relaxed"]: emotion = "calm"
    if emotion in ["romantic"]: emotion = "love"

    # 1. Try to fetch dynamically to get the latest/upcoming Tamil songs
    import yt_dlp
    
    query_map = {
        "happy": "latest tamil fast beat kuthu songs audio",
        "sad": "latest tamil sad melody songs audio",
        "angry": "latest tamil mass bgm songs audio",
        "love": "latest tamil romantic melody songs audio",
        "calm": "latest tamil relaxing chill songs audio"
    }
    search_term = query_map.get(emotion, f"latest tamil {emotion} songs audio")
    
    ydl_opts = {
        'extract_flat': True,
        'quiet': True,
        'no_warnings': True,
    }
    
    dynamic_songs = []
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Search for more items to filter out compilations
            info = ydl.extract_info(f"ytsearch30:{search_term}", download=False)
            entries = info.get('entries', [])
            
            for e in entries:
                title = e.get('title', '')
                t_lower = title.lower()
                
                # Filter out obvious compilations, jukeboxes, or full movies
                if any(word in t_lower for word in ['jukebox', 'collection', 'hits', 'mashup', 'playlist', 'bgm compilation']):
                    continue
                
                # YouTube video IDs provide high quality thumbnails
                vid = e.get('id')
                if not vid:
                    continue
                    
                dynamic_songs.append({
                    "title": title,
                    "artist": e.get('uploader', 'Unknown Artist'),
                    "image": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                    "preview_audio": None, # Local yt-dlp playback will handle full audio
                    "link": create_spotify_search_link(title, e.get('uploader', ''))
                })
                
                if len(dynamic_songs) >= 12:
                    break
    except Exception as e:
        print(f"Dynamic fetch failed: {e}")

    if len(dynamic_songs) >= 6:
        return dynamic_songs

    # 2. Fallback to expanded Database if dynamic fetching fails or doesn't return enough results
    song_db_raw = {
        "happy": [
            {"title": "Hukum", "artist": "Anirudh"},
            {"title": "Naa Ready", "artist": "Anirudh"},
            {"title": "Kaavaalaa", "artist": "Anirudh"},
            {"title": "Arabic Kuthu", "artist": "Anirudh"},
            {"title": "Chellamma", "artist": "Anirudh"},
            {"title": "Illuminati", "artist": "Sushin Shyam"},
            {"title": "Rowdy Baby", "artist": "Yuvan Shankar Raja"},
            {"title": "Verithanam", "artist": "AR Rahman"},
            {"title": "Aaluma Doluma", "artist": "Anirudh"},
            {"title": "Rakita Rakita Rakita", "artist": "Santhosh Narayanan"}
        ],
        "sad": [
            {"title": "Nira", "artist": "Sid Sriram"},
            {"title": "Chithirai Sevvanam", "artist": "Pradeep Kumar"},
            {"title": "Po Nila", "artist": "Pradeep Kumar"},
            {"title": "Ennodu Nee Irundhaal", "artist": "Sid Sriram"},
            {"title": "Maruvarthai", "artist": "Sid Sriram"},
            {"title": "Idhayathai Oru Kodi", "artist": "Yuvan Shankar Raja"},
            {"title": "Munbe Vaa", "artist": "AR Rahman"},
            {"title": "Ennai Vittu", "artist": "Yuvan Shankar Raja"},
            {"title": "Oru Deivam Thantha", "artist": "AR Rahman"},
            {"title": "Ava Enna", "artist": "Harris Jayaraj"}
        ],
        "angry": [
            {"title": "Badass", "artist": "Anirudh"},
            {"title": "Vikram Title Track", "artist": "Anirudh"},
            {"title": "Neruppu Da", "artist": "Santhosh Narayanan"},
            {"title": "Petta Parak", "artist": "Anirudh"},
            {"title": "Master the Blaster", "artist": "Anirudh"},
            {"title": "Kaththi Theme", "artist": "Anirudh"},
            {"title": "Bloody Sweet", "artist": "Anirudh"},
            {"title": "Mankatha Theme", "artist": "Yuvan Shankar Raja"},
            {"title": "Karu Karu", "artist": "Harris Jayaraj"},
            {"title": "Pudhu Pettai Theme", "artist": "Yuvan Shankar Raja"}
        ],
        "love": [
            {"title": "Naan Pizhai", "artist": "Anirudh"},
            {"title": "Megham Karukatha", "artist": "Dhanush"},
            {"title": "Mallipoo", "artist": "AR Rahman"},
            {"title": "Aga Naga", "artist": "AR Rahman"},
            {"title": "Mudhal Nee Mudivum Nee", "artist": "Darbuka Siva"},
            {"title": "Vaseegara", "artist": "Harris Jayaraj"},
            {"title": "Ennavale", "artist": "AR Rahman"},
            {"title": "Ondra Renda Aasaigal", "artist": "Harris Jayaraj"},
            {"title": "Hosanna", "artist": "AR Rahman"},
            {"title": "Thuli Thuli", "artist": "Yuvan Shankar Raja"}
        ],
        "calm": [
            {"title": "Thenmozhi", "artist": "Santhosh Narayanan"},
            {"title": "Maya Nadh", "artist": "Santhosh Narayanan"},
            {"title": "Katchi Sera", "artist": "Sai Abhyankkar"},
            {"title": "Railin Oligal", "artist": "Govind Vasantha"},
            {"title": "Life of Pazham", "artist": "Anirudh"},
            {"title": "Vellai Pookal", "artist": "AR Rahman"},
            {"title": "Uyire", "artist": "Sid Sriram"},
            {"title": "Kaatrin Mozhi", "artist": "AR Rahman"},
            {"title": "Iru Pookal", "artist": "Yuvan Shankar Raja"},
            {"title": "Neeyum Naanum", "artist": "Anirudh"}
        ]
    }
    
    target_emotion = emotion if emotion in song_db_raw else "happy"
    pool = song_db_raw.get(target_emotion)
    selected_songs = random.sample(pool, min(12, len(pool)))
    
    # Enrich with iTunes Metadata (Parallel Execution)
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
        future_to_song = {executor.submit(get_itunes_metadata, song['title'], song['artist']): song for song in selected_songs}
        
        for future in concurrent.futures.as_completed(future_to_song):
            song = future_to_song[future]
            try:
                data = future.result()
                song['image'] = data['image']
                song['preview_audio'] = data['preview']
            except Exception as exc:
                song['image'] = None
                song['preview_audio'] = None
                
    for song in selected_songs:
        song['link'] = create_spotify_search_link(song['title'], song['artist'])
        
    return selected_songs

def get_playlist_link(emotion):
    """
    Returns a dynamic Spotify search link for Tamil playlists matching the emotion.
    """
    emotion = emotion.lower()
    
    # Map synonyms
    if emotion in ["joy", "surprise"]: emotion = "happy"
    if emotion in ["sadness", "disgust", "lonely", "grief"]: emotion = "sad"
    if emotion in ["anger", "frustrated"]: emotion = "angry"
    if emotion in ["relief", "relaxed"]: emotion = "calm"
    if emotion in ["romantic"]: emotion = "love"
    
    queries = {
        "happy": "Tamil Kuthu Hits",
        "sad": "Tamil Sad Melody",
        "angry": "Kollywood Mass",
        "love": "Tamil Romance",
        "calm": "Tamil Relaxing Music",
        "neutral": "Tamil Indie",
        "fear": "Tamil Peaceful Flute"
    }
    
    query = queries.get(emotion, f"Tamil {emotion} songs")
    encoded_query = urllib.parse.quote(query)
    
    # Directs to Spotify search, filtered by playlists
    return f"https://open.spotify.com/search/{encoded_query}/playlists"
