
import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CheckCircle2,
  Circle,
  Clock3,
  BookOpen,
  ClipboardList,
  X,
  Save,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import api from "./api";
import "./StudyTasks.css";

const emptyForm = {
  title: "",
  subject: "",
  description: "",
  minutes: 30,
};

function StudyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/tasks");
      setTasks(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to load your tasks. Please check your backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const completedCount = tasks.filter((task) => task.completed).length;
  const pendingCount = tasks.length - completedCount;
  const totalMinutes = tasks.reduce(
    (total, task) => total + (Number(task.minutes) || 0),
    0
  );

  const filteredTasks = tasks.filter((task) => {
    const matchesFilter =
      filter === "all" ||
      (filter === "completed" && task.completed) ||
      (filter === "pending" && !task.completed);

    const searchText = search.toLowerCase();

    const matchesSearch =
      (task.title || "").toLowerCase().includes(searchText) ||
      (task.subject || "").toLowerCase().includes(searchText) ||
      (task.description || "").toLowerCase().includes(searchText);

    return matchesFilter && matchesSearch;
  });

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: name === "minutes" ? value : value,
    }));
  };

  const openAddForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (task) => {
    setForm({
      title: task.title || "",
      subject: task.subject || "",
      description: task.description || "",
      minutes: task.minutes || 30,
    });
    setEditingId(task.id);
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Please enter a task title.");
      return;
    }

    const minutes = Number(form.minutes);

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError("Duration must be between 1 and 1440 minutes.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      description: form.description.trim(),
      minutes,
    };

    setSaving(true);

    try {
      if (editingId !== null) {
        await api.patch(`/api/tasks/${editingId}`, payload);
        setSuccess("Task updated successfully!");
      } else {
        await api.post("/api/tasks", payload);
        setSuccess("New study task added!");
      }

      closeForm();
      await loadTasks();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to save task. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleTask = async (task) => {
    setError("");
    setSuccess("");

    try {
      const response = await api.patch(`/api/tasks/${task.id}`, {
        completed: !task.completed,
      });

      setTasks((previous) =>
        previous.map((item) =>
          item.id === task.id ? response.data : item
        )
      );

      setSuccess(
        !task.completed
          ? "Great work! Task completed."
          : "Task moved back to pending."
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to update task status."
      );
    }
  };

  const deleteTask = async (task) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await api.delete(`/api/tasks/${task.id}`);
      setTasks((previous) =>
        previous.filter((item) => item.id !== task.id)
      );
      setSuccess("Task deleted successfully.");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to delete this task."
      );
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours && remainingMinutes) {
      return `${hours}h ${remainingMinutes}m`;
    }

    if (hours) return `${hours}h`;
    return `${remainingMinutes}m`;
  };

  return (
    <div className="study-tasks-page">
      <section className="tasks-hero">
        <div className="tasks-hero-content">
          <span className="tasks-eyebrow">
            <Sparkles size={15} /> YOUR DAILY PRODUCTIVITY
          </span>

          <h1>Make every study session count.</h1>

          <p>
            Plan your learning, complete your goals and celebrate
            every little achievement.
          </p>

          <button
            type="button"
            className="tasks-add-button"
            onClick={openAddForm}
          >
            <Plus size={19} />
            Create New Task
          </button>
        </div>

        <div className="tasks-hero-icon">
          <ClipboardList size={76} />
        </div>
      </section>

      <section className="tasks-stat-grid">
        <div className="task-stat-card">
          <div className="task-stat-icon purple">
            <ClipboardList size={22} />
          </div>
          <span>Total Tasks</span>
          <strong>{tasks.length}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon green">
            <CheckCircle2 size={22} />
          </div>
          <span>Completed</span>
          <strong>{completedCount}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon orange">
            <Circle size={22} />
          </div>
          <span>Pending</span>
          <strong>{pendingCount}</strong>
        </div>

        <div className="task-stat-card">
          <div className="task-stat-icon blue">
            <Clock3 size={22} />
          </div>
          <span>Planned Study Time</span>
          <strong>{formatDuration(totalMinutes)}</strong>
        </div>
      </section>

      {tasks.length > 0 && (
        <section className="tasks-progress-card">
          <div className="tasks-progress-heading">
            <div>
              <span className="tasks-eyebrow">YOUR PROGRESS</span>
              <h3>You're making progress!</h3>
            </div>
            <strong>
              {Math.round((completedCount / tasks.length) * 100)}%
            </strong>
          </div>

          <div className="tasks-progress-track">
            <div
              className="tasks-progress-fill"
              style={{
                width: `${(completedCount / tasks.length) * 100}%`,
              }}
            />
          </div>

          <p>
            {completedCount} out of {tasks.length} tasks completed.
            Keep going!
          </p>
        </section>
      )}

      {error && (
        <div className="tasks-message error-message">
          {error}
        </div>
      )}

      {success && (
        <div className="tasks-message success-message">
          {success}
        </div>
      )}

      <section className="tasks-list-section">
        <div className="tasks-list-heading">
          <div>
            <span className="tasks-eyebrow">STAY ORGANIZED</span>
            <h2>Your Study Tasks</h2>
            <p>Manage your daily learning goals in one place.</p>
          </div>

          <button
            type="button"
            className="tasks-refresh-button"
            onClick={loadTasks}
            disabled={loading}
            title="Refresh tasks"
          >
            <RefreshCw size={18} />
          </button>
        </div>

        <div className="tasks-toolbar">
          <div className="tasks-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search tasks or subjects..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className="tasks-filter">
            {["all", "pending", "completed"].map((item) => (
              <button
                type="button"
                key={item}
                className={filter === item ? "selected" : ""}
                onClick={() => setFilter(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="tasks-empty-state">
            <RefreshCw className="tasks-loading-icon" size={30} />
            <h3>Loading your tasks...</h3>
            <p>Getting your study plan ready.</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="tasks-empty-state">
            <div className="tasks-empty-icon">
              <BookOpen size={34} />
            </div>
            <h3>
              {tasks.length === 0
                ? "Your study journey starts here!"
                : "No matching tasks found"}
            </h3>
            <p>
              {tasks.length === 0
                ? "Create your first study task and start building a productive routine."
                : "Try another search or select a different filter."}
            </p>

            {tasks.length === 0 && (
              <button
                type="button"
                className="tasks-add-button"
                onClick={openAddForm}
              >
                <Plus size={18} /> Add Your First Task
              </button>
            )}
          </div>
        ) : (
          <div className="tasks-list">
            {filteredTasks.map((task) => (
              <article
                className={`study-task-card ${
                  task.completed ? "task-is-completed" : ""
                }`}
                key={task.id}
              >
                <button
                  type="button"
                  className="task-complete-button"
                  onClick={() => toggleTask(task)}
                  title={
                    task.completed
                      ? "Mark as pending"
                      : "Mark as completed"
                  }
                  aria-label="Toggle task completion"
                >
                  {task.completed ? (
                    <CheckCircle2 size={25} />
                  ) : (
                    <Circle size={25} />
                  )}
                </button>

                <div className="study-task-content">
                  <div className="study-task-title-row">
                    <h3>{task.title}</h3>
                    <span
                      className={`task-status ${
                        task.completed ? "completed" : "pending"
                      }`}
                    >
                      {task.completed ? "Completed" : "Pending"}
                    </span>
                  </div>

                  {task.subject && (
                    <span className="study-task-subject">
                      <BookOpen size={14} />
                      {task.subject}
                    </span>
                  )}

                  {task.description && (
                    <p className="study-task-description">
                      {task.description}
                    </p>
                  )}

                  <span className="study-task-duration">
                    <Clock3 size={14} />
                    {formatDuration(Number(task.minutes) || 0)}
                  </span>
                </div>

                <div className="study-task-actions">
                  <button
                    type="button"
                    onClick={() => openEditForm(task)}
                    title="Edit task"
                    aria-label="Edit task"
                  >
                    <Pencil size={17} />
                  </button>

                  <button
                    type="button"
                    className="delete-task-button"
                    onClick={() => deleteTask(task)}
                    title="Delete task"
                    aria-label="Delete task"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <div
          className="tasks-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            className="tasks-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-form-title"
          >
            <div className="tasks-modal-heading">
              <div>
                <span className="tasks-eyebrow">STUDY PLANNER</span>
                <h2 id="task-form-title">
                  {editingId !== null ? "Edit Task" : "Create a Task"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="tasks-modal-close"
                aria-label="Close form"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="task-title">Task Title *</label>
              <input
                id="task-title"
                name="title"
                value={form.title}
                onChange={updateForm}
                placeholder="e.g. Complete DSA arrays"
                maxLength={200}
                required
              />

              <label htmlFor="task-subject">Subject</label>
              <input
                id="task-subject"
                name="subject"
                value={form.subject}
                onChange={updateForm}
                placeholder="e.g. Data Structures"
                maxLength={100}
              />

              <label htmlFor="task-description">Description</label>
              <textarea
                id="task-description"
                name="description"
                value={form.description}
                onChange={updateForm}
                placeholder="Add a few details about this task..."
                maxLength={500}
                rows={3}
              />

              <label htmlFor="task-minutes">Study Duration (minutes)</label>
              <input
                id="task-minutes"
                type="number"
                name="minutes"
                min="1"
                max="1440"
                value={form.minutes}
                onChange={updateForm}
                required
              />

              {error && (
                <div className="tasks-message error-message">
                  {error}
                </div>
              )}

              <div className="tasks-modal-actions">
                <button
                  type="button"
                  className="tasks-cancel-button"
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="tasks-add-button"
                  disabled={saving}
                >
                  <Save size={17} />
                  {saving
                    ? "Saving..."
                    : editingId !== null
                    ? "Save Changes"
                    : "Create Task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default StudyTasks;
