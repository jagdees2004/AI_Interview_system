from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

# ──────────────────────────────────────────────
# Shared Models
# ──────────────────────────────────────────────

class QAPair(BaseModel):
    question: str
    answer: str
    score: Optional[float] = None
    feedback: Optional[str] = None
    improvements: Optional[str] = None
    ideal_answer: Optional[str] = None
    topic: Optional[str] = None
    difficulty: Optional[str] = None


class EvaluatedQAPair(QAPair):
    score: float
    correctness: float
    feedback: str
    improvements: str
    ideal_answer: str


class InterviewContext(BaseModel):
    role: str = Field(..., min_length=1)
    experience: int = Field(..., ge=0)
    interview_type: str = Field("Technical")
    resume_text: Optional[str] = None


# ──────────────────────────────────────────────
# Requests / Responses
# ──────────────────────────────────────────────

class ProjectModel(BaseModel):
    name: str = ""
    description: str = ""
    technologies: List[str] = []

class ExperienceModel(BaseModel):
    title: str = ""
    company: str = ""
    duration: str = ""
    highlights: List[str] = []

class EducationModel(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""

class ResumeData(BaseModel):
    skills: List[str] = []
    projects: List[ProjectModel] = []
    experience: List[ExperienceModel] = []
    education: List[EducationModel] = []
    summary: str = ""

class ExtractResumeResponse(BaseModel):
    extracted_text: str
    structured_data: ResumeData

class GenerateQuestionRequest(BaseModel):
    context: InterviewContext
    history: List[QAPair] = []

class GenerateQuestionResponse(BaseModel):
    question: str
    topic: str
    difficulty: str

class EvaluateAnswerRequest(BaseModel):
    context: InterviewContext
    question: str
    answer: str

class EvaluateAnswerResponse(BaseModel):
    score: float
    correctness: float
    feedback: str
    improvements: str
    ideal_answer: str
    next_question: Optional[GenerateQuestionResponse] = None

class GenerateAnalyticsRequest(BaseModel):
    context: InterviewContext
    history: List[EvaluatedQAPair]

class AnalyticsData(BaseModel):
    overall_score: float
    correctness_avg: float
    performance_trend: List[float]
    total_questions: int
    strengths: List[str]
    weaknesses: List[str]
    improvement_tips: List[str]

class AnalyticsResponse(BaseModel):
    overall_score: float
    analytics: AnalyticsData

class TranscriptionResponse(BaseModel):
    transcript: str
