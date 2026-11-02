# 🎓 PrepWise — AI-Powered Smart Study Planner

<p align="center">
  <strong>Plan Smarter. Study Better. Achieve More.</strong>
</p>

<p align="center">
  A smart academic productivity platform designed to help students organize their learning, track progress, manage study schedules, and improve academic performance.
</p>

---

## ✨ Overview

**PrepWise** is an AI-powered study planning and academic productivity web application built to make student life more organized and productive.

It combines study planning, syllabus tracking, performance prediction, quiz practice, and progress analytics in one platform. Students can manage their academic activities, monitor their learning habits, and make informed decisions about their study routines.

## 🚀 Key Features

- **User Authentication** — Secure user registration and login.
- **Dashboard & Progress Tracking** — Monitor study activities and academic progress.
- **Study Task Management** — Organize and manage daily study tasks.
- **Syllabus Tracker** — Track syllabus topics and completion status.
- **Smart Study Schedule** — Generate personalized study schedules based on available study hours.
- **Exam Countdown** — Keep track of upcoming examinations.
- **AI Quiz Practice** — Generate and attempt practice quizzes.
- **ML Performance Prediction** — Estimate academic performance using Multiple Linear Regression.
- **Study Analytics** — Understand study habits and progress through analytics.
- **Focus Timer** — Improve concentration through focused study sessions.
- **Gamification & Achievements** — Stay motivated through study streaks, XP, and levels.
- **Profile Management** — Manage personal account information.

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, Vite, JavaScript |
| Styling | CSS3 |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| Database | SQLite |
| Machine Learning | Scikit-learn, Multiple Linear Regression |
| AI Integration | Google Gemini API |
| API Communication | Axios |
| Development Tools | VS Code, Git, GitHub |

## 📂 Project Structure

```text
PrepWise/
│
├── backend/
│   ├── auth.py
│   ├── exams.py
│   ├── gamification.py
│   ├── main.py
│   ├── ml_model.py
│   ├── quiz.py
│   ├── smart_schedule.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── Auth.jsx
│   │   ├── DashboardProgress.jsx
│   │   ├── ExamCountdown.jsx
│   │   ├── FocusTimer.jsx
│   │   ├── Gamification.jsx
│   │   ├── MLPerformance.jsx
│   │   ├── QuizPractice.jsx
│   │   ├── SmartSchedule.jsx
│   │   ├── StudyAnalytics.jsx
│   │   ├── StudyTasks.jsx
│   │   ├── SyllabusTracker.jsx
│   │   ├── api.js
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
└── README.md
```

## ⚙️ Installation & Setup

Follow these steps to run PrepWise locally.

### 1. Clone the repository

```bash
git clone https://github.com/yashwini19/PrepWise.git
cd PrepWise
```

### 2. Set up the backend

Open a terminal:

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Configure your environment variables in a `backend/.env` file. Add the variables required by your backend configuration, including your secret key and Gemini API key if using AI quiz generation.

Example:

```env
PREPWISE_SECRET_KEY=your-long-random-secret-key
GEMINI_API_KEY=your-gemini-api-key
```

Never upload real API keys or secret values to GitHub.

Start the backend:

```bash
python -m uvicorn main:app --reload --port 8000
```

Backend URL: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually:

```text
http://localhost:5173
```

## 🤖 Machine Learning

PrepWise includes a performance prediction module based on **Multiple Linear Regression**.

The model considers the following inputs:

- Daily study hours
- Previous academic scores
- Sleep hours
- Number of practice papers
- Extracurricular participation

It generates an estimated performance index to help students understand how their study habits relate to academic performance.

*Note: Predictions are estimates and should not be treated as guaranteed academic results.*

## 🔐 Security & Data Privacy

- Environment variables are excluded from version control.
- Local databases and database backups are excluded from the repository.
- API secrets should be stored locally and never committed.
- Authentication and backend validation are handled by the API.

## 🎯 Project Goals

PrepWise aims to:

- Encourage consistent study habits.
- Simplify academic planning.
- Help students monitor syllabus completion.
- Support exam preparation.
- Provide insights into academic performance.
- Improve productivity through structured learning.

## 🔮 Future Enhancements

- Personalized AI study recommendations.
- Advanced learning analytics and visual reports.
- Email and push notifications.
- Calendar integration.
- More detailed performance insights.
- Cloud deployment and online database support.

## 👩‍💻 Author

**Yashwini Vennu**

GitHub: [@yashwini19](https://github.com/yashwini19)

Project: [PrepWise](https://github.com/yashwini19/PrepWise)

---

## 📜 License

This project is developed for educational and academic purposes. A license can be added to define permissions for reuse and distribution.

---

<p align="center">
  <strong>PrepWise — Your Learning Journey, Organized.</strong>
</p>