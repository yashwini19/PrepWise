
import { useState } from "react";
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  BookOpen,
} from "lucide-react";

import api from "./api";
import "./Auth.css";

function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    if (!isLogin && !name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!isLogin && password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (!isLogin) {
        await api.post("/api/auth/register", {
          name: name.trim(),
          email: email.trim(),
          password,
        });

        setSuccess("Account created successfully! Please log in.");
        setIsLogin(true);
        setPassword("");
        setName("");
        return;
      }

      const response = await api.post("/api/auth/login", {
        email: email.trim(),
        password,
      });

      const token = response.data.access_token || response.data.token;

      if (!token) {
        throw new Error("No access token received from the server.");
      }

      localStorage.setItem("prepwise-token", token);

      const userResponse = await api.get("/api/auth/me");
      onLogin(userResponse.data);
    } catch (err) {
      localStorage.removeItem("prepwise-token");

      const detail = err.response?.data?.detail;

      setError(
        typeof detail === "string"
          ? detail
          : err.message || "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-background-shape auth-shape-one" />
      <div className="auth-background-shape auth-shape-two" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">
            <GraduationCap size={32} />
          </div>
          <h1>PrepWise</h1>
          <p>Study Smart. Level Up. Achieve More.</p>
        </div>

        <div className="auth-heading">
          <span className="auth-eyebrow">
            <Sparkles size={15} />
            YOUR PERSONAL STUDY SPACE
          </span>

          <h2>{isLogin ? "Welcome Back!" : "Create Your Account"}</h2>

          <p>
            {isLogin
              ? "Continue your learning journey with PrepWise."
              : "Start your journey towards smarter learning."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={isLogin ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setIsLogin(true);
              setError("");
              setSuccess("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={!isLogin ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setIsLogin(false);
              setError("");
              setSuccess("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {!isLogin && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full Name</label>
              <div className="auth-input-wrapper">
                <User size={19} />
                <input
                  id="auth-name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail size={19} />
              <input
                id="auth-email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <div className="auth-input-wrapper">
              <Lock size={19} />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={isLogin ? undefined : 8}
                maxLength={72}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>

            {!isLogin && (
              <small>Password must contain at least 8 characters.</small>
            )}
          </div>

          {error && <div className="auth-message error">{error}</div>}
          {success && <div className="auth-message success">{success}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : isLogin
                ? "Login to PrepWise"
                : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          <BookOpen size={17} />
          <span>Plan better. Learn better. Achieve more.</span>
        </div>
      </section>
    </main>
  );
}

export default Auth;
