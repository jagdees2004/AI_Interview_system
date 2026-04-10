import { Link } from 'react-router-dom';
import {
  Sparkles, Bot, Mic, Clock, BarChart3,
  FileText, FileDown, BrainCircuit
} from 'lucide-react';

export default function Landing() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────── */}
      <section className="hero">
        <div className="hero-particles">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
        <div className="hero-badge">
          <Sparkles size={16} /> AI Powered Smart Interview Platform
        </div>
        <h1>
          Practice Interviews with<br />
          <span className="highlight">AI Intelligence</span>
        </h1>
        <p>
          Role-based mock interviews with smart follow-ups, adaptive difficulty
          and real-time performance evaluation.
        </p>
        <div className="hero-buttons">
          <Link to="/setup" className="btn btn-primary">Start Interview</Link>
          <Link to="/history" className="btn btn-outline">View History</Link>
        </div>
      </section>

      {/* ── Steps ─────────────────────────────────── */}
      <section className="steps-section">
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-icon"><Bot size={24} /></div>
            <div className="step-label">Step 1</div>
            <h3>Role &amp; Experience Selection</h3>
            <p>AI adjusts difficulty based on selected job role.</p>
          </div>
          <div className="step-card">
            <div className="step-icon"><Mic size={24} /></div>
            <div className="step-label">Step 2</div>
            <h3>Smart Voice Interview</h3>
            <p>Dynamic follow-up questions based on your answers.</p>
          </div>
          <div className="step-card">
            <div className="step-icon"><Clock size={24} /></div>
            <div className="step-label">Step 3</div>
            <h3>Timer Based Simulation</h3>
            <p>Real interview pressure with time tracking.</p>
          </div>
        </div>
      </section>

      {/* ── Capabilities ──────────────────────────── */}
      <section className="capabilities-section">
        <h2 className="section-title">
          Advanced AI <span className="highlight">Capabilities</span>
        </h2>
        <div className="capabilities-grid">
          <div className="capability-card">
            <div className="capability-illustration">
              <BrainCircuit size={56} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div className="capability-content">
              <div className="capability-icon"><BarChart3 size={16} /></div>
              <h3>AI Answer Evaluation</h3>
              <p>Scores communication, technical accuracy and confidence.</p>
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-illustration">
              <FileText size={56} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div className="capability-content">
              <div className="capability-icon"><FileText size={16} /></div>
              <h3>Resume Based Interview</h3>
              <p>Project-specific questions based on uploaded resume.</p>
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-illustration">
              <FileDown size={56} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div className="capability-content">
              <div className="capability-icon"><FileDown size={16} /></div>
              <h3>Downloadable PDF Report</h3>
              <p>Detailed strengths, weaknesses and improvement insights.</p>
            </div>
          </div>
          <div className="capability-card">
            <div className="capability-illustration">
              <BarChart3 size={56} style={{ color: 'var(--primary-400)' }} />
            </div>
            <div className="capability-content">
              <div className="capability-icon"><BarChart3 size={16} /></div>
              <h3>History &amp; Analytics</h3>
              <p>Track progress with performance graphs and topic analysis.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modes ─────────────────────────────────── */}
      <section className="modes-section">
        <h2 className="section-title">
          Multiple Interview <span className="highlight">Modes</span>
        </h2>
        <div className="modes-grid">
          <div className="mode-card">
            <div className="mode-icon"><Bot size={22} /></div>
            <h3>Technical Interview</h3>
            <p>Data structures, algorithms, system design and coding.</p>
          </div>
          <div className="mode-card">
            <div className="mode-icon"><Mic size={22} /></div>
            <h3>HR Interview</h3>
            <p>Behavioral questions, leadership and communication skills.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────── */}
      <footer className="footer">
        © {new Date().getFullYear()} InterviewIQ.AI — Built with AI Intelligence
      </footer>
    </>
  );
}
