import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Mic, MicOff, Bot, Square, Volume2 } from 'lucide-react';
import {
  startInterview, submitAnswer, endInterview,
  generateNextQuestion,
  stopSpeaking,
  speakText
} from '../api';
import { useAuth } from '../components/AuthContext';

const MAX_QUESTIONS = 10;
const TIMER_SECONDS = 120;

export default function Interview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [phase, setPhase] = useState('loading'); // loading | speaking | active | feedback | ending | ended
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [error, setError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    
    // Pre-load voices for browser TTS
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
    
    initInterview();
    return () => {
      stopSpeaking();
      clearInterval(timerRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  // Timer — only runs during 'active' phase
  useEffect(() => {
    if (phase === 'active') {
      setTimer(TIMER_SECONDS);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, questionNumber]);

  const speakQuestion = (question) => {
    setIsSpeaking(true);
    setPhase('speaking');
    
    speakText(question.question_text, () => {
      setIsSpeaking(false);
      setPhase('active');
    });
  };

  const initInterview = async () => {
    try {
      const question = await startInterview(id);
      setCurrentQuestion(question);
      setQuestionNumber(1);
      speakQuestion(question);
    } catch (err) {
      setError(err.message || 'Failed to start interview');
      setPhase('ended');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    stopSpeaking();
    stopRecording();

    try {
      const result = await submitAnswer(id, answerText.trim(), currentQuestion);
      setFeedback(result);
      setPhase('feedback');
    } catch (err) {
      setError(err.message || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = async () => {
    if (questionNumber >= MAX_QUESTIONS) {
      handleEndInterview();
      return;
    }

    setPhase('loading');
    setAnswerText('');
    setFeedback(null);

    try {
      let nextQ;
      if (feedback?.next_question) {
        nextQ = feedback.next_question;
      } else {
        // Fetch a fresh question based on history if no follow-up was generated
        nextQ = await generateNextQuestion(id);
      }
      
      setCurrentQuestion(nextQ);
      setQuestionNumber(prev => prev + 1);
      speakQuestion(nextQ);
    } catch (err) {
      setError('Failed to load next question: ' + err.message);
      setPhase('active');
    }
  };

  const handleEndInterview = async () => {
    setPhase('ending');
    setShowEndModal(false);
    stopSpeaking();
    stopRecording();
    try {
      await endInterview(id);
      navigate(`/report/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to end interview');
      setPhase('active');
    }
  };

  const handleReplayQuestion = () => {
    if (currentQuestion) {
      speakQuestion(currentQuestion);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setRecording(false);
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Your browser does not support Speech Recognition. Please use Chrome or Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let accumulated = answerText.trim() ? answerText.trim() + ' ' : '';

      recognition.onresult = (event) => {
        let currentInterim = '';
        let finalizedInTurn = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalizedInTurn += transcript + ' ';
          } else {
            currentInterim += transcript;
          }
        }
        
        if (finalizedInTurn) {
          accumulated += finalizedInTurn;
        }
        
        setAnswerText(accumulated + currentInterim);
      };

      recognition.onerror = (e) => {
        console.error('Speech recognition error:', e.error);
        if (e.error === 'not-allowed') {
          setError('Microphone access denied. Please allow it in browser settings.');
        } else if (e.error !== 'aborted') {
          setError('Voice recognition issue: ' + e.error);
        }
        setRecording(false);
      };

      recognition.onend = () => {
        setRecording(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setRecording(true);
      setError('');
    } catch (err) {
      setError('Could not start speech recognition.');
    }
  };

  const timerProgress = (timer / TIMER_SECONDS) * 100;
  const circumference = 2 * Math.PI * 34;
  const dashoffset = circumference * (1 - timerProgress / 100);

  const statusText = () => {
    if (phase === 'speaking') return 'AI Speaking';
    if (phase === 'active' && recording) return 'Listening...';
    if (phase === 'active') return 'Your Turn';
    if (phase === 'feedback') return 'Evaluated';
    return 'Processing...';
  };

  if (phase === 'loading') {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Generating your interview question...</p>
      </div>
    );
  }

  return (
    <>
      <div className="interview-page">
        {/* ── Left Panel ──────────────────────── */}
        <div className="interview-left">
          <div className="ai-avatar-container">
            <div className="ai-avatar-placeholder">
              <div className="avatar-circle" style={isSpeaking ? { animation: 'pulse-mic 1.5s ease-in-out infinite' } : {}}>
                <Bot size={40} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                {isSpeaking ? '🔊 Speaking...' : 'AI Interviewer'}
              </span>
            </div>
          </div>

          {currentQuestion && (
            <div className="question-bubble" style={{ position: 'relative' }}>
              {currentQuestion.question_text}
              <button
                onClick={handleReplayQuestion}
                className="replay-btn"
                title="Replay audio"
              >
                <Volume2 size={16} />
              </button>
            </div>
          )}

          <div className="status-panel">
            <div className="status-header">
              <h4>Status</h4>
              <span className="ai-status" style={
                phase === 'speaking' ? { color: 'var(--warning-400)' } :
                recording ? { color: 'var(--danger-400)' } : {}
              }>
                {statusText()}
              </span>
            </div>

            <div className="timer-ring">
              <svg viewBox="0 0 76 76">
                <circle className="ring-bg" cx="38" cy="38" r="34" />
                <circle
                  className="ring-progress"
                  cx="38" cy="38" r="34"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                />
              </svg>
              <span className="timer-text">{timer}s</span>
            </div>

            <div className="question-counters">
              <div>
                <div className="counter-value">{questionNumber}</div>
                <div className="counter-label">Question</div>
              </div>
              <div>
                <div className="counter-value">{MAX_QUESTIONS}</div>
                <div className="counter-label">Total</div>
              </div>
            </div>
          </div>

          <button
            className="btn btn-danger"
            onClick={() => setShowEndModal(true)}
            style={{ width: '100%', padding: '12px', marginTop: 'auto' }}
          >
            End Interview
          </button>
        </div>

        {/* ── Right Panel ─────────────────────── */}
        <div className="interview-right">
          <h2 className="interview-title">AI Smart Interview</h2>

          {error && (
            <div className="toast toast-error" style={{ marginBottom: 16 }}>
              {error}
              <button onClick={() => setError('')} style={{ float: 'right', background: 'none', color: 'inherit', cursor: 'pointer' }}>&times;</button>
            </div>
          )}

          {currentQuestion && (
            <div className="question-display">
              <div className="question-label">Question {questionNumber}</div>
              <div className="question-text">{currentQuestion.question_text}</div>
            </div>
          )}

          {(phase === 'active' || phase === 'speaking') && (
            <div className="answer-area">
              <textarea
                className="answer-textarea"
                placeholder={phase === 'speaking' ? 'Listening to AI...' : 'Type or speak your answer...'}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={phase === 'speaking'}
              />
              <div className="answer-controls">
                <button
                  className={`mic-button ${recording ? 'recording' : ''}`}
                  onClick={toggleRecording}
                  disabled={phase === 'speaking'}
                >
                  {recording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <button
                  className="submit-answer-btn"
                  onClick={handleSubmitAnswer}
                  disabled={!answerText.trim() || submitting || phase === 'speaking'}
                >
                  {submitting ? 'Evaluating...' : 'Submit Answer'}
                </button>
              </div>
            </div>
          )}

          {phase === 'feedback' && feedback && (
            <div className="feedback-panel">
              <h4>Answer Evaluation</h4>
              <div className="feedback-scores">
                <div className="feedback-score-item">
                  <div className="feedback-score-value">{feedback.score?.toFixed(1)}</div>
                  <div className="feedback-score-label">Score</div>
                </div>
                <div className="feedback-score-item">
                  <div className="feedback-score-value">{feedback.correctness?.toFixed(1)}</div>
                  <div className="feedback-score-label">Correctness</div>
                </div>
              </div>
              <p className="feedback-text"><strong>Feedback:</strong> {feedback.feedback}</p>
              <p className="feedback-text"><strong>Improvements:</strong> {feedback.improvements}</p>
              {feedback.ideal_answer && (
                <div className="ideal-answer-box" style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--gray-800)', borderRadius: '6px', fontSize: '0.95rem' }}>
                  <strong style={{ color: 'var(--primary-400)' }}>Ideal Answer:</strong>
                  <p style={{ marginTop: '6px', marginBottom: 0 }}>{feedback.ideal_answer}</p>
                </div>
              )}
              <button
                className="btn btn-green-full"
                onClick={handleNextQuestion}
                style={{ marginTop: 16 }}
              >
                {questionNumber >= MAX_QUESTIONS ? 'View Final Report' : 'Next Question →'}
              </button>
            </div>
          )}

          {phase === 'ending' && (
            <div className="loading-overlay">
              <div className="spinner" />
              <p>Preparing your detailed report...</p>
            </div>
          )}
        </div>
      </div>

      {showEndModal && (
        <div className="modal-overlay" onClick={() => setShowEndModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>End Interview?</h3>
            <p>Your progress will be saved and a report will be generated.</p>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowEndModal(false)}>Continue</button>
              <button className="btn btn-danger" onClick={handleEndInterview}>End Session</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
