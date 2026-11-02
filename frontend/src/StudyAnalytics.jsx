import { useCallback, useEffect, useState } from "react";
import api from "./api";
import "./StudyAnalytics.css";

function StudyAnalytics() {
  const [tasks, setTasks] = useState([]);
  const [topics, setTopics] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const results = await Promise.allSettled([
        api.get("/api/tasks"),
        api.get("/api/topics"),
        api.get("/api/ml/metrics"),
      ]);

      const [taskResult, topicResult, metricsResult] = results;

      if (taskResult.status === "fulfilled") {
        setTasks(
          Array.isArray(taskResult.value.data)
            ? taskResult.value.data
            : []
        );
      } else {
        setTasks([]);
      }

      if (topicResult.status === "fulfilled") {
        setTopics(
          Array.isArray(topicResult.value.data)
            ? topicResult.value.data
            : []
        );
      } else {
        setTopics([]);
      }

      if (metricsResult.status === "fulfilled") {
        setMetrics(metricsResult.value.data);
      } else {
        setMetrics(null);
      }

      if (results.every((result) => result.status === "rejected")) {
        throw new Error(
          "Unable to load analytics. Please check your backend."
        );
      }

      if (results.some((result) => result.status === "rejected")) {
        setError(
          "Some analytics data could not be loaded. Try refreshing."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const completedTasks = tasks.filter((task) => task.completed);
  const completedTopics = topics.filter((topic) => topic.completed);

  const totalTaskCount = tasks.length;
  const totalTopicCount = topics.length;

  const taskPercentage = totalTaskCount
    ? Math.round((completedTasks.length / totalTaskCount) * 100)
    : 0;

  const topicPercentage = totalTopicCount
    ? Math.round((completedTopics.length / totalTopicCount) * 100)
    : 0;

  const completedTaskMinutes = completedTasks.reduce(
    (total, task) => total + (Number(task.minutes) || 0),
    0
  );

  const formatMinutes = (minutes) =>
    `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  const formatMetric = (value) => {
    const number = Number(value);
    return value !== null &&
      value !== undefined &&
      Number.isFinite(number)
      ? number.toFixed(2)
      : "N/A";
  };

  if (loading) {
    return (
      <section className="study-analytics">
        <p>Loading your analytics...</p>
      </section>
    );
  }

  return (
    <section className="study-analytics">
      <div className="analytics-header">
        <div>
          <h2>📊 Study Analytics</h2>
          <p>Track your learning progress and performance.</p>
        </div>

        <button type="button" onClick={loadAnalytics}>
          ↻ Refresh
        </button>
      </div>

      {error && <p className="analytics-error">{error}</p>}

      <div className="analytics-stats">
        <div className="analytics-card">
          <span>✅</span>
          <h3>
            {completedTasks.length}/{totalTaskCount}
          </h3>
          <p>Completed Tasks</p>
        </div>

        <div className="analytics-card">
          <span>📚</span>
          <h3>
            {completedTopics.length}/{totalTopicCount}
          </h3>
          <p>Completed Topics</p>
        </div>

        <div className="analytics-card">
          <span>⏱️</span>
          <h3>{formatMinutes(completedTaskMinutes)}</h3>
          <p>Planned time for completed tasks</p>
        </div>
      </div>

      <div className="analytics-progress">
        <h3>Learning Progress</h3>

        <div className="progress-item">
          <div>
            <span>Task Completion</span>
            <strong>{taskPercentage}%</strong>
          </div>

          <div className="analytics-progress-track">
            <div
              className="analytics-progress-fill"
              style={{ width: `${taskPercentage}%` }}
            />
          </div>
        </div>

        <div className="progress-item">
          <div>
            <span>Syllabus Completion</span>
            <strong>{topicPercentage}%</strong>
          </div>

          <div className="analytics-progress-track">
            <div
              className="analytics-progress-fill"
              style={{ width: `${topicPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="analytics-performance">
        <h3>🤖 ML Model Performance</h3>

        {metrics ? (
          <>
            <div className="analytics-metric-grid">
              <div>
                <strong>{formatMetric(metrics.mae)}</strong>
                <span>MAE</span>
              </div>

              <div>
                <strong>{formatMetric(metrics.mse)}</strong>
                <span>MSE</span>
              </div>

              <div>
                <strong>{formatMetric(metrics.rmse)}</strong>
                <span>RMSE</span>
              </div>

              <div>
                <strong>{formatMetric(metrics.r2)}</strong>
                <span>R² Score</span>
              </div>
            </div>

            <p>Model: {metrics.model || "Regression model"}</p>

            <p>
              Training samples: {metrics.training_samples ?? "N/A"}
            </p>

            <p className="analytics-warning">
              {metrics.warning || "Model metrics should be interpreted as estimates."}
            </p>
          </>
        ) : (
          <p>ML performance metrics are unavailable.</p>
        )}
      </div>

      <p className="analytics-note">
        Completed task time is calculated from planned task durations.
        It does not measure actual focus time.
      </p>
    </section>
  );
}

export default StudyAnalytics;