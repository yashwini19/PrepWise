import { useCallback, useEffect, useState } from "react";
import {
  Flame,
  Zap,
  Trophy,
  Star,
  CalendarCheck,
  Sparkles,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

import api from "./api";
import "./Gamification.css";

function Gamification() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState("");

  const fetchGamification = useCallback(async () => {
    try {
      setError("");

      const response = await api.get("/api/gamification");
      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to load your rewards. Check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamification();
  }, [fetchGamification]);

  const handleCheckin = async () => {
    try {
      setCheckingIn(true);
      setError("");

      const response = await api.post("/api/gamification/checkin");
      setData(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Check-in failed. Please try again."
      );
    } finally {
      setCheckingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="gamification-loading">
        Loading your rewards...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="gamification-section">
        <p className="gamification-error">
          <AlertCircle size={17} />
          {error}
        </p>

        <button
          type="button"
          className="reward-button"
          onClick={fetchGamification}
        >
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  const progress = Math.min(
    100,
    Math.max(0, Number(data.xp_in_level) || 0)
  );

  return (
    <section className="gamification-section">
      <div className="gamification-heading">
        <div>
          <span className="section-eyebrow">YOUR ACHIEVEMENTS</span>
          <h2>Daily Rewards & Streaks</h2>
          <p>
            Stay consistent, earn XP, and level up your learning journey.
          </p>
        </div>

        <div className="reward-heading-icon">
          <Sparkles size={25} />
        </div>
      </div>

      {error && (
        <div className="gamification-error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      <div className="reward-grid">
        <div className="reward-card level-card">
          <div className="reward-card-top">
            <span>Current Level</span>
            <Star size={21} />
          </div>

          <div className="reward-number">
            Level {data.level ?? 1}
          </div>

          <p>{data.total_xp ?? 0} total XP earned</p>

          <div className="xp-progress-track">
            <div
              className="xp-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <small>
            {data.xp_to_next_level ?? 0} XP to next level
          </small>
        </div>

        <div className="reward-card streak-card">
          <div className="reward-card-top">
            <span>Current Streak</span>
            <Flame size={22} />
          </div>

          <div className="reward-number">
            {data.current_streak ?? 0} <span>days</span>
          </div>

          <p>Keep your daily learning habit alive!</p>
        </div>

        <div className="reward-card longest-card">
          <div className="reward-card-top">
            <span>Longest Streak</span>
            <Trophy size={22} />
          </div>

          <div className="reward-number">
            {data.longest_streak ?? 0} <span>days</span>
          </div>

          <p>Your personal best streak.</p>
        </div>

        <div className="reward-card checkin-card">
          <div className="reward-card-top">
            <span>Total Check-ins</span>
            <CalendarCheck size={22} />
          </div>

          <div className="reward-number">
            {data.total_checkins ?? 0}
          </div>

          <p>Days you have checked in.</p>
        </div>
      </div>

      <div className="daily-checkin-card">
        <div className="checkin-icon">
          <Zap size={27} />
        </div>

        <div className="checkin-content">
          <h3>Daily Study Check-in</h3>

          <p>
            {data.checked_in_today
              ? "You have already checked in today. Great job!"
              : "Complete your daily check-in and earn 10 XP."}
          </p>
        </div>

        <button
          type="button"
          className="reward-button"
          onClick={handleCheckin}
          disabled={checkingIn || data.checked_in_today}
        >
          {checkingIn
            ? "Please wait..."
            : data.checked_in_today
              ? "Checked In ✓"
              : "Check In +10 XP"}
        </button>
      </div>

      <div className="reward-footer">
        <span>
          <Flame size={15} />
          Consistency creates success
        </span>

        <span>
          <Star size={15} />
          One check-in = 10 XP
        </span>
      </div>
    </section>
  );
}

export default Gamification;