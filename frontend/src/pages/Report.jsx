import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Trophy, TrendingUp, Target, ThumbsUp,
  AlertTriangle, Lightbulb, ArrowLeft,
  CheckCircle2, XCircle
} from 'lucide-react';
import { getReport } from '../api';
import { useAuth } from '../components/AuthContext';

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const data = await getReport(id);
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };



  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading your report...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-overlay">
        <p style={{ color: 'var(--danger-400)', fontWeight: 600 }}>{error}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 12 }}>Go Home</Link>
      </div>
    );
  }

  const a = report.analytics;

  return (
    <div className="report-page">
      <div className="report-header">
        <h1>Interview Report</h1>
        <p>Performance analysis and improvement suggestions</p>
      </div>

      {/* ── Score Hero ────────────────────────── */}
      <div className="report-score-hero">
        <div className="report-score-value">{a.overall_score?.toFixed(1)}</div>
        <div className="report-score-label">Overall Score out of 10</div>
      </div>

      {/* ── Metrics ──────────────────────────── */}
      <div className="report-metrics">
        <div className="report-metric-card">
          <div className="report-metric-value">{a.total_questions || 0}</div>
          <div className="report-metric-label">Questions</div>
        </div>
        <div className="report-metric-card">
          <div className="report-metric-value">{a.correctness_avg?.toFixed(1) || '0.0'}</div>
          <div className="report-metric-label">Avg Correctness</div>
        </div>
      </div>

      {/* ── Performance Trend ────────────────── */}
      {a.performance_trend && a.performance_trend.length > 0 && (
        <div className="report-section">
          <h3><TrendingUp size={20} /> Performance Trend</h3>
          <div className="trend-chart">
            {a.performance_trend.map((val, i) => (
              <div
                key={i}
                className="trend-bar"
                style={{ height: `${(val / 10) * 100}%` }}
                data-value={val.toFixed(1)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Strengths ────────────────────────── */}
      {a.strengths && a.strengths.length > 0 && (
        <div className="report-section">
          <h3><ThumbsUp size={20} style={{ color: 'var(--success-400)' }} /> Strengths</h3>
          <ul className="report-list">
            {a.strengths.map((item, i) => (
              <li key={i}>
                <CheckCircle2 size={16} className="list-icon" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Weaknesses ───────────────────────── */}
      {a.weaknesses && a.weaknesses.length > 0 && (
        <div className="report-section">
          <h3><AlertTriangle size={20} style={{ color: 'var(--danger-400)' }} /> Areas for Improvement</h3>
          <ul className="report-list">
            {a.weaknesses.map((item, i) => (
              <li key={i} className="weakness-item">
                <XCircle size={16} className="list-icon" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Tips ──────────────────────────────── */}
      {a.improvement_tips && a.improvement_tips.length > 0 && (
        <div className="report-section">
          <h3><Lightbulb size={20} style={{ color: 'var(--warning-400)' }} /> Improvement Tips</h3>
          <ul className="report-list">
            {a.improvement_tips.map((tip, i) => (
              <li key={i}>
                <Target size={16} className="list-icon" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Detailed Review ──────────────────── */}
      {report.questions && report.questions.length > 0 && (
        <div className="report-section" style={{ marginTop: '32px' }}>
          <h3>Detailed QA Review</h3>
          <div className="qa-review-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
            {report.questions.map((q, i) => (
              <div key={i} className="qa-review-card" style={{ padding: '16px', backgroundColor: 'var(--gray-900)', borderRadius: '8px', border: '1px solid var(--gray-800)' }}>
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Question {i + 1}</span>
                  <h4 style={{ fontSize: '1.05rem', marginTop: '4px', color: 'var(--gray-50)' }}>{q.question}</h4>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--gray-300)', fontSize: '0.9rem' }}>Your Answer:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--gray-400)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{q.answer}</p>
                </div>
                <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--gray-800)', fontSize: '0.85rem', color: 'var(--gray-300)' }}>Score: {q.score}/10</span>
                  <span style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: 'var(--gray-800)', fontSize: '0.85rem', color: 'var(--gray-300)' }}>Correctness: {q.correctness}/10</span>
                </div>
                <div style={{ padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', marginBottom: '12px' }}>
                  <strong style={{ color: 'var(--gray-300)', fontSize: '0.9rem' }}>Feedback:</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--gray-400)', fontSize: '0.95rem' }}>{q.feedback}</p>
                </div>
                {q.ideal_answer && (
                  <div style={{ padding: '12px', backgroundColor: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px' }}>
                    <strong style={{ color: 'var(--primary-400)', fontSize: '0.9rem' }}>Ideal Answer:</strong>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--primary-100)', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>{q.ideal_answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ──────────────────────────── */}
      <div className="report-actions">
        <Link to="/setup" className="btn btn-primary">
          New Interview
        </Link>
        <Link to="/" className="btn btn-outline">
          <ArrowLeft size={18} /> Home
        </Link>
      </div>
    </div>
  );
}
