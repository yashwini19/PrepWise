
from datetime import date, timedelta
from pathlib import Path
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import (
    Column,
    Date,
    Integer,
    UniqueConstraint,
    create_engine,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from auth import get_current_user

logger = logging.getLogger(__name__)

# DATABASE CONFIGURATION
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

# ROUTER
router = APIRouter(
    prefix="/api/gamification",
    tags=["Gamification"],
)

# DATABASE TABLE
class StudyCheckin(Base):
    __tablename__ = "user_study_checkins"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    checkin_date = Column(Date, nullable=False)

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "checkin_date",
            name="unique_user_daily_checkin",
        ),
    )


# Create only if the table does not already exist.
Base.metadata.create_all(bind=engine)


# DATABASE DEPENDENCY
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# SUPPORT BOTH DICTIONARY AND OBJECT USERS
def get_user_id(current_user):
    if isinstance(current_user, dict):
        user_id = current_user.get("id")
    else:
        user_id = getattr(current_user, "id", None)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Unable to identify logged-in user.",
        )

    return user_id


# STREAK CALCULATION
def calculate_streaks(checkin_dates):
    if not checkin_dates:
        return 0, 0

    dates = sorted(set(checkin_dates))

    longest_streak = 1
    running_streak = 1

    for index in range(1, len(dates)):
        difference = (dates[index] - dates[index - 1]).days

        if difference == 1:
            running_streak += 1
        else:
            running_streak = 1

        longest_streak = max(longest_streak, running_streak)

    today = date.today()
    date_set = set(dates)

    if today in date_set:
        current_day = today
    elif today - timedelta(days=1) in date_set:
        current_day = today - timedelta(days=1)
    else:
        return 0, longest_streak

    current_streak = 0

    while current_day in date_set:
        current_streak += 1
        current_day -= timedelta(days=1)

    return current_streak, longest_streak


# LEVEL CALCULATION
def calculate_level(total_xp):
    level = (total_xp // 100) + 1
    xp_in_level = total_xp % 100
    xp_to_next_level = 100 - xp_in_level

    return level, xp_in_level, xp_to_next_level


# BUILD GAMIFICATION RESPONSE
def build_gamification_data(db, user_id):
    checkins = (
        db.query(StudyCheckin)
        .filter(StudyCheckin.user_id == user_id)
        .order_by(StudyCheckin.checkin_date.asc())
        .all()
    )

    checkin_dates = [
        checkin.checkin_date for checkin in checkins
    ]

    total_checkins = len(checkins)
    total_xp = total_checkins * 10

    level, xp_in_level, xp_to_next_level = calculate_level(
        total_xp
    )

    current_streak, longest_streak = calculate_streaks(
        checkin_dates
    )

    checked_in_today = date.today() in set(checkin_dates)

    return {
        "total_xp": total_xp,
        "level": level,
        "xp_in_level": xp_in_level,
        "xp_to_next_level": xp_to_next_level,
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "total_checkins": total_checkins,
        "checked_in_today": checked_in_today,
    }


# GET GAMIFICATION DETAILS
@router.get("")
def get_gamification(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = get_user_id(current_user)

    try:
        return build_gamification_data(db, user_id)
    except HTTPException:
        raise
    except Exception:
        logger.exception("Failed to load gamification data")
        raise HTTPException(
            status_code=500,
            detail="Unable to load gamification data.",
        )


# DAILY CHECK-IN
@router.post("/checkin")
def daily_checkin(
    db=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = get_user_id(current_user)
    today = date.today()

    try:
        existing_checkin = (
            db.query(StudyCheckin)
            .filter(
                StudyCheckin.user_id == user_id,
                StudyCheckin.checkin_date == today,
            )
            .first()
        )

        if not existing_checkin:
            db.add(
                StudyCheckin(
                    user_id=user_id,
                    checkin_date=today,
                )
            )
            db.commit()

        return build_gamification_data(db, user_id)

    except Exception:
        db.rollback()
        logger.exception("Daily check-in failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to complete daily check-in.",
        )
