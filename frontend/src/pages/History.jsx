import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowLeft, Calendar, ChevronRight, User as UserIcon, Award } from 'lucide-react';
import { getHistory } from '../api';
import { useAuth } from '../components/AuthContext';

export default function History() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
      return;
    }

    async function fetchHistory() {
      try {
        const data = await getHistory();
        setInterviews(data);
      } catch (err) {
        console.error('Failed to fetch history:', err);
        setError('Could not load your interview history. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [navigate, isLoggedIn]);

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return 'Unknown Date';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Invalid Date';

      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch (e) {
      return 'Unknown Date';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return 'In Progress';
      case 'created': return 'Created';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="history-page">
        <h1>Interview History</h1>
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Loading your history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h1>Interview History</h1>
      </div>

      {error && (
        <div className="toast toast-error" style={{ position: 'static', marginBottom: 24, maxWidth: '100%' }}>
          {error}
        </div>
      )}

      {interviews.length === 0 ? (
        <div className="history-empty">
          <ClipboardList size={56} className="empty-icon" style={{ color: 'var(--surface-500)' }} />
          <h3 style={{ marginTop: 12, color: 'var(--surface-300)', fontWeight: 600 }}>No interview history yet</h3>
          <p style={{ marginTop: 8, color: 'var(--surface-500)', fontSize: '0.9rem' }}>
            Complete your first AI interview to see results here.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <Link to="/" className="btn btn-outline">
              <ArrowLeft size={16} /> Home
            </Link>
          </div>
        </div>
      ) : (
        <div className="history-list">
          {interviews.map((item) => (
            <div 
              key={item.id} 
              className={`history-card status-${item.status}`}
              onClick={() => {
                if (item.status === 'completed') {
                  navigate(`/report/${item.id}`);
                } else {
                  navigate(`/interview/${item.id}`);
                }
              }}
            >
              <div className="history-info">
                <div className="history-role">{item.role}</div>
                <div className="history-meta">
                  <div className="history-date">
                    <Calendar size={14} /> {formatDate(item.created_at)}
                  </div>
                  <div className={`status-badge ${item.status}`}>
                    {getStatusLabel(item.status)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <UserIcon size={14} /> {item.experience} Years Exp.
                  </div>
                </div>
              </div>

              <div className="history-stats">
                {item.status === 'completed' && item.overall_score != null && !isNaN(item.overall_score) && (
                  <div className="score-badge-circle" title="Overall Score">
                    {Math.round(item.overall_score)}
                  </div>
                )}
                <div className="btn-icon-only">
                  <ChevronRight size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <Link to="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
