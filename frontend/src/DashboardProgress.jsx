import { useCallback, useEffect, useState } from "react";
import {
  Target,
  CheckCircle2,
  Clock,
  BookOpen,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import api from "./api";
import "./DashboardProgress.css";

function DashboardProgress() {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProgress = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("prepwise-token");

      if (!token) {
        throw new Error("Please log in again to load your progress.");
      }

      const response = await api.get("/api/progress");

      if (!response.data) {
        throw new Error("The server returned no progress data.");
      }

      setProgress(response.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Your session has expired. Please log in again.");
      } else if (err.response?.status === 500) {
        setError("The backend encountered an error while loading progress.");
      } else {
        setError(
          err.response?.data?.detail ||
            err.message ||
            "Could not load progress. Check your backend."
        );
      }

      console.error("Progress loading failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  if (loading) {
    return (
      <section className="progress-section">
        <p>Loading your study progress...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="progress-section">
        <div className="progress-error">
          <p>{error}</p>
          <button type="button" onClick={loadProgress}>
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </section>
    );
  }

  const percentage = Math.min(
    100,
    Math.max(0, Number(progress?.progress_percentage) || 0)
  );

  const stats = [
    {
      label: "Total Tasks",
      value: progress?.total_tasks,
      icon: Target,
      color: "mint",
    },
    {
      label: "Completed Tasks",
      value: progress?.completed_tasks,
      icon: CheckCircle2,
      color: "lavender",
    },
    {
      label: "Pending Tasks",
      value: progress?.pending_tasks,
      icon: Clock,
      color: "yellow",
    },
    {
      label: "Completed Topics",
      value: progress?.completed_topics,
      icon: BookOpen,
      color: "blue",
    },
  ];

  return (
    <section className="progress-section">
      <div className="progress-heading">
        <div>
          <span className="progress-eyebrow">
            <TrendingUp size={15} />
            YOUR PERFORMANCE
          </span>

          <h2>Study Progress</h2>
          <p>Track your learning journey.</p>
        </div>

        <button
          type="button"
          className="progress-refresh"
          onClick={loadProgress}
          title="Refresh progress"
          aria-label="Refresh progress"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      <div className="progress-overview">
        <div className="progress-circle">
          <div
            className="progress-circle-inner"
            style={{
              background: `conic-gradient(var(--progress-color, #69bda8) ${percentage}%, var(--progress-track, #e9e9ef) 0)`,
            }}
          >
            <div className="progress-circle-center">
              <strong>{percentage.toFixed(0)}%</strong>
              <span>Completed</span>
            </div>
          </div>
        </div>

        <div className="progress-summary">
          <h3>Keep moving forward!</h3>

          <p>
            You have completed {progress?.completed_items ?? 0} out of{" "}
            {progress?.total_items ?? 0} study activities.
          </p>

          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              className="progress-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="progress-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div className="progress-stat-card" key={stat.label}>
              <div className={`progress-stat-icon ${stat.color}`}>
                <Icon size={21} />
              </div>

              <div>
                <strong>{stat.value ?? 0}</strong>
                <span>{stat.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default DashboardProgress;