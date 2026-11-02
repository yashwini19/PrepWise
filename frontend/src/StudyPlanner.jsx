
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import "./SyllabusTracker.css";

function SyllabusTracker() {
  const [topics, setTopics] = useState([]);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Fetch topics from the backend.
  const loadTopics = async () => {
    try {
      setError("");
      const response = await api.get("/api/topics");
      setTopics(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError("Unable to load topics. Check whether your backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  // Calculate overall progress.
  const completedCount = topics.filter(
    (topic) => topic.completed
  ).length;

  const totalCount = topics.length;

  const progress = totalCount
    ? Math.round((completedCount / totalCount) * 100)
    : 0;

  // Calculate subject-wise progress and priority.
  const subjectAnalytics = useMemo(() => {
    const grouped = {};

    topics.forEach((topic) => {
      const name = (topic.subject || "General").trim() || "General";

      if (!grouped[name]) {
        grouped[name] = {
          name,
          total: 0,
          completed: 0,
          pendingTopics: [],
        };
      }

      grouped[name].total += 1;

      if (topic.completed) {
        grouped[name].completed += 1;
      } else {
        grouped[name].pendingTopics.push(topic.title);
      }
    });

    return Object.values(grouped)
      .map((item) => {
        const percentage = Math.round(
          (item.completed / item.total) * 100
        );

        let priority = "On Track";
        let priorityClass = "priority-good";

        if (percentage < 40) {
          priority = "High Priority";
          priorityClass = "priority-high";
        } else if (percentage < 75) {
          priority = "Medium Priority";
          priorityClass = "priority-medium";
        }

        return {
          ...item,
          percentage,
          priority,
          priorityClass,
        };
      })
      .sort((a, b) => a.percentage - b.percentage);
  }, [topics]);

  const highPriorityCount = subjectAnalytics.filter(
    (item) => item.priority === "High Priority"
  ).length;

  const mediumPriorityCount = subjectAnalytics.filter(
    (item) => item.priority === "Medium Priority"
  ).length;

  const weakSubjects = subjectAnalytics.filter(
    (item) => item.priority !== "On Track"
  );

  // Add a new topic.
  const addTopic = async (event) => {
    event.preventDefault();

    if (!title.trim() || !subject.trim()) {
      setError("Please enter both topic and subject.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await api.post("/api/topics", {
        title: title.trim(),
        subject: subject.trim(),
      });

      setTitle("");
      await loadTopics();
      setMessage("Topic added successfully!");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to add topic.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle topic completion.
  const toggleTopic = async (topic) => {
    try {
      setError("");
      setMessage("");

      await api.patch(`/api/topics/${topic.id}`);
      await loadTopics();
    } catch (err) {
      setError("Unable to update topic. Please try again.");
    }
  };

  // Apply selected filter.
  const filteredTopics = topics.filter((topic) => {
    if (filter === "Completed") return topic.completed;
    if (filter === "Pending") return !topic.completed;
    return true;
  });

  return (
    <section className="syllabus-page">
      <div className="syllabus-heading">
        <div>
          <span className="syllabus-eyebrow">YOUR LEARNING JOURNEY</span>
          <h1>Syllabus Tracker 📚</h1>
          <p>Track your topics, stay consistent and finish your syllabus.</p>
        </div>
        <div className="syllabus-heading-icon">🎯</div>
      </div>

      {/* Overall progress */}
      <div className="syllabus-overview">
        <div className="overview-top">
          <div>
            <span className="overview-label">Overall completion</span>
            <h2>{progress}%</h2>
            <p>
              {completedCount} of {totalCount} topics completed
            </p>
          </div>
          <div className="progress-circle">
            <span>{progress}%</span>
          </div>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="overview-stats">
          <div>
            <strong>{totalCount}</strong>
            <span>Total topics</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>Completed</span>
          </div>
          <div>
            <strong>{totalCount - completedCount}</strong>
            <span>Remaining</span>
          </div>
        </div>
      </div>

      {/* Add topic form */}
      <div className="syllabus-card">
        <div className="section-heading">
          <div>
            <h2>➕ Add a new topic</h2>
            <p>Organise your syllabus subject by subject.</p>
          </div>
        </div>

        <form className="topic-form" onSubmit={addTopic}>
          <input
            type="text"
            placeholder="Enter topic name (e.g. Arrays)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="text"
            placeholder="Enter subject (e.g. DSA)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <button type="submit" disabled={saving}>
            {saving ? "Adding..." : "Add Topic +"}
          </button>
        </form>

        {error && <p className="syllabus-error">{error}</p>}
        {message && <p className="syllabus-success">{message}</p>}
      </div>

      {/* Weak topic detection */}
      <div className="syllabus-card">
        <div className="section-heading">
          <div>
            <h2>🧠 Weak Topic Detection</h2>
            <p>
              Find subjects that need more attention based on your progress.
            </p>
          </div>
        </div>

        {subjectAnalytics.length === 0 ? (
          <p className="empty-state">
            Add syllabus topics to start analysing your progress.
          </p>
        ) : (
          <>
            <div className="priority-summary">
              <div className="priority-summary-item high-summary">
                <strong>{highPriorityCount}</strong>
                <span>High priority</span>
              </div>

              <div className="priority-summary-item medium-summary">
                <strong>{mediumPriorityCount}</strong>
                <span>Medium priority</span>
              </div>

              <div className="priority-summary-item good-summary">
                <strong>
                  {subjectAnalytics.length -
                    highPriorityCount -
                    mediumPriorityCount}
                </strong>
                <span>On track</span>
              </div>
            </div>

            {weakSubjects.length === 0 ? (
              <div className="all-subjects-good">
                <span>🎉</span>
                <div>
                  <strong>Great progress!</strong>
                  <p>
                    All your subjects have reached at least 75% completion.
                    Keep going!
                  </p>
                </div>
              </div>
            ) : (
              <div className="weak-subject-list">
                {weakSubjects.map((item) => (
                  <div className="weak-subject-item" key={item.name}>
                    <div className="weak-subject-top">
                      <div>
                        <strong>{item.name}</strong>
                        <span>
                          {item.completed}/{item.total} topics completed
                        </span>
                      </div>

                      <span className={`priority-badge ${item.priorityClass}`}>
                        {item.priority}
                      </span>
                    </div>

                    <div className="progress-track weak-progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    <div className="weak-subject-bottom">
                      <strong>{item.percentage}% complete</strong>
                      <span>
                        {item.pendingTopics.length} topic
                        {item.pendingTopics.length === 1 ? "" : "s"} remaining
                      </span>
                    </div>

                    {item.pendingTopics.length > 0 && (
                      <div className="pending-topic-preview">
                        <span>Focus on:</span>
                        {item.pendingTopics.slice(0, 3).map((topic, index) => (
                          <span className="pending-topic-chip" key={`${topic}-${index}`}>
                            {topic}
                          </span>
                        ))}
                        {item.pendingTopics.length > 3 && (
                          <span className="more-topics">
                            +{item.pendingTopics.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Subject progress */}
      <div className="syllabus-card">
        <div className="section-heading">
          <div>
            <h2>📖 Subject Progress</h2>
            <p>See how much of each subject you have completed.</p>
          </div>
        </div>

        {subjectAnalytics.length === 0 ? (
          <p className="empty-state">Add your first topic to get started.</p>
        ) : (
          <div className="subject-list">
            {subjectAnalytics.map((item) => (
              <div className="subject-progress" key={item.name}>
                <div className="subject-progress-info">
                  <strong>{item.name}</strong>
                  <span>
                    {item.completed}/{item.total} topics · {item.percentage}%
                  </span>
                </div>
                <div className="progress-track subject-track">
                  <div
                    className="progress-fill subject-fill"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topic list */}
      <div className="syllabus-card">
        <div className="section-heading topic-list-heading">
          <div>
            <h2>📝 Your Topics</h2>
            <p>Tick a topic when you finish studying it.</p>
          </div>
        </div>

        <div className="topic-filters">
          {["All", "Pending", "Completed"].map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active-filter" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="empty-state">Loading your syllabus...</p>
        ) : filteredTopics.length === 0 ? (
          <p className="empty-state">
            No topics here yet. Add a topic to get started!
          </p>
        ) : (
          <div className="topic-list">
            {filteredTopics.map((topic) => (
              <div
                className={`topic-item ${
                  topic.completed ? "topic-done" : ""
                }`}
                key={topic.id}
              >
                <label className="topic-checkbox">
                  <input
                    type="checkbox"
                    checked={Boolean(topic.completed)}
                    onChange={() => toggleTopic(topic)}
                  />
                  <span className="custom-checkbox" />
                </label>

                <div className="topic-details">
                  <strong>{topic.title}</strong>
                  <span>{topic.subject || "General"}</span>
                </div>

                <span
                  className={`topic-status ${
                    topic.completed ? "status-done" : "status-pending"
                  }`}
                >
                  {topic.completed ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default SyllabusTracker;
