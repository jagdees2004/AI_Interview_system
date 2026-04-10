from __future__ import annotations

import json
from typing import Any, Dict, List, Optional

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq

from app.core.config import settings
from app.core.logging import logger

_llm = ChatGroq(
    api_key=settings.GROQ_API_KEY,
    model=settings.GROQ_MODEL,
    temperature=0.7,
    max_tokens=2048,
)

# ─────────────────────────────────────────────────
# A) Question Generator Chain
# ─────────────────────────────────────────────────

_QUESTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are a world-class senior interviewer at a top-tier firm. Generate exactly ONE genuine, modern interview question.\n"
            "CRITICAL RULES BASED ON INTERVIEW TYPE:\n"
            "1. If 'Interview Type' is 'HR': You MUST ask strictly behavioral, cultural fit, or basic introduction questions. Examples: 'Tell me about yourself', 'What are your strengths/weaknesses?', 'Why should we hire you?', 'Describe a challenge you faced and how you solved it (STAR method)', 'How do you handle pressure?', 'Where do you see yourself in 5 years?'.\n"
            "   - NEVER ask domain-specific technical questions. NEVER ask about data processing, coding, specific platforms (e.g., Kaggle, Coursera) or algorithms.\n"
            "   - If 'Resume context' is provided, ONLY use it to ask behavioral questions (e.g. 'Tell me about a time you faced a conflict while working on [Project]'). Do NOT test their technical claims in HR mode.\n"
            "2. If 'Interview Type' is 'Technical' (or anything else): Generate questions that probe deeply into 'Resume context', focusing on practical problem-solving, situational judgment, technical trade-offs, and architecture.\n"
            "You MUST respond with ONLY valid JSON — no markdown, no explanation, no code fences.\n"
            "Schema: {{\"question\": \"...\", \"topic\": \"...\", \"difficulty\": \"easy|medium|hard\"}}\n",
        ),
        (
            "human",
            "Role: {role}\n"
            "Experience: {experience} years\n"
            "Interview Type: {interview_type}\n"
            "Difficulty: {difficulty}\n"
            "Topics covered so far: {covered_topics}\n"
            "Previous answers summary: {previous_answers}\n"
            "Resume context: {resume_context}\n\n"
            "Generate a fresh, realistic, and non-repetitive question. Respond with ONLY JSON.",
        ),
    ]
)


async def generate_question(
    role: str,
    experience: int,
    interview_type: str,
    difficulty: str = "medium",
    covered_topics: Optional[List[str]] = None,
    previous_answers: Optional[str] = None,
    resume_context: Optional[str] = None,
) -> Dict[str, Any]:
    parser = JsonOutputParser()
    chain = _QUESTION_PROMPT | _llm | parser
    try:
        result = await chain.ainvoke(
            {
                "role": role,
                "experience": experience,
                "interview_type": interview_type,
                "difficulty": difficulty,
                "covered_topics": ", ".join(covered_topics) if covered_topics else "none",
                "previous_answers": previous_answers or "none yet",
                "resume_context": resume_context or "not provided",
            }
        )
        return result
    except Exception as exc:
        logger.error(f"Question generation failed: {exc}")
        return {
            "question": f"Tell me about your experience as a {role}.",
            "topic": "general",
            "difficulty": difficulty,
        }


# ─────────────────────────────────────────────────
# B) Answer Evaluation Chain
# ─────────────────────────────────────────────────

_EVALUATION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are expert at evaluating interview answers. Evaluate the candidate's answer.\n"
            "You MUST respond with ONLY valid JSON — no markdown, no explanation, no code fences.\n"
            "Schema:\n"
            "{{\n"
            '  "score": <number 0-10>,\n'
            '  "correctness": <number 0-10>,\n'
            '  "feedback": "<string>",\n'
            '  "improvements": "<string>",\n'
            '  "ideal_answer": "<string>"\n'
            "}}\n",
        ),
        (
            "human",
            "Question: {question}\n"
            "Candidate's answer: {answer}\n"
            "Role: {role}\n"
            "Experience level: {experience} years\n\n"
            "Evaluate. Respond with ONLY JSON.",
        ),
    ]
)


async def evaluate_answer(
    question: str,
    answer: str,
    role: str,
    experience: int,
) -> Dict[str, Any]:
    parser = JsonOutputParser()
    chain = _EVALUATION_PROMPT | _llm | parser
    try:
        result = await chain.ainvoke(
            {
                "question": question,
                "answer": answer,
                "role": role,
                "experience": experience,
            }
        )
        # Clamp values
        for key in ("score", "correctness"):
            val = result.get(key, 5)
            result[key] = max(0.0, min(10.0, float(val)))
        return result
    except Exception as exc:
        logger.error(f"Answer evaluation failed: {exc}")
        return {
            "score": 5.0,
            "correctness": 5.0,
            "feedback": "Evaluation temporarily unavailable.",
            "improvements": "Please try again later.",
            "ideal_answer": "An ideal answer cannot be generated right now.",
        }


# ─────────────────────────────────────────────────
# C) Follow-up Question Generator
# ─────────────────────────────────────────────────

_FOLLOWUP_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You generate follow-up interview questions based on weak areas in a candidate's previous answer.\n"
            "CRITICAL RULES BASED ON INTERVIEW TYPE:\n"
            "1. If 'Interview Type' is 'HR': The follow-up MUST be strictly behavioral or cultural. NEVER drill into technical claims, data processing tools, coding techniques, or specific platforms (like Kaggle/Coursera). Only probe their motivation, conflict resolution, teamwork, or leadership. Example: 'You mentioned a project earlier, what was your role in managing the team dynamics?'\n"
            "2. If 'Interview Type' is 'Technical': Drill deeply into their technical weak areas to see if they understand the underlying concepts.\n"
            "You MUST respond with ONLY valid JSON — no markdown, no code fences.\n"
            "Schema: {{\"question\": \"...\", \"topic\": \"...\", \"difficulty\": \"easy|medium|hard\"}}\n",
        ),
        (
            "human",
            "Role: {role}\n"
            "Interview Type: {interview_type}\n"
            "Previous question: {previous_question}\n"
            "Candidate's answer: {previous_answer}\n"
            "Evaluation feedback: {feedback}\n"
            "Weak areas / improvements: {improvements}\n"
            "Score: {score}/10\n\n"
            "Generate a focused follow-up question targeting the weak areas. Respond with ONLY JSON.",
        ),
    ]
)


async def generate_followup_question(
    role: str,
    interview_type: str,
    previous_question: str,
    previous_answer: str,
    feedback: str,
    improvements: str,
    score: float,
) -> Dict[str, Any]:
    parser = JsonOutputParser()
    chain = _FOLLOWUP_PROMPT | _llm | parser
    try:
        result = await chain.ainvoke(
            {
                "role": role,
                "interview_type": interview_type,
                "previous_question": previous_question,
                "previous_answer": previous_answer,
                "feedback": feedback,
                "improvements": improvements,
                "score": score,
            }
        )
        return result
    except Exception as exc:
        logger.error(f"Follow-up generation failed: {exc}")
        return {
            "question": "Can you elaborate on that?",
            "topic": "follow-up",
            "difficulty": "medium",
        }


# ─────────────────────────────────────────────────
# D) Resume Parsing Chain
# ─────────────────────────────────────────────────

_RESUME_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert resume parser. Extract structured data from the resume text.\n"
            "You MUST respond with ONLY valid JSON — no markdown, no code fences.\n"
            "Schema:\n"
            "{{\n"
            '  "skills": ["skill1", "skill2", ...],\n'
            '  "projects": [{{"name": "...", "description": "...", "technologies": ["..."]}}],\n'
            '  "experience": [{{"title": "...", "company": "...", "duration": "...", "highlights": ["..."]}}],\n'
            '  "education": [{{"degree": "...", "institution": "...", "year": "..."}}],\n'
            '  "summary": "..."\n'
            "}}\n",
        ),
        (
            "human",
            "Parse this resume:\n\n{resume_text}\n\nRespond with ONLY JSON.",
        ),
    ]
)


async def parse_resume(resume_text: str) -> Dict[str, Any]:
    parser = JsonOutputParser()
    chain = _RESUME_PROMPT | _llm | parser
    try:
        return await chain.ainvoke({"resume_text": resume_text})
    except Exception as exc:
        logger.error(f"Resume parsing failed: {exc}")
        return {"skills": [], "projects": [], "experience": [], "education": [], "summary": ""}
