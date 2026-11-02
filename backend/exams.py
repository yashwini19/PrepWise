
from datetime import date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import (
    Column,
    Date,
    Integer,
    String,
    create_engine,
    inspect,
    text
)
from sqlalchemy.orm import declarative_base, sessionmaker

from auth import get_current_user


# ==================================================
# DATABASE CONFIGURATION
# ==================================================

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


# ==================================================
# DATABASE MODEL
# ==================================================

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    subject = Column(String(150), nullable=False)
    exam_date = Column(Date, nullable=False)
    user_id = Column(Integer, nullable=True, index=True)


# Create table if it does not exist.
Base.metadata.create_all(bind=engine)


# ==================================================
# DATABASE MIGRATION
# Add user_id to an existing exams table.
# Existing exam records are preserved.
# ==================================================

def migrate_exams_table():
    inspector = inspect(engine)

    if "exams" not in inspector.get_table_names():
        return

    columns = [
        column["name"]
        for column in inspector.get_columns("exams")
    ]

    with engine.begin() as connection:
        if "user_id" not in columns:
            connection.execute(
                text(
                    "ALTER TABLE exams ADD COLUMN user_id INTEGER"
                )
            )

        connection.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_exams_user_id "
                "ON exams (user_id)"
            )
        )


migrate_exams_table()


# ==================================================
# ROUTER
# ==================================================

router = APIRouter(
    prefix="/api/exams",
    tags=["Exams"]
)


# ==================================================
# PYDANTIC SCHEMA
# ==================================================

class ExamInput(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    subject: str = Field(min_length=1, max_length=150)
    exam_date: date


# ==================================================
# DATABASE DEPENDENCY
# ==================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ==================================================
# AUTHENTICATION HELPER
# ==================================================

def get_user_id(current_user):
    if hasattr(current_user, "id"):
        user_id = current_user.id

    elif isinstance(current_user, dict):
        user_id = current_user.get("id")

    else:
        user_id = None

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid user authentication"
        )

    return user_id


# ==================================================
# RESPONSE FORMAT
# ==================================================

def exam_response(exam):
    return {
        "id": exam.id,
        "name": exam.name,
        "subject": exam.subject,
        "exam_date": exam.exam_date.isoformat(),
        "days_remaining": (
            exam.exam_date - date.today()
        ).days
    }


# ==================================================
# GET ALL EXAMS
# ==================================================

@router.get("/")
def get_exams(
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = get_user_id(current_user)

    exams = (
        db.query(Exam)
        .filter(Exam.user_id == user_id)
        .order_by(Exam.exam_date.asc())
        .all()
    )

    return [
        exam_response(exam)
        for exam in exams
    ]


# ==================================================
# ADD EXAM
# ==================================================

@router.post("/", status_code=201)
def add_exam(
    data: ExamInput,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = get_user_id(current_user)

    name = data.name.strip()
    subject = data.subject.strip()

    if not name or not subject:
        raise HTTPException(
            status_code=400,
            detail="Exam name and subject are required"
        )

    exam = Exam(
        name=name,
        subject=subject,
        exam_date=data.exam_date,
        user_id=user_id
    )

    try:
        db.add(exam)
        db.commit()
        db.refresh(exam)

        return exam_response(exam)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to save exam. Please try again."
        )


# ==================================================
# UPDATE EXAM
# ==================================================

@router.put("/{exam_id}")
def update_exam(
    exam_id: int,
    data: ExamInput,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = get_user_id(current_user)

    exam = (
        db.query(Exam)
        .filter(
            Exam.id == exam_id,
            Exam.user_id == user_id
        )
        .first()
    )

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    name = data.name.strip()
    subject = data.subject.strip()

    if not name or not subject:
        raise HTTPException(
            status_code=400,
            detail="Exam name and subject are required"
        )

    exam.name = name
    exam.subject = subject
    exam.exam_date = data.exam_date

    try:
        db.commit()
        db.refresh(exam)

        return exam_response(exam)

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update exam"
        )


# ==================================================
# DELETE EXAM
# ==================================================

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    user_id = get_user_id(current_user)

    exam = (
        db.query(Exam)
        .filter(
            Exam.id == exam_id,
            Exam.user_id == user_id
        )
        .first()
    )

    if not exam:
        raise HTTPException(
            status_code=404,
            detail="Exam not found"
        )

    try:
        db.delete(exam)
        db.commit()

        return {
            "message": "Exam deleted successfully"
        }

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to delete exam"
        )
