
import os
from pathlib import Path
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

from auth import router as auth_router, get_current_user
from gamification import router as gamification_router
from smart_schedule import router as schedule_router
from exams import router as exams_router
from quiz import router as quiz_router

from ml_model import predict_performance, get_model_metrics


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


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------
# DATABASE MODELS
# --------------------------------------------------

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), default="")
    description = Column(String(500), default="")
    minutes = Column(Integer, default=30)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class SyllabusTopic(Base):
    __tablename__ = "syllabus_topics"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    topic = Column(String(200), nullable=False)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# --------------------------------------------------
# SAFE DATABASE MIGRATIONS
# --------------------------------------------------

def migrate_user_columns():
    with engine.begin() as connection:
        for table_name in ["study_tasks", "syllabus_topics"]:

            columns = [
                column["name"]
                for column in inspect(connection).get_columns(table_name)
            ]

            if "user_id" not in columns:
                connection.execute(
                    text(
                        f"ALTER TABLE {table_name} "
                        "ADD COLUMN user_id INTEGER"
                    )
                )

            connection.execute(
                text(
                    f"CREATE INDEX IF NOT EXISTS ix_{table_name}_user_id "
                    f"ON {table_name} (user_id)"
                )
            )


migrate_user_columns()


# --------------------------------------------------
# FASTAPI APPLICATION
# --------------------------------------------------

app = FastAPI(
    title="PrepWise API",
    description="Smart AI-powered study planner and performance tracker",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# ROUTERS
# --------------------------------------------------

app.include_router(auth_router)
app.include_router(gamification_router)
app.include_router(schedule_router)
app.include_router(exams_router)
app.include_router(quiz_router)


# --------------------------------------------------
# PYDANTIC SCHEMAS
# --------------------------------------------------

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    subject: Optional[str] = ""
    description: Optional[str] = ""
    minutes: int = Field(default=30, ge=1, le=1440)


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    minutes: Optional[int] = Field(default=None, ge=1, le=1440)
    completed: Optional[bool] = None


class TopicCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=100)
    topic: str = Field(..., min_length=1, max_length=200)


class TopicUpdate(BaseModel):
    subject: Optional[str] = None
    topic: Optional[str] = None
    completed: Optional[bool] = None


class PredictionInput(BaseModel):
    study_hours: float = Field(..., ge=0, le=24)
    previous_scores: float = Field(..., ge=0, le=100)
    sleep_hours: float = Field(default=7, ge=0, le=24)
    practice_papers: int = Field(default=0, ge=0)
    extracurricular: int = Field(default=0, ge=0, le=1)


# --------------------------------------------------
# HELPERS
# --------------------------------------------------

def get_user_id(current_user):
    if isinstance(current_user, dict):
        return current_user["id"]
    return current_user.id


def task_to_dict(task):
    return {
        "id": task.id,
        "title": task.title,
        "subject": task.subject,
        "description": task.description,
        "minutes": task.minutes,
        "completed": task.completed,
        "created_at": task.created_at,
    }


def topic_to_dict(topic):
    return {
        "id": topic.id,
        "title": topic.title,
        "subject": topic.subject,
        "topic": topic.topic,
        "completed": topic.completed,
        "created_at": topic.created_at,
    }


# --------------------------------------------------
# BASIC ROUTES
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "Welcome to PrepWise API",
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "application": "PrepWise"
    }


# --------------------------------------------------
# ML PERFORMANCE ROUTES
# --------------------------------------------------

@app.post("/api/ml/predict")
def predict_student_performance(
    data: PredictionInput,
    current_user=Depends(get_current_user)
):
    try:
        result = predict_performance(data.model_dump())

        return {
            "prediction": result,
            "message": "Performance prediction successful"
        }

    except Exception as error:
        print("Prediction error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to generate prediction"
        )


@app.get("/api/ml/metrics")
def model_metrics(
    current_user=Depends(get_current_user)
):
    try:
        return get_model_metrics()

    except Exception as error:
        print("Metrics error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch model metrics"
        )


# --------------------------------------------------
# STUDY TASK ROUTES
# --------------------------------------------------

@app.get("/api/tasks")
def get_tasks(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    tasks = (
        db.query(StudyTask)
        .filter(StudyTask.user_id == user_id)
        .order_by(StudyTask.created_at.desc())
        .all()
    )

    return [task_to_dict(task) for task in tasks]


@app.post("/api/tasks")
def create_task(
    data: TaskCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    task = StudyTask(
        title=data.title,
        subject=data.subject or "",
        description=data.description or "",
        minutes=data.minutes,
        completed=False,
        user_id=user_id
    )

    try:
        db.add(task)
        db.commit()
        db.refresh(task)

        return task_to_dict(task)

    except Exception as error:
        db.rollback()
        print("Create task error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to create task"
        )


@app.patch("/api/tasks/{task_id}")
def update_task(
    task_id: int,
    data: TaskUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    task = (
        db.query(StudyTask)
        .filter(
            StudyTask.id == task_id,
            StudyTask.user_id == user_id
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    updates = data.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(task, key, value)

    try:
        db.commit()
        db.refresh(task)

        return task_to_dict(task)

    except Exception as error:
        db.rollback()
        print("Update task error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to update task"
        )


@app.delete("/api/tasks/{task_id}")
def delete_task(
    task_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    task = (
        db.query(StudyTask)
        .filter(
            StudyTask.id == task_id,
            StudyTask.user_id == user_id
        )
        .first()
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted successfully"}


# --------------------------------------------------
# SYLLABUS TRACKER ROUTES
# --------------------------------------------------

@app.get("/api/topics")
def get_topics(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    topics = (
        db.query(SyllabusTopic)
        .filter(SyllabusTopic.user_id == user_id)
        .order_by(SyllabusTopic.created_at.desc())
        .all()
    )

    return [topic_to_dict(topic) for topic in topics]


@app.post("/api/topics")
def create_topic(
    data: TopicCreate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    topic = SyllabusTopic(
        title=data.topic,
        subject=data.subject,
        topic=data.topic,
        completed=False,
        user_id=user_id
    )

    try:
        db.add(topic)
        db.commit()
        db.refresh(topic)

        return topic_to_dict(topic)

    except Exception as error:
        db.rollback()
        print("Create topic error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to create topic"
        )


@app.patch("/api/topics/{topic_id}")
def update_topic(
    topic_id: int,
    data: TopicUpdate,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    topic = (
        db.query(SyllabusTopic)
        .filter(
            SyllabusTopic.id == topic_id,
            SyllabusTopic.user_id == user_id
        )
        .first()
    )

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    updates = data.model_dump(exclude_unset=True)

    for key, value in updates.items():
        setattr(topic, key, value)

    # Keep the old title column synchronized with topic.
    if "topic" in updates and updates["topic"] is not None:
        topic.title = updates["topic"]

    try:
        db.commit()
        db.refresh(topic)

        return topic_to_dict(topic)

    except Exception as error:
        db.rollback()
        print("Update topic error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to update topic"
        )


@app.delete("/api/topics/{topic_id}")
def delete_topic(
    topic_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    topic = (
        db.query(SyllabusTopic)
        .filter(
            SyllabusTopic.id == topic_id,
            SyllabusTopic.user_id == user_id
        )
        .first()
    )

    if not topic:
        raise HTTPException(status_code=404, detail="Topic not found")

    db.delete(topic)
    db.commit()

    return {"message": "Topic deleted successfully"}


# --------------------------------------------------
# DASHBOARD PROGRESS ROUTE
# --------------------------------------------------

@app.get("/api/progress")
def get_progress(
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = get_user_id(current_user)

    total_tasks = (
        db.query(StudyTask)
        .filter(StudyTask.user_id == user_id)
        .count()
    )

    completed_tasks = (
        db.query(StudyTask)
        .filter(
            StudyTask.user_id == user_id,
            StudyTask.completed == True
        )
        .count()
    )

    pending_tasks = total_tasks - completed_tasks

    total_topics = (
        db.query(SyllabusTopic)
        .filter(SyllabusTopic.user_id == user_id)
        .count()
    )

    completed_topics = (
        db.query(SyllabusTopic)
        .filter(
            SyllabusTopic.user_id == user_id,
            SyllabusTopic.completed == True
        )
        .count()
    )

    pending_topics = total_topics - completed_topics

    total_items = total_tasks + total_topics
    completed_items = completed_tasks + completed_topics

    progress_percentage = (
        round((completed_items / total_items) * 100, 2)
        if total_items > 0
        else 0
    )

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "total_topics": total_topics,
        "completed_topics": completed_topics,
        "pending_topics": pending_topics,
        "total_items": total_items,
        "completed_items": completed_items,
        "progress_percentage": progress_percentage
    }
