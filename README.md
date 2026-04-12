# AI Mock Interview Platform 🚀

A professional, AI-powered interview preparation system that leverages Large Language Models (LLM), browser-native voice intelligence, and a distributed cloud architecture to provide realistic mock interview experiences.

---

## 🏗️ Architecture Overview

The system follows a **Modern Distributed Architecture** with a clear separation between the presentation layer and the intelligence layer.

### Core Philosophy: The Stateless Backend
Unlike traditional applications that store sessions in a database, this project uses a **Stateless Intelligence Layer** on the backend.
- **Frontend (Presentation & Persistence)**: React (Vite) manages the state of the interview and persists documents directly to **Firebase Firestore**.
- **Backend (Intelligence)**: FastAPI acts as a high-performance wrapper for the LLM. It maintains no local database; instead, it receives the full context (resume, history, and role) in every request, processes it via LangChain, and returns structured intelligence.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 18, Vite, CSS3 (Glassmorphism), Lucide-React |
| **Backend** | FastAPI, Python 3.10+, Uvicorn |
| **AI / LLM** | Groq (Llama 3 70B), LangChain, LangChain-Groq |
| **Auth / Data** | Firebase Authentication, Cloud Firestore |
| **Voice APIs** | Web Speech API (Browser-native `SpeechRecognition` & `SpeechSynthesis`) |
| **Parsing** | PyPDF2 (PDF logic), Pydantic (Data schemas) |

---

## 📂 Folder Structure

### Backend (`/backend`)
```text
backend/
├── app/
│   ├── api/            # FastAPI Routers (interviews.py, auth.py)
│   ├── core/           # Config, Firebase Admin init, Security, Logging
│   ├── schemas/        # Pydantic models for request/response validation
│   ├── services/       # Business Logic (LLM chains, Voice, Resume parsing)
│   └── main.py         # App entry point, Lifespan, Middleware (CORS)
├── requirements.txt    # Dependency manifest
└── run.py              # Application runner
```

### Frontend (`/frontend`)
```text
frontend/
├── src/
│   ├── assets/         # Images, SVG icons
│   ├── components/     # UI Components (Navbar, AuthContext)
│   ├── pages/          # View logic (Landing, Interview, Report, History)
│   ├── api.js          # Unified API handler and Firestore persistence logic
│   ├── firebase.js     # Client-side Firebase initialization
│   ├── App.jsx         # Routing and Global Layout
│   └── index.css       # Design System (Glassmorphic theme)
├── index.html          # Entry HTML
└── vite.config.js      # Build configuration
```

---

## 🔐 Authentication & Security

### Token-Based Authentication
The system uses a **Stateless JWT-based flow** powered by Firebase.
1. **Frontend**: The user logs in via Firebase Client SDK.
2. **Persistence**: The client stores the user's ID Token.
3. **API Security**: For every backend request, the token is sent in the `Authorization: Bearer <TOKEN>` header.
4. **Backend Verification**: `backend/app/core/security.py` uses the `firebase_admin` SDK to verify the token signature and expiration of every request without needing a session database.
   - *Logic*: `auth.verify_id_token(token)` returns the user's unique `uid`.

### Infrastructure Security
- **CORS**: Configured in `main.py` to allow specific production and development origins.
- **Environment Isolation**: Sensitive keys (GROQ API Key, Firebase Service Account) are managed via `.env` files.

---

## 💾 Database & Persistence

### Firestore Schema
The application uses a NoSQL document structure categorized by user UID for strict data isolation.

**Path**: `users/{uid}/interviews/{interview_id}`

| Field | Type | Description |
| :--- | :--- | :--- |
| `role` | String | Target job role (e.g., "Fullstack Developer") |
| `experience` | Number | Years of experience |
| `interview_type` | String | HR or Technical |
| `resume_text` | String | Extracted text from the candidate's PDF |
| `history` | Array | List of objects: `{question, answer, score, feedback, ideal_answer}` |
| `report` | Object | Final analytics summary (Strengths, Weaknesses, Score) |
| `status` | String | `created` | `in_progress` | `completed` |

---

## 🎙️ Voice Intelligence (STT & TTS)

The platform avoids expensive server-side audio processing by utilizing high-performance **Browser APIs**.

### 1. Speech-to-Text (STT)
- **API**: `window.webkitSpeechRecognition` (Chrome/Edge native).
- **Implementation**: In `Interview.jsx`, the system handles `interimResults`. This allows the user to see their words appear in real-time before the result is finalized.
- **Continuous Mode**: Set to `true` to allow long-form answers without the microphone cutting off.

### 2. Text-to-Speech (TTS)
- **API**: `window.speechSynthesis`.
- **Implementation**: The system selects high-quality "Google" or "Female" English voices automatically.
- **Flow**: The AI fetches a question → Voice speaks it → Timer starts only after the AI finishes speaking.

---

## 🧠 LLM Architecture (The "Brain")

The project uses **LangChain** to orchestrate interactions with **Llama 3 (via Groq LPUs)** for near-instant responses.

### 1. Resume Parsing
- **Flow**: `PyPDF2` extracts raw text → LLM parses it into a structured JSON containing `skills`, `summary`, `experience`, and `projects`.
- **Use Case**: This data is passed into the interview context to make the questions personalized.

### 2. Dynamic Question Generation
Generates questions based on a hierarchical logic:
- **Context Awareness**: Remembers the role and resume content.
- **Difficulty Scaling**: Increments difficulty based on the question index.
    - Questions 1-3: `Easy`
    - Questions 4-6: `Medium`
    - Questions 7-10: `Hard`
- **Topic Control**: Maintains a list of already covered topics to prevent repetition.

### 3. Answer Evaluation
Every answer is audited across multiple dimensions:
- **Score (0-10)**: Overall quality.
- **Correctness (0-10)**: Technical accuracy.
- **Feedback**: Qualitative analysis of the response.
- **Ideal Answer**: A high-quality model response for comparison.
- **Follow-up Logic**: If a score is `< 6`, the backend triggers a specific `generate_followup_question` chain to drill deeper into the candidate's weak area.

---

## 📊 Report Generation

### The Performance Dossier
1. **Analytics Endpoint**: Takes the entire interview history and uses a summarization LLM chain to compute:
    - Overall Strengths & Weaknesses.
    - Performance Trend (score per question).
    - Targeted Improvement Tips.
2. **PDF Conversion**:
    - Uses the **Browser's Print Engine**.
    - Frontend implements a custom `@media print` CSS layer to format the dashboard into a professional, non-interactive PDF document when the user clicks "Download Report".

---

## 🏗️ Infrastructure & Firebase Configuration

The project utilizes several root-level configuration files to manage cloud deployment and security.

### 1. `firebase.json`
The master configuration file for the Firebase project.
- **Firestore**: Points to `firestore.rules` and `firestore.indexes.json`.
- **Hosting**: Configures `frontend/dist` as the public directory for production deployment and implements **SPAs (Single Page Application)** rewrites so that all routes resolve to `index.html`.
- **Authentication**: Defines critical metadata for identity providers.

### 2. `firestore.rules`
Defines the **Security Policy** for the Cloud Firestore database.
- Implements granular access control ensuring `users/{uid}` can only access their own sub-collections.
- Enforces read/write permissions based on the `request.auth.uid` validation.

### 3. `firestore.indexes.json`
Stores composite index definitions. This ensures complex queries, such as sorting interviews by multiple fields or filtering results, are optimized for the NoSQL engine.

### 4. `.firebaserc`
Manages project aliases, mapping the local development environment to the specific Firebase Project ID on the Google Cloud platform.

---

## 🛠️ Root Utility Files

- **`run.py`**: A helper script to launch the FastAPI backend with hot-reloading enabled.
- **`requirements.txt`**: The definitive list of Python dependencies for the backend.
- **`.gitignore`**: Ensures that local environment variables (`.env`), database caches, and administrative credentials are not committed to version control.
- **`.python-version`**: Standardizes the Python interpreter version for consistency across development environments.

---



## 🚀 Setup & Deployment

### Backend
1. Install dependencies: `pip install -r requirements.txt`
2. Configure `.env`: `GROQ_API_KEY`, `FIREBASE_PROJECT_ID`.
3. Start server: `python run.py`

### Frontend
1. Install dependencies: `npm install`
2. Configure `.env`: `VITE_FIREBASE_CONFIG`.
3. Start dev server: `npm run dev`

---

