
import os
import json
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    Integer,
    JSON,
    String,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from google import genai
from auth import get_current_user


# --------------------------------------------------
# DATABASE CONFIGURATION
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
DATABASE_URL = f"sqlite:///{BASE_DIR / 'prepwise.db'}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

router = APIRouter(
    prefix="/api/quiz",
    tags=["Smart AI Quiz"]
)


# --------------------------------------------------
# DATABASE MODELS
# --------------------------------------------------

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    score = Column(Integer, nullable=False)
    total_questions = Column(Integer, nullable=False)
    percentage = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GeneratedQuiz(Base):
    __tablename__ = "generated_quizzes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    subject = Column(String(150), nullable=False)
    topic = Column(String(200), nullable=True)
    difficulty = Column(String(30), nullable=False)
    questions = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# PYDANTIC SCHEMAS
# --------------------------------------------------

class GenerateQuizInput(BaseModel):
    subject: str = Field(min_length=1, max_length=150)
    topic: str | None = Field(default=None, max_length=200)
    difficulty: str = "Medium"
    question_count: int = Field(default=10, ge=5, le=20)


class SubmitQuizInput(BaseModel):
    quiz_id: int
    answers: dict[str, str]


# --------------------------------------------------
# DATABASE DEPENDENCY
# --------------------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# USER ID HELPER
# --------------------------------------------------

def get_user_id(current_user):
    if isinstance(current_user, dict):
        return current_user["id"]

    return current_user.id


# --------------------------------------------------
# GEMINI CONFIGURATION
# --------------------------------------------------

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-flash-latest"
)


# --------------------------------------------------
# AI QUESTION GENERATION
# --------------------------------------------------

def generate_questions(subject, topic, difficulty, question_count):

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key or api_key == "YOUR_ACTUAL_GEMINI_API_KEY":
        raise HTTPException(
            status_code=503,
            detail="Gemini API key is missing. Configure GEMINI_API_KEY."
        )

    client = genai.Client(api_key=api_key)

    topic_instruction = (
        f"Focus on this topic: {topic}."
        if topic
        else "Cover important concepts from the subject."
    )

    prompt = f"""
You are an expert academic quiz creator.

Create exactly {question_count} original multiple-choice questions.

Subject: {subject}
Topic: {topic_instruction}
Difficulty: {difficulty}

Requirements:
1. Each question must have exactly four options.
2. Options must be labelled A, B, C and D.
3. Only one option must be correct.
4. Questions must be factually accurate.
5. Avoid repeated questions.
6. Include a clear explanation for every answer.
7. Match the requested difficulty.
8. Return only valid JSON.

Required JSON structure:

{{
  "questions": [
    {{
      "question": "Question text",
      "options": {{
        "A": "Option A",
        "B": "Option B",
        "C": "Option C",
        "D": "Option D"
      }},
      "correct_answer": "A",
      "explanation": "Explanation of the correct answer"
    }}
  ]
}}
"""

    response_schema = {
        "type": "OBJECT",
        "properties": {
            "questions": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "question": {"type": "STRING"},
                        "options": {
                            "type": "OBJECT",
                            "properties": {
                                "A": {"type": "STRING"},
                                "B": {"type": "STRING"},
                                "C": {"type": "STRING"},
                                "D": {"type": "STRING"},
                            },
                            "required": ["A", "B", "C", "D"],
                        },
                        "correct_answer": {
                            "type": "STRING",
                            "enum": ["A", "B", "C", "D"],
                        },
                        "explanation": {"type": "STRING"},
                    },
                    "required": [
                        "question",
                        "options",
                        "correct_answer",
                        "explanation",
                    ],
                },
            }
        },
        "required": ["questions"],
    }

    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config={
                "temperature": 0.7,
                "max_output_tokens": 8000,
                "response_mime_type": "application/json",
                "response_json_schema": response_schema,
            },
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        result = json.loads(response.text)
        questions = result.get("questions", [])

        if len(questions) != question_count:
            raise ValueError(
                f"Expected {question_count} questions, received {len(questions)}."
            )

        validated_questions = []

        for index, question in enumerate(questions, start=1):
            options = question.get("options", {})
            correct_answer = question.get("correct_answer")

            if not all(
                isinstance(options.get(key), str) and options[key].strip()
                for key in ["A", "B", "C", "D"]
            ):
                raise ValueError(f"Invalid options in question {index}.")

            if correct_answer not in ["A", "B", "C", "D"]:
                raise ValueError(f"Invalid answer in question {index}.")

            if not question.get("question") or not question.get("explanation"):
                raise ValueError(f"Incomplete question {index}.")

            validated_questions.append({
                "id": f"q{index}",
                "question": question["question"].strip(),
                "options": {
                    key: options[key].strip()
                    for key in ["A", "B", "C", "D"]
                },
                "correct_answer": correct_answer,
                "explanation": question["explanation"].strip(),
            })

        return validated_questions

    except HTTPException:
        raise

    except Exception as error:
        print("Gemini generation error:", repr(error))

        raise HTTPException(
            status_code=502,
            detail="Unable to generate quiz questions. Check your API key, model and Gemini API availability."
        )


# --------------------------------------------------
# GENERATE QUIZ
# --------------------------------------------------

@router.post("/generate")
def generate_quiz(
    data: GenerateQuizInput,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):

    user_id = get_user_id(current_user)

    difficulty = data.difficulty.strip().capitalize()

    if difficulty not in ["Easy", "Medium", "Hard"]:
        raise HTTPException(
            status_code=400,
            detail="Difficulty must be Easy, Medium or Hard."
        )

    subject = data.subject.strip()

    if not subject:
        raise HTTPException(
            status_code=400,
            detail="Please enter a subject."
        )

    topic = data.topic.strip() if data.topic else None

    questions = generate_questions(
        subject,
        topic,
        difficulty,
        data.question_count
    )

    new_quiz = GeneratedQuiz(
        user_id=user_id,
        subject=subject,
        topic=topic,
        difficulty=difficulty,
        questions=questions,
    )

    db.add(new_quiz)
    db.commit()
    db.refresh(new_quiz)

    # Never send correct answers before quiz submission.
    safe_questions = []

    for question in questions:
        safe_questions.append({
            "id": question["id"],
            "question": question["question"],
            "options": question["options"],
        })

    return {
        "message": "Quiz generated successfully.",
        "quiz_id": new_quiz.id,
        "subject": subject,
        "topic": topic,
        "difficulty": difficulty,
        "total_questions": len(safe_questions),
        "questions": safe_questions,
    }


# --------------------------------------------------
# SUBMIT QUIZ AND CHECK ANSWERS
# --------------------------------------------------

@router.post("/submit")
def submit_quiz(
    data: SubmitQuizInput,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):

    user_id = get_user_id(current_user)

    quiz = (
        db.query(GeneratedQuiz)
        .filter(
            GeneratedQuiz.id == data.quiz_id,
            GeneratedQuiz.user_id == user_id,
        )
        .first()
    )

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Quiz not found."
        )

    questions = quiz.questions

    valid_question_ids = {
        question["id"] for question in questions
    }

    if not set(data.answers.keys()).issubset(valid_question_ids):
        raise HTTPException(
            status_code=400,
            detail="Invalid question ID in submitted answers."
        )

    score = 0
    results = []

    for question in questions:

        question_id = question["id"]

        selected_answer = data.answers.get(question_id, "")
        correct_answer = question["correct_answer"]

        is_correct = (
            isinstance(selected_answer, str)
            and selected_answer.upper() == correct_answer
        )

        if is_correct:
            score += 1

        results.append({
            "question_id": question_id,
            "question": question["question"],
            "selected_answer": selected_answer,
            "correct_answer": correct_answer,
            "correct_option_text": question["options"][correct_answer],
            "is_correct": is_correct,
            "explanation": question["explanation"],
        })

    total_questions = len(questions)

    percentage = round(
        (score / total_questions) * 100,
        2
    )

    attempt = QuizAttempt(
        user_id=user_id,
        score=score,
        total_questions=total_questions,
        percentage=percentage,
    )

    db.add(attempt)
    db.commit()
    db.refresh(attempt)

    return {
        "message": "Quiz submitted successfully.",
        "attempt_id": attempt.id,
        "subject": quiz.subject,
        "topic": quiz.topic,
        "difficulty": quiz.difficulty,
        "score": score,
        "total_questions": total_questions,
        "percentage": percentage,
        "results": results,
    }


# --------------------------------------------------
# GET QUIZ HISTORY
# --------------------------------------------------

@router.get("/attempts")
def get_quiz_attempts(
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):

    user_id = get_user_id(current_user)

    attempts = (
        db.query(QuizAttempt)
        .filter(QuizAttempt.user_id == user_id)
        .order_by(QuizAttempt.created_at.desc())
        .all()
    )

    return {
        "total_attempts": len(attempts),
        "attempts": [
            {
                "id": attempt.id,
                "score": attempt.score,
                "total_questions": attempt.total_questions,
                "percentage": attempt.percentage,
                "created_at": attempt.created_at.isoformat()
                if attempt.created_at else None,
            }
            for attempt in attempts
        ],
    }
