
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Boolean,
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
    connect_args={"check_same_thread": False},
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

Base = declarative_base()


# ==================================================
# DATABASE MODELS
# ==================================================

class StudyTask(Base):
    __tablename__ = "study_tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), default="")
    minutes = Column(Integer, default=30)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, nullable=True, index=True)


class SyllabusTopic(Base):
    __tablename__ = "syllabus_topics"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    subject = Column(String(100), nullable=False)
    topic = Column(String(200), nullable=True)
    completed = Column(Boolean, default=False)
    user_id = Column(Integer, nullable=True, index=True)


# ==================================================
# ROUTER
# ==================================================

router = APIRouter(
    prefix="/api/schedule",
    tags=["Smart Study Schedule"],
)


# ==================================================
# REQUEST MODEL
# ==================================================

class ScheduleInput(BaseModel):
    available_hours: float = Field(
        default=4,
        gt=0,
        le=12,
    )

    days: int = Field(
        default=7,
        ge=1,
        le=30,
    )


# ==================================================
# USER HELPER
# ==================================================

def get_user_id(current_user):
    if isinstance(current_user, dict):
        return current_user["id"]

    return current_user.id


# ==================================================
# PREPARE SCHEDULE ITEM
# ==================================================

def prepare_item(
    item_id,
    title,
    subject,
    duration,
    item_type,
):
    return {
        "id": item_id,
        "title": title or "Untitled study item",
        "subject": subject or "General",
        "duration": max(1, int(duration or 30)),
        "type": item_type,
    }


# ==================================================
# SMART ITEM DISTRIBUTION
# ==================================================

def generate_daily_schedule(items, days, daily_capacity):

    schedule = []

    remaining_items = items.copy()

    previous_subject = None

    for day_number in range(days):

        current_date = date.today() + timedelta(
            days=day_number
        )

        remaining_minutes = daily_capacity
        day_items = []

        # Prefer longer items first, but avoid repeatedly
        # selecting the same subject when possible.
        while remaining_items:

            fitting_items = [
                item for item in remaining_items
                if item["duration"] <= remaining_minutes
            ]

            if not fitting_items:
                break

            different_subject_items = [
                item for item in fitting_items
                if item["subject"] != previous_subject
            ]

            candidates = (
                different_subject_items
                if different_subject_items
                else fitting_items
            )

            # Select the longest item that fits.
            selected_item = max(
                candidates,
                key=lambda item: item["duration"]
            )

            day_items.append(selected_item.copy())

            remaining_minutes -= selected_item["duration"]

            previous_subject = selected_item["subject"]

            remaining_items.remove(selected_item)

        schedule.append({
            "day": day_number + 1,
            "date": current_date.isoformat(),
            "tasks": day_items,
            "total_minutes": daily_capacity - remaining_minutes,
            "remaining_minutes": remaining_minutes,
        })

    return schedule, remaining_items


# ==================================================
# GENERATE SMART STUDY SCHEDULE
# ==================================================

@router.post("/generate")
def generate_schedule(
    data: ScheduleInput,
    current_user=Depends(get_current_user),
):

    try:

        user_id = get_user_id(current_user)

        with SessionLocal() as db:

            # ------------------------------------------
            # FETCH PENDING TASKS
            # ------------------------------------------

            tasks = (
                db.query(StudyTask)
                .filter(
                    StudyTask.user_id == user_id,
                    StudyTask.completed.is_(False),
                )
                .order_by(StudyTask.id.asc())
                .all()
            )

            # ------------------------------------------
            # FETCH PENDING SYLLABUS TOPICS
            # ------------------------------------------

            topics = (
                db.query(SyllabusTopic)
                .filter(
                    SyllabusTopic.user_id == user_id,
                    SyllabusTopic.completed.is_(False),
                )
                .order_by(SyllabusTopic.id.asc())
                .all()
            )

            # ------------------------------------------
            # PREPARE ALL ITEMS
            # ------------------------------------------

            items = []

            for task in tasks:

                items.append(
                    prepare_item(
                        item_id=task.id,
                        title=task.title,
                        subject=task.subject,
                        duration=task.minutes or 30,
                        item_type="Task",
                    )
                )

            for topic in topics:

                # Prefer the new topic column.
                # Fall back to the old title column.
                topic_name = (
                    topic.topic
                    or topic.title
                    or "Untitled topic"
                )

                items.append(
                    prepare_item(
                        item_id=topic.id,
                        title=topic_name,
                        subject=topic.subject,
                        duration=45,
                        item_type="Syllabus",
                    )
                )

            # ------------------------------------------
            # SCHEDULE CONFIGURATION
            # ------------------------------------------

            daily_capacity = int(
                data.available_hours * 60
            )

            # ------------------------------------------
            # GENERATE DAILY SCHEDULE
            # ------------------------------------------

            schedule, remaining_items = generate_daily_schedule(
                items=items,
                days=data.days,
                daily_capacity=daily_capacity,
            )

            # ------------------------------------------
            # UNSCHEDULED ITEMS
            # ------------------------------------------

            unscheduled = [
                item.copy()
                for item in remaining_items
            ]

            # ------------------------------------------
            # STATISTICS
            # ------------------------------------------

            total_minutes = sum(
                item["duration"]
                for item in items
            )

            scheduled_minutes = sum(
                day["total_minutes"]
                for day in schedule
            )

            scheduled_items = (
                len(items) - len(unscheduled)
            )

            total_items = len(items)

            completion_capacity = (
                round(
                    (scheduled_items / total_items) * 100,
                    2
                )
                if total_items > 0
                else 0
            )

            # ------------------------------------------
            # FINAL RESPONSE
            # ------------------------------------------

            return {
                "message": "Study schedule generated successfully",

                "available_hours_per_day": data.available_hours,

                "days": data.days,

                "total_items": total_items,

                "scheduled_items": scheduled_items,

                "unscheduled_items": len(unscheduled),

                "total_study_minutes": total_minutes,

                "scheduled_minutes": scheduled_minutes,

                "completion_capacity": completion_capacity,

                "schedule": schedule,

                "unscheduled": unscheduled,
            }

    except Exception as error:

        print("Schedule generation error:", error)

        raise HTTPException(
            status_code=500,
            detail="Unable to generate your study schedule.",
        )
