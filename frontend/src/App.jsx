
import { useEffect, useState } from "react";

import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Brain,
  Target,
  ClipboardList,
  Trophy,
  BarChart3,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  UserCircle,
  User,
  Mail,
  Timer,
  TrendingUp,
} from "lucide-react";

import Auth from "./Auth";
import api from "./api";

import StudyTasks from "./StudyTasks";
import SyllabusTracker from "./SyllabusTracker";
import SmartSchedule from "./SmartSchedule";
import ExamCountdown from "./ExamCountdown";
import QuizPractice from "./QuizPractice";
import MLPerformance from "./MLPerformance";
import Gamification from "./Gamification";
import FocusTimer from "./FocusTimer";
import StudyAnalytics from "./StudyAnalytics";
import DashboardProgress from "./DashboardProgress";

import "./App.css";

const navigationItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "tasks", label: "Study Tasks", icon: ClipboardList },
  { id: "syllabus", label: "Syllabus Tracker", icon: BookOpen },
  { id: "schedule", label: "Smart Schedule", icon: CalendarDays },
  { id: "exams", label: "Exam Countdown", icon: Clock },
  { id: "quiz", label: "Quiz Practice", icon: Brain },
  { id: "performance", label: "AI Performance", icon: BarChart3 },
  { id: "analytics", label: "Study Analytics", icon: TrendingUp },
  { id: "timer", label: "Focus Timer", icon: Timer },
  { id: "gamification", label: "Achievements", icon: Trophy },
  { id: "profile", label: "My Profile", icon: UserCircle },
];

const dashboardCards = [
  {
    id: "tasks",
    title: "Study Tasks",
    description: "Organize your daily study goals and track completed tasks.",
    icon: ClipboardList,
    color: "mint-icon",
  },
  {
    id: "syllabus",
    title: "Syllabus Tracker",
    description: "Track your syllabus completion and stay on schedule.",
    icon: BookOpen,
    color: "lavender-icon",
  },
  {
    id: "schedule",
    title: "Smart Schedule",
    description: "Generate a balanced study timetable for your subjects.",
    icon: CalendarDays,
    color: "yellow-icon",
  },
  {
    id: "exams",
    title: "Exam Countdown",
    description: "Keep track of your upcoming examinations.",
    icon: Clock,
    color: "blue-icon",
  },
  {
    id: "quiz",
    title: "Quiz Practice",
    description: "Test your knowledge with practice quizzes.",
    icon: Brain,
    color: "lavender-icon",
  },
  {
    id: "performance",
    title: "AI Performance",
    description: "Predict and understand your academic performance.",
    icon: BarChart3,
    color: "mint-icon",
  },
  {
    id: "analytics",
    title: "Study Analytics",
    description: "Understand your learning habits and study progress.",
    icon: TrendingUp,
    color: "blue-icon",
  },
  {
    id: "timer",
    title: "Focus Timer",
    description: "Improve concentration with focused study sessions.",
    icon: Timer,
    color: "yellow-icon",
  },
  {
    id: "gamification",
    title: "Achievements",
    description: "Build consistency and celebrate your study milestones.",
    icon: Trophy,
    color: "lavender-icon",
  },
];

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("prepwise-theme") || "light"
  );

  // Apply and save the selected theme.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("prepwise-theme", theme);
  }, [theme]);

  // Verify the existing login session.
  useEffect(() => {
    const verifyUser = async () => {
      const token = localStorage.getItem("prepwise-token");

      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        const response = await api.get("/api/auth/me");
        setUser(response.data);
      } catch (error) {
        console.error("Session verification failed:", error);
        localStorage.removeItem("prepwise-token");
        setUser(null);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyUser();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setActivePage("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("prepwise-token");
    setUser(null);
    setActivePage("dashboard");
    setSidebarOpen(false);
  };

  const toggleTheme = () => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  };

  const openPage = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  // Loading screen while checking authentication.
  if (checkingAuth) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <GraduationCap size={35} />
        </div>
        <p>Preparing your study space...</p>
      </div>
    );
  }

  // Show login/register when the user is not authenticated.
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const activeItem = navigationItems.find(
    (item) => item.id === activePage
  );

  const pageTitle = activeItem?.label || "Dashboard";

  const displayName = user.name || "Student";
  const displayEmail = user.email || "Email not available";

  // Render the selected module.
  const renderActiveModule = () => {
    switch (activePage) {
      case "tasks":
        return <StudyTasks />;

      case "syllabus":
        return <SyllabusTracker />;

      case "schedule":
        return <SmartSchedule />;

      case "exams":
        return <ExamCountdown />;

      case "quiz":
        return <QuizPractice />;

      case "performance":
        return <MLPerformance />;

      case "analytics":
        return <StudyAnalytics />;

      case "timer":
        return <FocusTimer />;

      case "gamification":
        return <Gamification />;

      default:
        return null;
    }
  };

  return (
    <div className="prepwise-app">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`prepwise-sidebar ${
          sidebarOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-brand">
          <div className="brand-icon">
            <GraduationCap size={28} />
          </div>

          <div className="sidebar-brand-text">
            <h2>PrepWise</h2>
            <span>Study Smart. Achieve More.</span>
          </div>

          <button
            type="button"
            className="sidebar-close-button"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <p className="sidebar-label">MAIN MENU</p>

        <nav className="sidebar-navigation">
          {navigationItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                type="button"
                className={`navigation-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => openPage(item.id)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-tip">
            <Sparkles size={22} />
            <strong>Keep Going!</strong>
            <p>
              Small progress every day leads to big achievements.
            </p>
          </div>

          <button
            type="button"
            className="sidebar-theme-button"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon size={19} />
            ) : (
              <Sun size={19} />
            )}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </button>

          <button
            type="button"
            className="sidebar-theme-button"
            onClick={handleLogout}
          >
            <LogOut size={19} />
            Logout
          </button>

          <div className="sidebar-version">
            PREPWISE • VERSION 2.0
          </div>
        </div>
      </aside>

      {/* Main application */}
      <div className="prepwise-main">

        {/* Mobile header */}
        <header className="mobile-header">
          <button
            type="button"
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>

          <div className="mobile-brand">
            <div className="brand-icon">
              <GraduationCap size={22} />
            </div>
            <strong>PrepWise</strong>
          </div>

          <button
            type="button"
            className="theme-button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === "light" ? (
              <Moon size={19} />
            ) : (
              <Sun size={19} />
            )}
          </button>
        </header>

        {/* Desktop topbar */}
        <header className="desktop-topbar">
          <div>
            <span>YOUR PERSONAL STUDY SPACE</span>
            <h2>{pageTitle}</h2>
          </div>

          <div className="topbar-actions">
            <div className="topbar-message">
              <Sparkles size={16} />
              KEEP LEARNING
            </div>

            <button
              type="button"
              className="theme-button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>

            <button
              type="button"
              className="profile-topbar-button"
              onClick={() => openPage("profile")}
              title="Open profile"
            >
              <UserCircle size={20} />
              <span>{displayName}</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">

          {/* Dashboard */}
          {activePage === "dashboard" && (
            <div className="dashboard-page">

              <section className="welcome-section">
                <div className="welcome-content">
                  <span className="dashboard-eyebrow">
                    <Sparkles size={15} />
                    YOUR LEARNING JOURNEY
                  </span>

                  <h1>
                    Hello, <span>{displayName}!</span>
                  </h1>

                  <p>
                    Ready to make today productive? Organize your
                    studies, track your progress, and achieve your
                    goals with PrepWise.
                  </p>

                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => openPage("tasks")}
                  >
                    Start Studying
                    <ArrowRight size={17} />
                  </button>
                </div>

                <div className="welcome-illustration">
                  <GraduationCap size={85} />
                </div>
              </section>

              {/* Existing dashboard progress component */}
              <DashboardProgress />

              <section className="dashboard-section feature-section">
                <div className="section-heading">
                  <span className="dashboard-eyebrow">
                    YOUR TOOLS
                  </span>

                  <h2>
                    Everything you need to study smarter
                  </h2>

                  <p>
                    Choose a module to continue your learning journey.
                  </p>
                </div>

                <div className="dashboard-cards">
                  {dashboardCards.map((card) => {
                    const Icon = card.icon;

                    return (
                      <button
                        type="button"
                        className="dashboard-card"
                        key={card.id}
                        onClick={() => openPage(card.id)}
                      >
                        <div
                          className={`dashboard-card-icon ${card.color}`}
                        >
                          <Icon size={24} />
                        </div>

                        <h3>{card.title}</h3>

                        <p>{card.description}</p>

                        <span>
                          Open module
                          <ArrowRight size={15} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <footer className="dashboard-footer">
                <Target size={19} />
                <span>
                  Stay consistent. Every focused study session counts!
                </span>
              </footer>
            </div>
          )}

          {/* Profile */}
          {activePage === "profile" && (
            <div className="dashboard-page">
              <section className="dashboard-section profile-page">

                <div className="profile-heading">
                  <div className="profile-avatar">
                    <User size={42} />
                  </div>

                  <div>
                    <span className="dashboard-eyebrow">
                      YOUR ACCOUNT
                    </span>

                    <h2>My Profile</h2>

                    <p>
                      View your PrepWise account information.
                    </p>
                  </div>
                </div>

                <div className="profile-details">
                  <div className="profile-detail-card">
                    <User size={21} />

                    <div>
                      <span>Full Name</span>
                      <strong>{displayName}</strong>
                    </div>
                  </div>

                  <div className="profile-detail-card">
                    <Mail size={21} />

                    <div>
                      <span>Email Address</span>
                      <strong>{displayEmail}</strong>
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => openPage("dashboard")}
                  >
                    <ArrowRight size={17} />
                    Back to Dashboard
                  </button>

                  <button
                    type="button"
                    className="profile-logout-button"
                    onClick={handleLogout}
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* All connected modules */}
          {activePage !== "dashboard" &&
            activePage !== "profile" && (
              renderActiveModule()
            )}

        </main>
      </div>
    </div>
  );
}

export default App;
