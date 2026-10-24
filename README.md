# 🎵 MoodTune

> **Discover music that resonates with your feelings.**  
> AI-powered emotion detection → real-time Tamil music recommendations → full-fidelity audio streaming.

---

## 📖 Overview

**MoodTune** is a full-stack, AI-driven music recommendation application designed to translate human emotion into a tailored musical journey. Users express how they feel in natural language, and MoodTune analyzes the sentiment using NLP models (with automatic fallback to keyword heuristics). It dynamically queries, streams, and organizes modern Tamil music matching the detected vibe—featuring full YouTube audio playback, iTunes album art, and Spotify playlist integration.

---

## ✨ Features

- 🧠 **Dual-Engine Emotion Analysis**:
  - **Hugging Face RoBERTa** (`SamLowe/roberta-base-go_emotions`) for deep emotion classification across 28 fine-grained emotional states.
  - **Heuristic Keyword Engine** for instant, zero-latency local fallback without requiring an API key.
- 🎶 **Live Tamil Music Discovery**:
  - Dynamically searches and parses YouTube for the latest fast beat, melody, mass BGM, romantic, and chill tracks.
  - Curated fallback catalog featuring top Kollywood composers (Anirudh, AR Rahman, Yuvan Shankar Raja, Santhosh Narayanan, Sid Sriram, and Pradeep Kumar).
- ▶️ **Full Audio Streaming**:
  - Streams full-length high-bitrate audio directly from YouTube via `yt-dlp` instead of short 30-second previews.
- 🎨 **Enriched Visuals & Links**:
  - Concurrently queries the iTunes Search API for high-resolution 600x600 cover artwork.
  - Generates direct Spotify playlist deep-search links for extended listening.
- 🎛️ **Modern Player & Queue**:
  - Embedded audio player with seek slider, volume control, and continuous queue playback.
- 💾 **Persistent Library**:
  - **Liked Songs**: Save favorite tracks with one click.
  - **Custom Playlist**: Build custom mixes persisted in browser `localStorage`.
  - **Recent Plays**: Revisit previously streamed tracks on the Home dashboard.
  - **Moods Explorer**: Instant one-tap mood selection (Happy, Sad, Angry, Romantic, Calm).

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
|---|---|---|
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) | High-performance asynchronous REST API |
| **Language** | [Python 3.12](https://www.python.org/) | Server logic, recommender engine, and NLP pipelines |
| **Audio Extraction** | [yt-dlp](https://github.com/yt-dlp/yt-dlp) | YouTube stream resolution and audio extraction |
| **NLP & Inference** | Hugging Face Inference API / Keyword Heuristic | Sentiment & emotion detection |
| **Frontend Framework**| [React 19](https://react.dev/) + [Vite 7](https://vite.dev/) | High-speed Single Page Application (SPA) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + Glassmorphism | Custom dark theme, responsive layout, fluid animations |
| **Icons & Motion** | [Lucide React](https://lucide.dev/) + [Framer Motion](https://www.framer.com/motion/) | UI icons, micro-interactions, and animated transitions |
| **Testing** | [pytest](https://docs.pytest.org/) + [Starlette TestClient](https://fastapi.tiangolo.com/tutorial/testing/) | Unit and endpoint testing |

---

## 🗂️ Project Structure

```
MoodTune/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # Automated test & build pipeline
│       └── release.yml            # Automated distribution release pipeline
├── recommender/
│   └── emotion_to_music.py        # Emotion-to-music mapping, YouTube scraping & iTunes metadata
├── tests/
│   ├── test_api.py                # Automated pytest suite for backend & recommender
│   └── smoke_youtube.py           # Manual YouTube audio extraction smoke test
├── frontend/
│   ├── public/
│   │   └── favicon.png            # Application favicon
│   ├── src/
│   │   ├── App.jsx                # Main React application (views, state & player)
│   │   ├── App.css                # Custom animation and component styles
│   │   ├── index.css              # Tailwind base layer & design utilities
│   │   └── main.jsx               # React DOM entry point
│   ├── index.html                 # HTML shell with Tailwind configuration
│   ├── package.json               # Frontend dependencies & scripts
│   ├── vite.config.js             # Vite build configuration
│   └── eslint.config.js           # ESLint 9 configuration
├── predict.py                     # Standalone emotion prediction module
├── server.py                      # FastAPI application entry point
├── requirements.txt               # Backend Python dependencies
├── pytest.ini                     # Pytest configuration
├── .env.example                   # Environment variable template
├── .gitignore                     # Git ignore rules for Python, Node & OS files
├── LICENSE                        # MIT License
└── README.md                      # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** and **npm**

---

### 1. Clone the Repository

```bash
git clone https://github.com/nfsprogramming/nfs-moodtune.git
cd nfs-moodtune
```

---

### 2. Backend Setup

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure environment (optional):**
   ```bash
   cp .env.example .env
   ```
   Add your Hugging Face API key to `.env` if you wish to use RoBERTa model inference:
   ```env
   HF_API_KEY=your_huggingface_token_here
   ```
   *Note: If `HF_API_KEY` is not provided, MoodTune automatically operates in fast heuristic mode.*

3. **Start the API server:**
   ```bash
   python server.py
   ```
   The backend API will run on `http://localhost:8000`. You can explore interactive API docs at `http://localhost:8000/docs`.

---

### 3. Frontend Setup

1. **Navigate to the frontend directory and install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:5173`.

---

## 📡 API Reference

| Method | Endpoint | Description | Sample Request |
|---|---|---|---|
| `GET` | `/` | Health check & version information | N/A |
| `POST` | `/predict` | Analyzes text sentiment and returns emotion, confidence, and recommended songs | `{"text": "Excited for the weekend!", "model": "simple"}` |
| `POST` | `/get_youtube_id` | Searches YouTube for a song and returns video ID | `{"title": "Hukum", "artist": "Anirudh"}` |
| `POST` | `/get_youtube_audio` | Resolves YouTube audio stream URL for playback | `{"title": "Hukum", "artist": "Anirudh"}` |

---

## 🧪 Testing & Validation

### Backend Tests

Execute the automated `pytest` test suite:
```bash
pytest -v
```

To run the YouTube stream resolution smoke test:
```bash
python tests/smoke_youtube.py
```

### Frontend Checks

Lint and validate the production bundle:
```bash
cd frontend
npm run lint
npm run build
```

---

## 📦 Production Build

To build the client application for production:
```bash
cd frontend
npm run build
```
The optimized static bundle will be generated in `frontend/dist/`.

---

## 📄 License

This project is licensed under the terms of the [MIT License](LICENSE).  
Copyright (c) 2026 **NFS Programming**.
