
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  CalendarDays,
  Clock,
  RefreshCw,
  Sparkles,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  Timer,
  ChevronRight,
  Layers3,
  Coffee,
} from "lucide-react";

import api from "./api";
import "./SmartSchedule.css";

function SmartSchedule() {
  const [hours, setHours] = useState(3);
  const [days, setDays] = useState(7);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");

  const generateSchedule = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.post("/api/schedule/generate", {
        available_hours: Number(hours),
        days: Number(days),
      });

      const result = response.data;

      if (!result || !Array.isArray(result.schedule)) {
        throw new Error("The backend returned an invalid schedule.");
      }

      setSchedule(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to generate your schedule. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [hours, days]);

  useEffect(() => {
    generateSchedule();
  }, [generateSchedule]);

  const formatDate = (value) => {
    if (!value) return "Date unavailable";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return "Date unavailable";

    return date.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatHours = (minutes = 0) =>
    `${(Number(minutes || 0) / 60).toFixed(1)}h`;

  const getSubjectClass = (subject = "") => {
    const palette = [
      "subject-purple",
      "subject-mint",
      "subject-blue",
      "subject-peach",
      "subject-pink",
      "subject-yellow",
    ];

    let hash = 0;
    for (let i = 0; i < subject.length; i += 1) {
      hash = subject.charCodeAt(i) + ((hash << 5) - hash);
    }

    return palette[Math.abs(hash) % palette.length];
  };

  const plannedDays = schedule?.schedule || [];
  const unscheduledItems = schedule?.unscheduled || [];
  const scheduledItems = schedule?.scheduled_items || 0;
  const totalItems = schedule?.total_items || 0;
  const pendingItems = unscheduledItems.length;

  const visibleDays = useMemo(() => {
    if (activeFilter === "all") return plannedDays;

    if (activeFilter === "today") {
      const today = new Date().toISOString().slice(0, 10);
      return plannedDays.filter((day) => day.date === today);
    }

    return plannedDays;
  }, [plannedDays, activeFilter]);

  const totalMinutes = Number(schedule?.scheduled_minutes || 0);
  const completionRate =
    totalItems > 0
      ? Math.round((scheduledItems / totalItems) * 100)
      : 0;

  return (
    <section className="smart-schedule">
      {/* Page heading */}
      <div className="kanban-heading">
        <div>
          <span className="smart-eyebrow">
            <Sparkles size={14} />
            PLAN • ORGANISE • ACHIEVE
          </span>

          <h1>My Study Planner</h1>

          <p>
            Turn your study goals into a clear daily plan. One session at a
            time.
          </p>
        </div>

        <div className="kanban-heading-icon">
          <BrainCircuit size={31} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="planner-stats">
        <div className="planner-stat">
          <div className="planner-stat-icon stat-purple">
            <CalendarDays size={20} />
          </div>
          <div>
            <strong>{schedule?.days ?? plannedDays.length}</strong>
            <span>Days planned</span>
          </div>
        </div>

        <div className="planner-stat">
          <div className="planner-stat-icon stat-mint">
            <Layers3 size={20} />
          </div>
          <div>
            <strong>{scheduledItems}</strong>
            <span>Study sessions</span>
          </div>
        </div>

        <div className="planner-stat">
          <div className="planner-stat-icon stat-blue">
            <Clock size={20} />
          </div>
          <div>
            <strong>{formatHours(totalMinutes)}</strong>
            <span>Study time planned</span>
          </div>
        </div>

        <div className="planner-stat">
          <div className="planner-stat-icon stat-peach">
            <BookOpen size={20} />
          </div>
          <div>
            <strong>{pendingItems}</strong>
            <span>Unscheduled items</span>
          </div>
        </div>
      </div>

      {/* Schedule generator */}
      <div className="planner-generator">
        <div className="planner-generator-title">
          <div className="generator-icon">
            <Sparkles size={20} />
          </div>

          <div>
            <h2>Build your study plan</h2>
            <p>Choose your available time and let PrepWise organise it.</p>
          </div>
        </div>

        <div className="planner-generator-controls">
          <div className="planner-field">
            <label htmlFor="study-hours">Daily study hours</label>
            <select
              id="study-hours"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((value) => (
                <option key={value} value={value}>
                  {value} {value === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          </div>

          <div className="planner-field">
            <label htmlFor="planning-days">Planning period</label>
            <select
              id="planning-days"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {[7, 14, 21, 30].map((value) => (
                <option key={value} value={value}>
                  {value} days
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="planner-generate-button"
            onClick={generateSchedule}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={loading ? "smart-spin" : ""}
            />
            {loading ? "Creating plan..." : "Generate timetable"}
          </button>
        </div>
      </div>

      {error && (
        <div className="planner-error" role="alert">
          <AlertCircle size={19} />
          <span>{String(error)}</span>
        </div>
      )}

      {loading && !schedule && (
        <div className="planner-loading">
          <RefreshCw size={28} className="smart-spin" />
          <h3>Preparing your study planner...</h3>
          <p>Organising your pending tasks and syllabus topics.</p>
        </div>
      )}

      {schedule && (
        <>
          {/* Progress overview */}
          <section className="planner-progress">
            <div className="planner-progress-top">
              <div>
                <span className="planner-section-label">YOUR OVERVIEW</span>
                <h2>Weekly study progress</h2>
                <p>Your generated plan at a glance.</p>
              </div>

              <div className="planner-progress-percent">
                {completionRate}%
              </div>
            </div>

            <div className="planner-progress-track">
              <div
                className="planner-progress-fill"
                style={{ width: `${completionRate}%` }}
              />
            </div>

            <div className="planner-progress-bottom">
              <span>{scheduledItems} sessions scheduled</span>
              <span>{totalItems} total items</span>
            </div>
          </section>

          {/* Kanban board */}
          <section className="planner-board-section">
            <div className="planner-board-heading">
              <div>
                <span className="planner-section-label">
                  YOUR PERSONAL TIMETABLE
                </span>
                <h2>Study board</h2>
                <p>Each column represents one day of your plan.</p>
              </div>

              <div className="planner-filters">
                <button
                  type="button"
                  className={activeFilter === "all" ? "selected" : ""}
                  onClick={() => setActiveFilter("all")}
                >
                  All days
                </button>
                <button
                  type="button"
                  className={activeFilter === "today" ? "selected" : ""}
                  onClick={() => setActiveFilter("today")}
                >
                  Today
                </button>
              </div>
            </div>

            {lastUpdated && (
              <p className="planner-updated">
                <CheckCircle2 size={14} />
                Last generated at {lastUpdated.toLocaleTimeString("en-IN")}
              </p>
            )}

            {visibleDays.length > 0 ? (
              <div className="kanban-board">
                {visibleDays.map((day, index) => {
                  const dayTasks = Array.isArray(day.tasks) ? day.tasks : [];
                  const dateLabel = formatDate(day.date);

                  return (
                    <article
                      className="kanban-day-column"
                      key={`${day.date || "day"}-${day.day || index}`}
                    >
                      <div className="kanban-column-header">
                        <div>
                          <span className="kanban-day-count">
                            DAY {day.day || index + 1}
                          </span>
                          <h3>{dateLabel}</h3>
                        </div>

                        <span className="kanban-task-count">
                          {dayTasks.length}
                        </span>
                      </div>

                      <div className="kanban-column-time">
                        <Clock size={14} />
                        {formatHours(day.total_minutes)} planned
                      </div>

                      <div className="kanban-task-list">
                        {dayTasks.length > 0 ? (
                          dayTasks.map((task, taskIndex) => {
                            const subject = task.subject || "General";
                            const subjectClass = getSubjectClass(subject);

                            return (
                              <div
                                className={`kanban-task-card ${subjectClass}`}
                                key={`${task.type || "item"}-${task.id || taskIndex}`}
                              >
                                <div className="kanban-card-top">
                                  <span className="kanban-subject">
                                    {subject}
                                  </span>

                                  <span className="kanban-type">
                                    {task.type === "Task" ? (
                                      <BookOpen size={13} />
                                    ) : (
                                      <GraduationCap size={13} />
                                    )}
                                    {task.type || "Study"}
                                  </span>
                                </div>

                                <h4>{task.title || "Study session"}</h4>

                                <div className="kanban-card-footer">
                                  <span>
                                    <Timer size={14} />
                                    {task.duration ?? 0} min
                                  </span>

                                  <span className="kanban-card-arrow">
                                    <ChevronRight size={15} />
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="kanban-empty-day">
                            <Coffee size={23} />
                            <strong>Free day</strong>
                            <span>Time for revision or rest.</span>
                          </div>
                        )}
                      </div>

                      <div className="kanban-column-footer">
                        <Clock size={13} />
                        {day.remaining_minutes ?? 0} min available
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="planner-empty-filter">
                <CalendarDays size={27} />
                <h3>No sessions for today</h3>
                <p>Switch to All days to view your complete timetable.</p>
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                >
                  View all days
                </button>
              </div>
            )}
          </section>

          {/* Empty schedule */}
          {totalItems === 0 && (
            <div className="planner-empty">
              <div className="planner-empty-icon">
                <BookOpen size={30} />
              </div>
              <h3>Your study board is waiting!</h3>
              <p>
                Add study tasks in Study Tasks or topics in Syllabus Tracker.
                Then generate your timetable again.
              </p>
            </div>
          )}

          {/* Unscheduled items */}
          {unscheduledItems.length > 0 && (
            <section className="planner-unscheduled">
              <div className="planner-unscheduled-heading">
                <AlertCircle size={20} />
                <div>
                  <h3>Needs more planning</h3>
                  <p>
                    These items could not fit into your selected study time.
                    Increase your daily hours or planning period.
                  </p>
                </div>
              </div>

              <div className="planner-unscheduled-list">
                {unscheduledItems.map((item, index) => (
                  <div
                    className="planner-unscheduled-item"
                    key={`${item.type || "item"}-${item.id || index}`}
                  >
                    <div>
                      <strong>{item.title || "Untitled item"}</strong>
                      <span>{item.subject || "General"} · {item.type || "Study"}</span>
                    </div>
                    <span className="unscheduled-duration">
                      {item.duration ?? 0} min
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Final summary */}
          <div className="planner-summary">
            <div className="planner-summary-icon">
              <GraduationCap size={24} />
            </div>
            <div>
              <h3>Keep your momentum going!</h3>
              <p>
                Your timetable has {scheduledItems} scheduled sessions.
                {pendingItems > 0
                  ? ` ${pendingItems} items still need more planning.`
                  : " All pending items fit into your generated plan."}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default SmartSchedule;
