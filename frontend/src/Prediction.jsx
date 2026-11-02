import { useState } from "react";
import { BrainCircuit, Sparkles, TrendingUp } from "lucide-react";
import api from "./api";
import "./Prediction.css";

function Prediction() {
  const [form, setForm] = useState({
    study_hours: 6,
    previous_scores: 75,
    extracurricular: true,
    sleep_hours: 8,
    practice_papers: 5,
  });

  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value === ""
            ? ""
            : Number(value),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (
      form.study_hours === "" ||
      form.previous_scores === "" ||
      form.sleep_hours === "" ||
      form.practice_papers === "" ||
      form.study_hours < 0 ||
      form.study_hours > 24 ||
      form.previous_scores < 0 ||
      form.previous_scores > 100 ||
      form.sleep_hours < 0 ||
      form.sleep_hours > 24 ||
      form.practice_papers < 0 ||
      form.practice_papers > 100
    ) {
      setError("Please enter valid values within the allowed ranges.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/api/ml/predict", {
        study_hours: Number(form.study_hours),
        previous_scores: Number(form.previous_scores),
        sleep_hours: Number(form.sleep_hours),
        practice_papers: Number(form.practice_papers),
        extracurricular: form.extracurricular,
      });

      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not get a prediction. Check that the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="prediction-page">
      <div className="prediction-heading">
        <p className="prediction-eyebrow">YOUR LEARNING JOURNEY</p>
        <h1>Performance Predictor</h1>
        <p>
          Enter your study habits to get a demonstration estimate from
          the PrepWise machine-learning model.
        </p>
      </div>

      <form className="prediction-card" onSubmit={handleSubmit}>
        <div className="prediction-grid">
          <label>
            Daily study hours
            <input
              type="number"
              name="study_hours"
              min="0"
              max="24"
              step="0.5"
              value={form.study_hours}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Previous score (0–100)
            <input
              type="number"
              name="previous_scores"
              min="0"
              max="100"
              value={form.previous_scores}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Sleep hours per day
            <input
              type="number"
              name="sleep_hours"
              min="0"
              max="24"
              step="0.5"
              value={form.sleep_hours}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Practice papers completed
            <input
              type="number"
              name="practice_papers"
              min="0"
              max="100"
              value={form.practice_papers}
              onChange={handleChange}
              required
            />
          </label>
        </div>

        <label className="prediction-checkbox">
          <input
            type="checkbox"
            name="extracurricular"
            checked={form.extracurricular}
            onChange={handleChange}
          />
          I participate in extracurricular activities
        </label>

        <button
          className="prediction-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Predicting..." : "Predict My Performance"}
        </button>

        {error && <p className="prediction-error">{error}</p>}

        {result && (
          <div className="prediction-result" aria-live="polite">
            <TrendingUp size={28} />
            <p>YOUR DEMONSTRATION ESTIMATE</p>
            <h2>
              {result.predicted_performance_index ?? "N/A"}/100
            </h2>
            <p>Model: {result.model ?? "Not specified"}</p>
            <small>
              {result.disclaimer ||
                "This is an estimated result, not a guaranteed academic outcome."}
            </small>
          </div>
        )}
      </form>
    </section>
  );
}

export default Prediction;