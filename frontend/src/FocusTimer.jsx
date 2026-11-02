import { useEffect, useState } from "react";
import "./FocusTimer.css";

const FOCUS_TIME = 25 * 60;
const BREAK_TIME = 5 * 60;

function FocusTimer() {
  const [mode, setMode] = useState("focus");
  const [remaining, setRemaining] = useState(FOCUS_TIME);
  const [running, setRunning] = useState(false);

  const [sessions, setSessions] = useState(
    () => Number(localStorage.getItem("prepwise-focus-sessions")) || 0
  );

  const totalSeconds = mode === "focus" ? FOCUS_TIME : BREAK_TIME;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  const progress =
    ((totalSeconds - remaining) / totalSeconds) * 100;

  useEffect(() => {
    if (!running) return;

    const timer = setInterval(() => {
      setRemaining((previous) => Math.max(0, previous - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (remaining !== 0 || !running) return;

    setRunning(false);

    if (mode === "focus") {
      setSessions((previous) => {
        const updated = previous + 1;
        localStorage.setItem("prepwise-focus-sessions", updated);
        return updated;
      });

      alert("Focus session completed! Time for a break 🎉");
    } else {
      alert("Break completed! Ready to focus again? 💪");
    }
  }, [remaining, running, mode]);

  function changeMode(newMode) {
    setRunning(false);
    setMode(newMode);
    setRemaining(newMode === "focus" ? FOCUS_TIME : BREAK_TIME);
  }

  function resetTimer() {
    setRunning(false);
    setRemaining(mode === "focus" ? FOCUS_TIME : BREAK_TIME);
  }

  return (
    <section className="focus-page">
      <div className="focus-heading">
        <span>STAY FOCUSED • ACHIEVE MORE</span>
        <h1>Focus Timer ⏱️</h1>
        <p>Small focused sessions create big achievements.</p>
      </div>

      <div className="focus-card">
        <div className="focus-tabs">
          <button
            type="button"
            className={mode === "focus" ? "selected" : ""}
            onClick={() => changeMode("focus")}
          >
            🎯 Focus
          </button>

          <button
            type="button"
            className={mode === "break" ? "selected" : ""}
            onClick={() => changeMode("break")}
          >
            ☕ Short Break
          </button>
        </div>

        <div
          className="timer-circle"
          style={{
            background: `conic-gradient(#8f7bd5 ${progress}%, #eeeaf5 ${progress}%)`,
          }}
        >
          <div className="timer-inner">
            <span className="timer-mode">
              {mode === "focus" ? "FOCUS TIME" : "BREAK TIME"}
            </span>

            <h2>
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </h2>

            <span className="timer-caption">
              {running ? "Keep going!" : "Ready when you are"}
            </span>
          </div>
        </div>

        <div className="timer-controls">
          <button
            type="button"
            className="start-button"
            onClick={() => {
              if (remaining === 0) {
                setRemaining(totalSeconds);
              }
              setRunning((previous) => !previous);
            }}
          >
            {running ? "⏸ Pause" : "▶ Start"}
          </button>

          <button
            type="button"
            className="reset-button"
            onClick={resetTimer}
          >
            ↻ Reset
          </button>
        </div>

        <p className="focus-tip">
          {mode === "focus"
            ? "Put away distractions and concentrate on one task."
            : "Relax, stretch, drink water and refresh your mind."}
        </p>
      </div>

      <div className="focus-session-card">
        <div className="session-icon">🏆</div>

        <div>
          <span>COMPLETED FOCUS SESSIONS</span>
          <h2>{sessions}</h2>
          <p>Every session brings you closer to your goals!</p>
        </div>
      </div>
    </section>
  );
}

export default FocusTimer;