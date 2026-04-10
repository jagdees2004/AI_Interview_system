import { auth, db } from './firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';

const API_BASE = 'http://localhost:8000/api/v1';

async function getFirebaseToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const token = await getFirebaseToken();
  const url = `${API_BASE}${path}`;
  const headers = { ...authHeaders(token), ...options.headers };
  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

// ── Auth ──────────────────────────────────────────

export function isLoggedIn() {
  return !!auth.currentUser;
}

export function logout() {
  // Handled by AuthContext.logout()
}

export async function getMe() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  return {
    id: user.uid,
    email: user.email,
    name: user.displayName,
    photo: user.photoURL,
  };
}

export async function getHistory() {
  const user = auth.currentUser;
  if (!user) return [];
  const snapshot = await getDocs(collection(db, 'users', user.uid, 'interviews'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => b.created_at - a.created_at);
}

// ── Interviews (Stateless API + Firestore) ─────────

export async function createInterview({ role, experience, interview_type, resume_text = '' }) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  
  const interviewData = {
    role,
    experience: Number(experience),
    interview_type,
    status: 'created',
    created_at: Date.now(),
    history: [], // Q/A pairs
    resume_text: resume_text
  };
  
  const docRef = await addDoc(collection(db, 'users', user.uid, 'interviews'), interviewData);
  return { id: docRef.id, ...interviewData };
}

export async function getInterview(interviewId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');
  const docRef = doc(db, 'users', user.uid, 'interviews', interviewId);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) throw new Error('Interview not found');
  return { id: snapshot.id, ...snapshot.data() };
}

export async function parseResumeFile(file) {
  const form = new FormData();
  form.append('resume', file);
  const result = await request(`/interviews/extract-resume`, {
    method: 'POST',
    body: form,
  });
  
  return result;
}

export async function startInterview(interviewId) {
  const interview = await getInterview(interviewId);
  
  const result = await request('/interviews/generate-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        role: interview.role,
        experience: interview.experience,
        interview_type: interview.interview_type,
        resume_text: interview.resume_text
      },
      history: []
    }),
  });
  
  const user = auth.currentUser;
  const docRef = doc(db, 'users', user.uid, 'interviews', interviewId);
  await updateDoc(docRef, { status: 'in_progress' });
  
  return { question_text: result.question, topic: result.topic, difficulty: result.difficulty };
}

export async function submitAnswer(interviewId, answerText, currentQuestion) {
  const interview = await getInterview(interviewId);
  
  const result = await request('/interviews/evaluate-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        role: interview.role,
        experience: interview.experience,
        interview_type: interview.interview_type,
        resume_text: interview.resume_text
      },
      question: currentQuestion.question_text,
      answer: answerText
    }),
  });
  
  const newQaPair = {
    question: currentQuestion.question_text,
    answer: answerText,
    score: result.score,
    correctness: result.correctness,
    feedback: result.feedback,
    improvements: result.improvements,
    ideal_answer: result.ideal_answer,
    topic: currentQuestion.topic,
    difficulty: currentQuestion.difficulty
  };
  
  const updatedHistory = [...(interview.history || []), newQaPair];
  
  const user = auth.currentUser;
  const docRef = doc(db, 'users', user.uid, 'interviews', interviewId);
  await updateDoc(docRef, { history: updatedHistory });
  
  // Format the result to match the old expected format
  const feedbackData = {
    ...result,
    next_question: result.next_question ? {
       question_text: result.next_question.question,
       topic: result.next_question.topic,
       difficulty: result.next_question.difficulty
    } : null
  };
  
  return feedbackData;
}

export async function generateNextQuestion(interviewId) {
  const interview = await getInterview(interviewId);
  const result = await request('/interviews/generate-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        role: interview.role,
        experience: interview.experience,
        interview_type: interview.interview_type,
        resume_text: interview.resume_text
      },
      history: interview.history || []
    }),
  });
  return { question_text: result.question, topic: result.topic, difficulty: result.difficulty };
}

export async function endInterview(interviewId) {
  const interview = await getInterview(interviewId);
  if (!interview.history || interview.history.length === 0) {
    throw new Error("No answers provided to compute analytics");
  }
  
  const result = await request('/interviews/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        role: interview.role,
        experience: interview.experience,
        interview_type: interview.interview_type,
        resume_text: interview.resume_text
      },
      history: interview.history
    }),
  });
  
  const user = auth.currentUser;
  const docRef = doc(db, 'users', user.uid, 'interviews', interviewId);
  await updateDoc(docRef, {
    status: 'completed',
    report: result.analytics,
    overall_score: result.overall_score
  });
  
  return { overall_score: result.overall_score, analytics: result.analytics };
}

export async function getReport(interviewId) {
  const interview = await getInterview(interviewId);
  return {
     overall_score: interview.overall_score,
     analytics: interview.report,
     questions: interview.history
  };
}

export async function downloadPdf(interviewId) {
  // Not implemented in stateless. UI could render PDF client side in future if needed.
  throw new Error("PDF download no longer supported directly via API in stateless mode.");
}

// Transcribe Audio is completely removed - Frontend uses SpeechRecognition exclusively.

// ── Browser-Native Audio Playback ────────────────
export function speakText(text, onEnd) {
  if (!('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }
  
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Female'))
  ) || voices.find((v) => v.lang.startsWith('en'));
  
  if (preferred) utterance.voice = preferred;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
