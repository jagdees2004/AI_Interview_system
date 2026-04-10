import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Briefcase, Mic, BarChart3, Upload,
  FileText, Sparkles
} from 'lucide-react';
import { createInterview, parseResumeFile } from '../api';
import { useAuth } from '../components/AuthContext';

export default function Setup() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { isLoggedIn } = useAuth();

  const [role, setRole] = useState('');
  const [experience, setExperience] = useState('');
  const [interviewType, setInterviewType] = useState('Technical');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    navigate('/login');
    return null;
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setIsParsing(true);
      setError('');
      try {
        const response = await parseResumeFile(file);
        // response has extracted_text and structured_data
        setResumeData(response);
      } catch (err) {
        setError('Failed to parse resume: ' + err.message);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleStart = async () => {
    if (!role.trim()) {
      setError('Please enter a job role');
      return;
    }
    if (!experience || experience < 0) {
      setError('Please enter valid experience');
      return;
    }

    setIsParsing(true);
    setError('');

    try {
      const interview = await createInterview({
        role: role.trim(),
        experience: Number(experience),
        interview_type: interviewType,
        resume_text: resumeData ? resumeData.extracted_text : '',
      });

      navigate(`/interview/${interview.id}`);
    } catch (err) {
      setError(err.message || 'Failed to create interview');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="setup-page">
      {/* ── Sidebar ──────────────────────────── */}
      <div className="setup-sidebar">
        <h2>Start Your AI Interview</h2>
        <p>Practice real interview scenarios powered by AI. Improve communication, technical skills, and confidence.</p>

        <div className="setup-features">
          <div className="setup-feature">
            <Briefcase size={20} className="setup-feature-icon" />
            Choose Role &amp; Experience
          </div>
          <div className="setup-feature">
            <Mic size={20} className="setup-feature-icon" />
            Smart Voice Interview
          </div>
          <div className="setup-feature">
            <BarChart3 size={20} className="setup-feature-icon" />
            Performance Analytics
          </div>
        </div>
      </div>

      {/* ── Form ─────────────────────────────── */}
      <div className="setup-main">
        <div className="setup-form">
          <h2>Interview Setup</h2>

          {error && (
            <div className="toast toast-error" style={{ marginBottom: 16 }}>{error}</div>
          )}

          <div className="form-group">
            <div className="input-wrapper">
              <User size={18} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Job Role (e.g. Frontend Developer)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-wrapper">
              <Briefcase size={18} className="input-icon" />
              <input
                type="number"
                className="form-input"
                placeholder="Years of Experience"
                min="0"
                max="50"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <select
              className="form-select"
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
            >
              <option value="Technical">Technical Interview</option>
              <option value="HR">HR Interview</option>
            </select>
          </div>

          <div className="form-group">
            <div
              className={`resume-upload ${resumeFile ? 'has-file' : ''} ${isParsing ? 'is-parsing' : ''}`}
              onClick={() => { if (!isParsing) fileInputRef.current?.click(); }}
            >
              <Upload size={28} className="resume-upload-icon" />
              {resumeFile ? (
                <p><span className="filename">{resumeFile.name}</span></p>
              ) : (
                <p>Upload Resume (PDF) — Optional</p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                hidden
                onChange={handleFileChange}
              />
            </div>
          </div>

          {isParsing && !resumeData && (
            <div className="parsing-indicator">
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              <span>Analyzing Resume...</span>
            </div>
          )}

          {resumeData?.structured_data && (
            <div className="resume-result glass-panel">
              <h4>Resume Analysis</h4>
              
              {resumeData.structured_data.summary && (
                <div className="resume-summary">
                  <p>{resumeData.structured_data.summary}</p>
                </div>
              )}
              
              {resumeData.structured_data.skills && resumeData.structured_data.skills.length > 0 && (
                <div className="resume-section">
                  <p className="resume-section-title"><strong>Top Skills:</strong></p>
                  <div className="skill-tags">
                    {resumeData.structured_data.skills.slice(0, 10).map((skill, i) => (
                      <span key={i} className="skill-tag">{skill}</span>
                    ))}
                    {resumeData.structured_data.skills.length > 10 && (
                      <span className="skill-tag skill-tag-more">+{resumeData.structured_data.skills.length - 10} more</span>
                    )}
                  </div>
                </div>
              )}

              {resumeData.structured_data.projects && resumeData.structured_data.projects.length > 0 && (
                <div className="resume-section">
                  <p className="resume-section-title"><strong>Key Projects:</strong></p>
                  <ul className="resume-list">
                    {resumeData.structured_data.projects.map((proj, i) => (
                      <li key={i}>
                        <strong>{proj.name}:</strong> {proj.description}
                        {proj.technologies && proj.technologies.length > 0 && (
                          <div className="tech-stack-mini">
                            {proj.technologies.join(', ')}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resumeData.structured_data.experience && resumeData.structured_data.experience.length > 0 && (
                <div className="resume-section">
                  <p className="resume-section-title"><strong>Experience:</strong></p>
                  <ul className="resume-list">
                    {resumeData.structured_data.experience.map((exp, i) => (
                      <li key={i}>
                        <strong>{exp.title} at {exp.company}</strong> ({exp.duration})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-green-full"
            onClick={handleStart}
            disabled={isParsing}
            style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isParsing && resumeData ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Setting up...
              </>
            ) : isParsing ? (
              <>
                <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Start Interview
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
