
import { useState } from "react";
import {
  BrainCircuit,
  Sparkles,
  Clock,
  Moon,
  BookOpen,
  TrendingUp,
  Activity,
  AlertCircle,
} from "lucide-react";

import api from "./api";
import "./MLPerformance.css";

function MLPerformance() {
  const [form, setForm] = useState({
    study_hours: "4",
    previous_scores: "70",
    sleep_hours: "7",
    practice_papers: "3",
    extracurricular: false,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        study_hours: Number(form.study_hours),
        previous_scores: Number(form.previous_scores),
        sleep_hours: Number(form.sleep_hours),
        practice_papers: Number(form.practice_papers),
        extracurricular: form.extracurricular ? 1 : 0,
      };

      const response = await api.post("/api/ml/predict", payload);

      // Backend currently returns: { prediction: ..., message: ... }
      const predictionData = response.data?.prediction;

      // Support either a numeric prediction or an object response.
      let prediction;

      if (typeof predictionData === "number") {
        prediction = predictionData;
      } else if (typeof predictionData === "object" && predictionData !== null) {
        prediction =
          predictionData.predicted_performance_index ??
          predictionData.prediction ??
          predictionData.performance_index ??
          predictionData.score;
      } else {
        prediction =
          response.data?.predicted_performance_index ??
          predictionData;
      }

      const numericScore = Number(prediction);

      if (
        prediction === undefined ||
        prediction === null ||
        !Number.isFinite(numericScore)
      ) {
        throw new Error(
          "The backend did not return a valid prediction. Please check ml_model.py."
        );
      }

      setResult({
        score: Math.min(100, Math.max(0, numericScore)),
        model:
          predictionData?.model ||
          response.data?.model ||
          "Multiple Linear Regression",
        dataset_type:
          predictionData?.dataset_type ||
          response.data?.dataset_type ||
          "Study Data",
        disclaimer:
          predictionData?.disclaimer ||
          response.data?.disclaimer ||
          "This is an estimated result and not a guarantee of actual academic performance.",
      });
    } catch (err) {
      console.error("ML Prediction Error:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to connect to the backend. Please check whether the backend server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const score = result?.score;

  return (
    <div className="ml-page">
      <section className="ml-welcome">
        <div>
          <span className="ml-eyebrow">
            <Sparkles size={15} />
            SMART LEARNING WITH AI
          </span>

          <h1>Performance Prediction</h1>

          <p>
            Discover your estimated academic performance using
            your study habits and learning details.
          </p>
        </div>

        <div className="ml-hero-icon">
          <BrainCircuit size={58} />
        </div>
      </section>

      <div className="ml-content-grid">
        <section className="ml-form-card">
          <div className="ml-card-heading">
            <div className="ml-heading-icon">
              <Activity size={23} />
            </div>

            <div>
              <h2>Your Study Details</h2>
              <p>Enter your information to get an estimate.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="ml-input-grid">
              <label className="ml-field">
                <span>
                  <Clock size={17} />
                  Daily Study Hours
                </span>

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

                <small>Hours studied per day (0–24)</small>
              </label>

              <label className="ml-field">
                <span>
                  <TrendingUp size={17} />
                  Previous Score
                </span>

                <input
                  type="number"
                  name="previous_scores"
                  min="0"
                  max="100"
                  step="0.5"
                  value={form.previous_scores}
                  onChange={handleChange}
                  required
                />

                <small>Previous exam score (0–100)</small>
              </label>

              <label className="ml-field">
                <span>
                  <Moon size={17} />
                  Sleep Hours
                </span>

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

                <small>Average sleep per day</small>
              </label>

              <label className="ml-field">
                <span>
                  <BookOpen size={17} />
                  Practice Papers
                </span>

                <input
                  type="number"
                  name="practice_papers"
                  min="0"
                  max="100"
                  step="1"
                  value={form.practice_papers}
                  onChange={handleChange}
                  required
                />

                <small>Number of papers practised</small>
              </label>
            </div>

            <label className="ml-checkbox-field">
              <input
                type="checkbox"
                name="extracurricular"
                checked={form.extracurricular}
                onChange={handleChange}
              />

              <span>
                I participate in extracurricular activities
              </span>
            </label>

            <button
              type="submit"
              className="ml-submit-button"
              disabled={loading}
            >
              {loading ? (
                "Calculating..."
              ) : (
                <>
                  <BrainCircuit size={19} />
                  Predict My Performance
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="ml-error">
              <AlertCircle size={19} />
              <span>{error}</span>
            </div>
          )}
        </section>

        <section className="ml-result-card">
          <div className="ml-result-heading">
            <div className="ml-result-icon">
              <Sparkles size={23} />
            </div>

            <div>
              <h2>Your Prediction</h2>
              <p>Your estimated performance appears here.</p>
            </div>
          </div>

          {result && Number.isFinite(score) ? (
            <div className="ml-result-content">
              <div
                className="ml-score-circle"
                style={{
                  background: `conic-gradient(#967bd2 ${
                    score * 3.6
                  }deg, #eee9f6 0deg)`,
                }}
              >
                <div>
                  <strong>{score.toFixed(2)}</strong>
                  <span>OUT OF 100</span>
                </div>
              </div>

              <h3>Prediction Generated!</h3>

              <p className="ml-result-description">
                Your estimated performance index is {score.toFixed(2)}.
              </p>

              <div className="ml-result-details">
                <div>
                  <span>Model</span>
                  <strong>{result.model}</strong>
                </div>

                <div>
                  <span>Dataset</span>
                  <strong>{result.dataset_type}</strong>
                </div>
              </div>

              <div className="ml-disclaimer">
                <AlertCircle size={17} />
                <p>{result.disclaimer}</p>
              </div>
            </div>
          ) : (
            <div className="ml-empty-result">
              <div className="ml-empty-icon">
                <BrainCircuit size={48} />
              </div>

              <h3>Ready to Predict?</h3>

              <p>
                Fill in your study details and click the prediction
                button to see your estimated performance.
              </p>
            </div>
          )}
        </section>
      </div>

      <section className="ml-info-card">
        <div className="ml-info-icon">
          <BrainCircuit size={24} />
        </div>

        <div>
          <h3>How does PrepWise predict performance?</h3>

          <p>
            PrepWise uses Multiple Linear Regression. The model
            considers study hours, previous scores, sleep hours,
            practice papers and extracurricular participation
            to calculate an estimated performance index.
          </p>
        </div>
      </section>
    </div>
  );
}

export default MLPerformance;
