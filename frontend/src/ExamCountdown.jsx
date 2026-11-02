import { useCallback, useEffect, useState } from "react";
import api from "./api";
import "./ExamCountdown.css";

function getDaysRemaining(examDate) {
  if (!examDate) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exam = new Date(`${examDate.slice(0, 10)}T00:00:00`);

  return Math.round((exam - today) / (1000 * 60 * 60 * 24));
}

function formatDate(examDate) {
  if (!examDate) return "Date not available";

  const date = new Date(`${examDate.slice(0, 10)}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ExamCountdown() {
  const [exams, setExams] = useState([]);

  const [form, setForm] = useState({
    name: "",
    subject: "",
    exam_date: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/api/exams/");

      const examList = Array.isArray(response.data)
        ? response.data
        : response.data?.exams || [];

      setExams(
        [...examList].sort(
          (a, b) =>
            new Date(a.exam_date) - new Date(b.exam_date)
        )
      );
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load exams."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm({
      name: "",
      subject: "",
      exam_date: "",
    });

    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      !form.subject.trim() ||
      !form.exam_date
    ) {
      setError("Please fill in all exam details.");
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      subject: form.subject.trim(),
      exam_date: form.exam_date,
    };

    try {
      if (editingId !== null) {
        await api.put(`/api/exams/${editingId}`, payload);
      } else {
        await api.post("/api/exams/", payload);
      }

      resetForm();
      await fetchExams();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to save exam. Please check your connection and login."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(exam) {
    setForm({
      name: exam.name || "",
      subject: exam.subject || "",
      exam_date: exam.exam_date?.slice(0, 10) || "",
    });

    setEditingId(exam.id);
    setError("");
  }

  async function handleDelete(examId) {
    if (!window.confirm("Are you sure you want to delete this exam?")) {
      return;
    }

    setError("");

    try {
      await api.delete(`/api/exams/${examId}`);

      setExams((previous) =>
        previous.filter((exam) => exam.id !== examId)
      );

      if (editingId === examId) {
        resetForm();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to delete exam."
      );
    }
  }

  return (
    <section className="exam-countdown">
      <div className="exam-countdown-header">
        <div>
          <h2>Exam Countdown 📅</h2>
          <p>Keep track of your upcoming examinations.</p>
        </div>
      </div>

      {error && <div className="exam-error">{error}</div>}

      <form className="exam-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          placeholder="Exam name"
          value={form.name}
          onChange={handleChange}
          maxLength={150}
          required
        />

        <input
          type="text"
          name="subject"
          placeholder="Subject"
          value={form.subject}
          onChange={handleChange}
          maxLength={150}
          required
        />

        <input
          type="date"
          name="exam_date"
          value={form.exam_date}
          onChange={handleChange}
          required
        />

        <button type="submit" disabled={saving}>
          {saving
            ? "Saving..."
            : editingId !== null
              ? "Update Exam"
              : "Add Exam"}
        </button>
      </form>

      {editingId !== null && (
        <button
          type="button"
          className="cancel-edit-btn"
          onClick={resetForm}
        >
          Cancel Edit
        </button>
      )}

      {loading ? (
        <div className="exam-empty">Loading exams...</div>
      ) : exams.length === 0 ? (
        <div className="exam-empty">
          No exams added yet. Add your first exam above!
        </div>
      ) : (
        <div className="exam-list">
          {exams.map((exam) => {
            const days = getDaysRemaining(exam.exam_date);

            return (
              <article className="exam-card" key={exam.id}>
                <h3>{exam.name}</h3>
                <p>📚 {exam.subject}</p>
                <p>📅 {formatDate(exam.exam_date)}</p>

                <div className="exam-days">
                  <strong className={days === 0 ? "exam-today" : ""}>
                    {days < 0 ? Math.abs(days) : days}
                  </strong>

                  <span>
                    {days < 0
                      ? "days ago"
                      : days === 0
                        ? "Today!"
                        : "days remaining"}
                  </span>
                </div>

                <div className="exam-actions">
                  <button
                    type="button"
                    onClick={() => handleEdit(exam)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-btn"
                    onClick={() => handleDelete(exam.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default ExamCountdown;