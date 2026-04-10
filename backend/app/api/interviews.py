from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.logging import logger
from app.core.security import get_current_user_id
from app.schemas.schemas import (
    GenerateQuestionRequest,
    GenerateQuestionResponse,
    EvaluateAnswerRequest,
    EvaluateAnswerResponse,
    GenerateAnalyticsRequest,
    AnalyticsResponse,
    AnalyticsData,
    ExtractResumeResponse,
    ResumeData,
)
from app.services.analytics import compute_analytics
from app.services.llm_chains import (
    evaluate_answer,
    generate_followup_question,
    generate_question,
    parse_resume,
)
from app.services.resume_parser import extract_text_from_pdf

router = APIRouter(prefix="/interviews", tags=["Interviews"])


# ──────────────────────────────────────────────────────
# PDF Parsing
# ──────────────────────────────────────────────────────

@router.post("/extract-resume", response_model=ExtractResumeResponse)
async def extract_resume(
    resume: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    """Stateless endpoint to extract and parse resume text."""
    logger.info(f"Resume extraction request for user {user_id}, filename: {resume.filename}")
    if not resume.filename.lower().endswith(".pdf"):
        logger.warning(f"Rejected non-PDF file: {resume.filename}")
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported")

    try:
        file_bytes = await resume.read()
        logger.info(f"Read {len(file_bytes)} bytes from {resume.filename}")
        
        text = extract_text_from_pdf(file_bytes)
        if text.strip():
            logger.info("Text extracted successfully, sending to LLM for parsing...")
            resume_data = await parse_resume(text)
            skills = resume_data.get("skills", [])
            summary = resume_data.get("summary", "")
            context_str = f"Skills: {', '.join(skills)}. {summary}"
            logger.info(f"LLM parsing complete. Extracted {len(skills)} skills.")
            return ExtractResumeResponse(
                extracted_text=context_str,
                structured_data=ResumeData(**resume_data)
            )
        else:
            logger.warning("No text could be extracted from the PDF.")
    except Exception as e:
        logger.error(f"Error in extract_resume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Resume parsing failed: {str(e)}")
    
    return ExtractResumeResponse(
        extracted_text="",
        structured_data=ResumeData()
    )


# ──────────────────────────────────────────────────────
# Generate Question
# ──────────────────────────────────────────────────────

@router.post("/generate-question", response_model=GenerateQuestionResponse)
async def api_generate_question(
    body: GenerateQuestionRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Stateless endpoint to generate the next question."""
    history = body.history
    context = body.context

    covered_topics = [q.topic for q in history if q.topic]
    next_order = len(history)

    # Calculate difficulty based on question count
    new_diff = "easy"
    if next_order >= 7:
        new_diff = "hard"
    elif next_order >= 3:
        new_diff = "medium"

    previous_answers = ""
    if history:
        previous_answers = history[-1].answer[:300] if history[-1].answer else ""

    q_data = await generate_question(
        role=context.role,
        experience=context.experience,
        interview_type=context.interview_type,
        difficulty=new_diff,
        covered_topics=covered_topics,
        previous_answers=previous_answers,
        resume_context=context.resume_text or "",
    )

    return GenerateQuestionResponse(
        question=q_data["question"],
        topic=q_data.get("topic", "general"),
        difficulty=q_data.get("difficulty", "medium"),
    )


# ──────────────────────────────────────────────────────
# Evaluate Answer
# ──────────────────────────────────────────────────────

@router.post("/evaluate-answer", response_model=EvaluateAnswerResponse)
async def api_evaluate_answer(
    body: EvaluateAnswerRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Stateless endpoint to evaluate an answer and optionally provide a follow-up."""
    evaluation = await evaluate_answer(
        question=body.question,
        answer=body.answer,
        role=body.context.role,
        experience=body.context.experience,
    )

    score = evaluation.get("score", 0)
    
    resp = EvaluateAnswerResponse(
        score=score,
        correctness=evaluation.get("correctness", 0),
        feedback=evaluation.get("feedback", ""),
        improvements=evaluation.get("improvements", ""),
        ideal_answer=evaluation.get("ideal_answer", ""),
    )

    # Determine if we should automatically generate a follow-up
    # Example logic: if score is low (<6), we can generate a specific follow-up.
    if score < 6:
        q_data = await generate_followup_question(
            role=body.context.role,
            interview_type=body.context.interview_type,
            previous_question=body.question,
            previous_answer=body.answer,
            feedback=evaluation.get("feedback", ""),
            improvements=evaluation.get("improvements", ""),
            score=score,
        )
        resp.next_question = GenerateQuestionResponse(
            question=q_data["question"],
            topic=q_data.get("topic", "general"),
            difficulty=q_data.get("difficulty", "medium"),
        )
        
    return resp


# ──────────────────────────────────────────────────────
# Analytics & PDF Generation
# ──────────────────────────────────────────────────────

@router.post("/analytics", response_model=AnalyticsResponse)
async def api_compute_analytics(
    body: GenerateAnalyticsRequest,
    user_id: str = Depends(get_current_user_id),
):
    """Stateless endpoint to compute analytics from history."""
    qa_list = []
    for pair in body.history:
        qa_list.append({
            "question_text": pair.question,
            "answer_text": pair.answer,
            "score": pair.score,
            "correctness": pair.correctness,
            "feedback": pair.feedback,
            "improvements": pair.improvements,
            "ideal_answer": pair.ideal_answer,
            "topic": pair.topic,
        })
        
    if not qa_list:
        raise HTTPException(status_code=400, detail="No answers provided")

    analytics_dict = compute_analytics(qa_list)
    
    return AnalyticsResponse(
        overall_score=analytics_dict["overall_score"],
        analytics=AnalyticsData(**analytics_dict),
    )
