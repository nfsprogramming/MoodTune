"""
Test script to verify YouTube audio extraction works
"""
import requests
import json

# Test the YouTube audio endpoint
url = "http://localhost:8000/get_youtube_audio"
data = {
    "title": "Hukum",
    "artist": "Anirudh"
}

print("Testing YouTube audio extraction...")
print(f"Song: {data['title']} - {data['artist']}")
print("-" * 50)

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ SUCCESS!")
        print(f"Audio URL: {result.get('audio_url', 'None')[:100]}...")
        print(f"Video ID: {result.get('video_id')}")
        print(f"Title: {result.get('title')}")
        print(f"Duration: {result.get('duration')} seconds")
        
        if result.get('audio_url'):
            print("\n🎵 Full song URL obtained successfully!")
        else:
            print("\n⚠️ No audio URL - check error:", result.get('error'))
    else:
        print(f"\n❌ Error: {response.text}")
        
except Exception as e:
    print(f"\n❌ Exception: {e}")
