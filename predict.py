import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Set this securely in Render Environment Variables
HF_API_KEY = os.getenv("HF_API_KEY", "") 

API_URL = "https://api-inference.huggingface.co/models/SamLowe/roberta-base-go_emotions"
headers = {"Authorization": f"Bearer {HF_API_KEY}"}

def load_model():
    """
    Dummy function for backward compatibility. 
    Models are no longer loaded locally to save RAM.
    """
    return "hf_api"

def preprocess_text(text):
    """
    Basic text preprocessing:
    - Lowercase
    - Strip whitespace
    """
    if not text:
        return ""
    return text.lower().strip()

def predict_emotion_simple(text):
    """
    Simple keyword-based detection for instant results (fallback).
    """
    text = text.lower()
    keywords = {
        "happy": ["happy", "good", "great", "awesome", "excited", "joy", "love", "wonderful", "cool"],
        "sad": ["sad", "bad", "depressed", "unhappy", "cry", "grief", "lonely", "exhausted", "tired"],
        "angry": ["angry", "mad", "furious", "irate", "hate", "rage"],
        "fear": ["scared", "fear", "afraid", "terrified", "nervous", "anxious", "worried"],
        "love": ["love", "crush", "heart", "romantic", "adore"],
        "calm": ["calm", "relax", "peace", "chill", "sleepy", "quiet"],
        "surprise": ["wow", "omg", "shock", "surprise", "amazing"]
    }
    
    detected_emotion = "neutral"
    max_count = 0
    
    for emotion, words in keywords.items():
        count = sum(1 for word in words if word in text)
        if count > max_count:
            max_count = count
            detected_emotion = emotion
            
    return detected_emotion, 0.8  # Dummy confidence

def query_huggingface(text):
    try:
        response = requests.post(API_URL, headers=headers, json={"inputs": text}, timeout=10)
        if response.status_code == 200:
            return response.json()
        print(f"HF API Error: {response.status_code} - {response.text}")
        return None
    except Exception as e:
        print(f"Failed to reach HF API: {e}")
        return None

def predict_emotion(text, classifier=None):
    """
    Predicts the emotion from the input text.
    Returns the top detected emotion and its score.
    """
    text = preprocess_text(text)
    if not text:
        return None, 0.0
    
    if classifier == "simple" or not HF_API_KEY:
         return predict_emotion_simple(text)
    
    results = query_huggingface(text)
    if results and isinstance(results, list) and isinstance(results[0], list):
        scores = results[0]
        scores.sort(key=lambda x: x['score'], reverse=True)
        top_emotion = scores[0]['label']
        confidence = scores[0]['score']
        return top_emotion, confidence
    
    # Fallback if API fails
    return predict_emotion_simple(text)

def predict_top_k_emotions(text, k=3, classifier=None):
    """
    Returns the top k emotions.
    """
    text = preprocess_text(text)
    if not text:
        return []

    if classifier == "simple" or not HF_API_KEY:
        top, conf = predict_emotion_simple(text)
        return [{'label': top, 'score': conf}, {'label': 'neutral', 'score': 0.1}, {'label': 'calm', 'score': 0.1}]

    results = query_huggingface(text)
    if results and isinstance(results, list) and isinstance(results[0], list):
        scores = results[0]
        scores.sort(key=lambda x: x['score'], reverse=True)
        return scores[:k]
        
    # Fallback if API fails
    top, conf = predict_emotion_simple(text)
    return [{'label': top, 'score': conf}, {'label': 'neutral', 'score': 0.1}, {'label': 'calm', 'score': 0.1}]

if __name__ == "__main__":
    # Test
    text = "I am feeling a bit overwhelmed but excited about the new project!"
    emotion, conf = predict_emotion(text)
    print(f"Text: {text}")
    print(f"Emotion: {emotion} ({conf:.2f})")
