"""
MoodTune API & Recommender Test Suite
"""
import pytest
from fastapi.testclient import TestClient
from server import app
from predict import predict_emotion_simple, preprocess_text, predict_top_k_emotions
from recommender.emotion_to_music import (
    get_music_recommendation,
    get_playlist_link,
    get_specific_song_recommendations
)

client = TestClient(app)

def test_health_check():
    """Verify root health check endpoint returns 200 and expected status."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "MoodTune API is running"
    assert "version" in data

def test_preprocess_text():
    """Verify text preprocessing normalizes whitespace and case."""
    assert preprocess_text("  Feeling HAPPY!  ") == "feeling happy!"
    assert preprocess_text("") == ""
    assert preprocess_text(None) == ""

def test_predict_emotion_simple():
    """Verify keyword-based emotion prediction works for standard moods."""
    emotion, conf = predict_emotion_simple("I am so happy and excited today!")
    assert emotion == "happy"
    assert conf > 0.5

    emotion_sad, _ = predict_emotion_simple("Feeling lonely and depressed.")
    assert emotion_sad == "sad"

    emotion_angry, _ = predict_emotion_simple("I am so mad and furious right now.")
    assert emotion_angry == "angry"

def test_predict_top_k_emotions():
    """Verify predict_top_k_emotions returns requested number of emotions."""
    top_k = predict_top_k_emotions("Excited and full of joy!", k=3, classifier="simple")
    assert len(top_k) >= 1
    assert top_k[0]["label"] == "happy"

def test_get_music_recommendation():
    """Verify genre recommendations for key emotions."""
    happy_genres = get_music_recommendation("happy")
    assert isinstance(happy_genres, list)
    assert len(happy_genres) > 0

    sad_genres = get_music_recommendation("sad")
    assert isinstance(sad_genres, list)
    assert len(sad_genres) > 0

def test_get_playlist_link():
    """Verify Spotify search playlist link generation."""
    link = get_playlist_link("happy")
    assert "open.spotify.com/search" in link
    assert "playlists" in link

def test_api_predict_endpoint():
    """Verify POST /predict returns emotions, recommendations, and playlist link."""
    payload = {
        "text": "I am having a wonderful and great day!",
        "model": "simple"
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["mood"] == "happy"
    assert "confidence" in data
    assert "recommendations" in data
    assert isinstance(data["recommendations"], list)
    assert "genres" in data
    assert "playlist_link" in data
