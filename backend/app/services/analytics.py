from __future__ import annotations

from typing import Any, Dict, List

from app.core.logging import logger


def compute_analytics(
    questions_with_answers: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """Compute interview analytics from evaluated answers.

    Args:
        questions_with_answers: list of dicts, each with keys:
            question_text, answer_text, score, confidence, communication,
            correctness, feedback, improvements
    """
    if not questions_with_answers:
        return {
            "overall_score": 0.0,
            "correctness_avg": 0.0,
            "performance_trend": [],
            "total_questions": 0,
            "strengths": [],
            "weaknesses": [],
            "improvement_tips": [],
        }

    total = len(questions_with_answers)

    scores = [q.get("score", 0) or 0 for q in questions_with_answers]
    correctnesses = [q.get("correctness", 0) or 0 for q in questions_with_answers]

    overall = round(sum(scores) / total, 2)
    corr_avg = round(sum(correctnesses) / total, 2)

    # Identify strengths (score >= 7) and weaknesses (score < 5)
    strengths: List[str] = []
    weaknesses: List[str] = []
    improvement_tips: List[str] = []

    for q in questions_with_answers:
        score = q.get("score", 0) or 0
        topic = q.get("topic", "general")
        if score >= 7:
            strengths.append(f"Strong in {topic} (scored {score}/10)")
        elif score < 5:
            weaknesses.append(f"Needs work on {topic} (scored {score}/10)")
            if q.get("improvements"):
                improvement_tips.append(q["improvements"])

    # Deduplicate
    strengths = list(dict.fromkeys(strengths))[:5]
    weaknesses = list(dict.fromkeys(weaknesses))[:5]
    improvement_tips = list(dict.fromkeys(improvement_tips))[:5]

    if not strengths:
        strengths = ["Keep practicing to build strengths"]
    if not weaknesses:
        weaknesses = ["No major weaknesses detected — great job!"]
    if not improvement_tips:
        improvement_tips = ["Continue consistent practice across all topics"]

    return {
        "overall_score": overall,
        "correctness_avg": corr_avg,
        "performance_trend": [round(s, 2) for s in scores],
        "total_questions": total,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "improvement_tips": improvement_tips,
    }
