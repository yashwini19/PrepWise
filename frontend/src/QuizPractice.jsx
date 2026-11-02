
import { useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import api from "./api";
import "./QuizPractice.css";

function QuizPractice() {
  const [subject, setSubject] = useState("Computer Science");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [questionCount, setQuestionCount] = useState(10);

  const [questions, setQuestions] = useState([]);
  const [quizId, setQuizId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [result, setResult] = useState(null);

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];

  function getQuestionText(question) {
    return question?.question || question?.question_text || question?.text || "";
  }

  function getQuestionId(question, index) {
    return String(question?.id ?? question?.question_id ?? index);
  }

  function getOptions(question) {
    const raw = question?.options;

    if (Array.isArray(raw)) {
      return raw.map((option, index) => {
        if (typeof option === "string") {
          return { key: String.fromCharCode(65 + index), text: option };
        }

        const key = String(
          option.key ?? option.id ?? option.value ?? String.fromCharCode(65 + index)
        );

        return {
          key,
          text: String(option.text ?? option.label ?? option.value ?? ""),
        };
      });
    }

    if (raw && typeof raw === "object") {
      return Object.entries(raw).map(([key, value]) => ({
        key,
        text: String(
          typeof value === "object"
            ? value.text ?? value.label ?? value.value ?? ""
            : value
        ),
      }));
    }

    return [];
  }

  function getOptionKey(question, answer) {
    const option = getOptions(question).find(
      (item) => item.key === String(answer)
    );
    return option?.key ?? String(answer);
  }

  async function startQuiz(event) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await api.post("/api/quiz/generate", {
        subject: subject.trim(),
        topic: topic.trim() || null,
        difficulty,
        question_count: Number(questionCount),
      });

      const data = response.data;
      const questionList = data.questions || [];

      if (!data.quiz_id || !questionList.length) {
        throw new Error("The server did not return a valid quiz. Please try again.");
      }

      setQuizId(data.quiz_id);
      setQuestions(questionList);
      setCurrentIndex(0);
      setAnswers({});
      setSelectedAnswer("");
      setFinished(false);
      setStarted(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Unable to generate your quiz. Please try again."
      );
      setStarted(false);
    } finally {
      setLoading(false);
    }
  }

  function chooseAnswer(value) {
    setSelectedAnswer(String(value));
  }

  function saveAnswer() {
    if (!selectedAnswer || !currentQuestion) return;

    const questionId = getQuestionId(currentQuestion, currentIndex);

    setAnswers((previous) => ({
      ...previous,
      [questionId]: getOptionKey(currentQuestion, selectedAnswer),
    }));

    setSelectedAnswer("");
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  }

  async function submitQuiz() {
    if (!quizId) {
      setError("Quiz session not found. Please start a new quiz.");
      return;
    }

    const finalAnswers = { ...answers };

    if (selectedAnswer && currentQuestion) {
      finalAnswers[getQuestionId(currentQuestion, currentIndex)] =
        getOptionKey(currentQuestion, selectedAnswer);
    }

    setSubmitting(true);
    setError("");

    try {
      const response = await api.post("/api/quiz/submit", {
        quiz_id: quizId,
        answers: finalAnswers,
      });

      setAnswers(finalAnswers);
      setResult(response.data);
      setFinished(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to submit your quiz. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function restartQuiz() {
    setQuestions([]);
    setQuizId(null);
    setCurrentIndex(0);
    setAnswers({});
    setSelectedAnswer("");
    setResult(null);
    setStarted(false);
    setFinished(false);
    setError("");
  }

  function getResultScore() {
    return Number(result?.score ?? result?.correct_answers ?? 0);
  }

  function getResultTotal() {
    return Number(
      result?.total_questions ?? result?.total ?? questions.length
    );
  }

  function getResultPercentage() {
    if (result?.percentage !== undefined) {
      return Number(result.percentage);
    }

    const total = getResultTotal();
    return total ? Math.round((getResultScore() / total) * 100) : 0;
  }

  if (loading) {
    return (
      <section className="quiz-page">
        <div className="quiz-start-card">
          <div className="quiz-main-icon">
            <BrainCircuit size={38} />
          </div>
          <h2>Preparing your quiz...</h2>
          <p>AI is generating your questions. Please wait.</p>
          <div className="quiz-loading-bar"><span /></div>
        </div>
      </section>
    );
  }

  if (!started) {
    return (
      <section className="quiz-page">
        <div className="quiz-heading">
          <span className="quiz-eyebrow">LEARN • PRACTICE • IMPROVE</span>
          <h1>Quiz Practice</h1>
          <p>Generate an AI-powered quiz and test your knowledge.</p>
        </div>

        <form className="quiz-start-card" onSubmit={startQuiz}>
          <div className="quiz-main-icon">
            <BrainCircuit size={38} />
          </div>

          <h2>Ready to test your knowledge?</h2>
          <p>Choose your preferences and let AI prepare your quiz.</p>

          <div className="quiz-form-fields">
            <label>
              Subject
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="e.g. Computer Science"
                required
              />
            </label>

            <label>
              Topic <span className="quiz-optional">(optional)</span>
              <input
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. DBMS, Python, Machine Learning"
              />
            </label>

            <div className="quiz-form-row">
              <label>
                Difficulty
                <select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </label>

              <label>
                Questions
                <select
                  value={questionCount}
                  onChange={(event) =>
                    setQuestionCount(Number(event.target.value))
                  }
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </label>
            </div>
          </div>

          {error && <p className="quiz-error" role="alert">{error}</p>}

          <button
            type="submit"
            className="quiz-primary-button"
            disabled={!subject.trim()}
          >
            <Sparkles size={17} />
            Generate Quiz
          </button>
        </form>
      </section>
    );
  }

  if (finished) {
    const score = getResultScore();
    const total = getResultTotal();
    const percentage = getResultPercentage();

    return (
      <section className="quiz-page">
        <div className="quiz-result-card">
          <div className="quiz-result-icon">
            <Trophy size={38} />
          </div>

          <span className="quiz-eyebrow">YOUR PERFORMANCE</span>
          <h1>Quiz Completed!</h1>
          <p>Great effort! Here is your result.</p>

          <div className="quiz-score-circle">
            <strong>{score}/{total}</strong>
            <span>Your score</span>
          </div>

          <h2>{percentage}%</h2>
          <p>
            You answered {score} out of {total} questions correctly.
          </p>

          <div className="quiz-result-details">
            <div>
              <strong>{score}</strong>
              <span>Correct</span>
            </div>
            <div>
              <strong>{Math.max(total - score, 0)}</strong>
              <span>Incorrect</span>
            </div>
            <div>
              <strong>{percentage}%</strong>
              <span>Percentage</span>
            </div>
          </div>

          <button
            className="quiz-primary-button"
            type="button"
            onClick={restartQuiz}
          >
            <RotateCcw size={17} />
            Try Another Quiz
          </button>
        </div>

        {Array.isArray(result?.results) && (
          <div className="quiz-review-card">
            <h2>Answer Review</h2>
            {result.results.map((item, index) => (
              <div className="quiz-review-item" key={item.question_id ?? index}>
                <strong>Q{index + 1}. {item.question || item.question_text}</strong>
                <p>{item.explanation || item.feedback || "No explanation provided."}</p>
                <span className={item.is_correct ? "review-correct" : "review-incorrect"}>
                  {item.is_correct ? "Correct" : "Incorrect"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="quiz-page">
        <div className="quiz-start-card">
          <h2>No question available</h2>
          <button className="quiz-primary-button" onClick={restartQuiz}>
            Return to Quiz Setup
          </button>
        </div>
      </section>
    );
  }

  const options = getOptions(currentQuestion);
  const questionId = getQuestionId(currentQuestion, currentIndex);
  const alreadyAnswered = answers[questionId] !== undefined;

  return (
    <section className="quiz-page">
      <div className="quiz-heading">
        <span className="quiz-eyebrow">LEARN • PRACTICE • IMPROVE</span>
        <h1>Quiz Practice</h1>
        <p>{subject} {topic ? `• ${topic}` : ""} • {difficulty}</p>
      </div>

      <div className="quiz-question-card">
        <div className="quiz-question-top">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>{Object.keys(answers).length + (selectedAnswer && !alreadyAnswered ? 1 : 0)} answered</span>
        </div>

        <div className="quiz-progress-track">
          <div
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        <h2>{getQuestionText(currentQuestion)}</h2>

        <div className="quiz-options">
          {options.map((option, index) => {
            const optionSelected = selectedAnswer === option.key;

            return (
              <button
                key={option.key}
                type="button"
                className={`quiz-option ${optionSelected ? "selected" : ""}`}
                onClick={() => chooseAnswer(option.key)}
              >
                <span className="quiz-option-letter">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option.text}</span>
                {optionSelected && <CheckCircle2 size={19} />}
              </button>
            );
          })}
        </div>

        {error && <p className="quiz-error" role="alert">{error}</p>}

        <div className="quiz-question-footer">
          <button
            type="button"
            className="quiz-secondary-button"
            onClick={() => {
              setSelectedAnswer("");
              setCurrentIndex((previous) => Math.max(0, previous - 1));
            }}
            disabled={currentIndex === 0 || submitting}
          >
            Previous
          </button>

          {currentIndex < questions.length - 1 ? (
            <button
              className="quiz-primary-button"
              type="button"
              onClick={saveAnswer}
              disabled={!selectedAnswer || submitting}
            >
              Save & Next <ChevronRight size={17} />
            </button>
          ) : (
            <button
              className="quiz-primary-button"
              type="button"
              onClick={submitQuiz}
              disabled={(!selectedAnswer && !alreadyAnswered) || submitting}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
              <CheckCircle2 size={17} />
            </button>
          )}
        </div>

        <p className="quiz-note">
          Your answers are evaluated securely by the backend when you submit.
        </p>
      </div>
    </section>
  );
}

export default QuizPractice;
