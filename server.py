"""
MoodTune - AI-Powered Emotion-Based Music Recommender
Copyright (c) 2026 NFS Programming
Licensed under MIT License

FastAPI Backend Server
Handles emotion prediction and music recommendations
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from predict import predict_top_k_emotions
from recommender.emotion_to_music import get_specific_song_recommendations, get_playlist_link
import requests
import re

app = FastAPI(title="MoodTune API", version="1.0.0")

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TextRequest(BaseModel):
    text: str
    model: str = "simple"

class SongRequest(BaseModel):
    title: str
    artist: str

@app.post("/predict")
def predict(request: TextRequest):
    """Analyze text emotion and return music recommendations"""
    try:
        request_classifier = "simple"
        if request.model == "advanced":
            request_classifier = None 
            
        top_emotions = predict_top_k_emotions(request.text, k=3, classifier=request_classifier)
        
        dominant_emotion = top_emotions[0]['label']
        confidence = top_emotions[0]['score']
        
        from recommender.emotion_to_music import get_music_recommendation
        
        songs = get_specific_song_recommendations(dominant_emotion)
        genres = get_music_recommendation(dominant_emotion)
        playlist_link = get_playlist_link(dominant_emotion)
        
        return {
            "mood": dominant_emotion,
            "confidence": confidence,
            "emotions": top_emotions,
            "recommendations": songs,
            "genres": genres,
            "playlist_link": playlist_link
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def read_root():
    """API health check"""
    return {"status": "MoodTune API is running", "version": "1.0.0"}

@app.post("/get_youtube_id")
def get_youtube_id(request: SongRequest):
    """Fetch YouTube video ID for a song"""
    try:
        query = f"{request.title} {request.artist} Audio"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }
        search_url = f"https://www.youtube.com/results?search_query={query}"
        response = requests.get(search_url, headers=headers)
        
        video_ids = re.findall(r'\"videoId\":\"([a-zA-Z0-9_-]{11})\"', response.text)
        
        if video_ids:
            return {"video_id": video_ids[0]}
        else:
            watch_ids = re.findall(r'/watch\\?v=([a-zA-Z0-9_-]{11})', response.text)
            if watch_ids:
                 return {"video_id": watch_ids[0]}
            
            raise HTTPException(status_code=404, detail="Song not found on YouTube")
            
    except Exception as e:
        print(f"Error fetching YouTube ID: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/get_youtube_audio")
def get_youtube_audio(request: SongRequest):
    """Extract YouTube audio stream URL for full song playback"""
    try:
        import yt_dlp
        
        query = f"{request.title} {request.artist} Audio"
        search_query = f"ytsearch1:{query}"
        
        ydl_opts = {
            'format': 'bestaudio/best',
            'quiet': True,
            'no_warnings': True,
            'extract_flat': False,
            'default_search': 'ytsearch',
            'noplaylist': True,
        }
        
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            try:
                info = ydl.extract_info(search_query, download=False)
                
                if 'entries' in info:
                    # It's a search result
                    video = info['entries'][0]
                else:
                    video = info
                
                # Get the best audio format URL
                if 'url' in video:
                    audio_url = video['url']
                elif 'formats' in video:
                    # Find best audio format
                    audio_formats = [f for f in video['formats'] if f.get('acodec') != 'none']
                    if audio_formats:
                        audio_url = audio_formats[-1]['url']
                    else:
                        audio_url = video['formats'][-1]['url']
                else:
                    return {"video_id": video.get('id'), "audio_url": None}
                
                return {
                    "audio_url": audio_url,
                    "video_id": video.get('id'),
                    "title": video.get('title'),
                    "duration": video.get('duration')
                }
                
            except Exception as e:
                print(f"yt-dlp extraction error: {e}")
                return {"audio_url": None, "error": str(e)}
                
    except ImportError:
        # Fallback to old method if yt-dlp not installed
        print("yt-dlp not installed, using fallback method")
        return {"audio_url": None, "error": "yt-dlp not installed"}
    except Exception as e:
        print(f"Error fetching YouTube audio: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
