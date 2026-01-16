# 📚 Study Tracker

A full-stack **Study Tracker** web application that helps students manage tasks, track progress, and analyze study activity — built with a secure backend and a lightweight frontend.

---

## 🚀 Live Demo

- **Frontend (Netlify):**  
  👉 https://marvelous-mermaid-d54410.netlify.app

- **Backend API (Render):**  
  👉 https://study-tracker-54r6.onrender.com  
  👉 Health Check: `/health`

> ⚠️ Note: Backend is hosted on Render Free tier, so the first request may take ~30–50 seconds if the server is idle.

---

## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript
- Chart.js (for statistics & visualization)

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- JWT Authentication
- bcrypt (password hashing)

### Security & Performance
- CORS (custom allowlist)

### Deployment
- **Frontend:** Netlify
- **Backend:** Render
- **Database:** MongoDB Atlas
- **Version Control:** Git & GitHub

---

## ✨ Features

- 🔐 User Authentication (Login / Signup)
- 📝 Task Management (Create, Update, Delete)
- 📊 Study Statistics & Charts
- 👤 User Profile & Settings
- ⚡ Secure REST API
- 🌐 Fully deployed (Frontend + Backend)

---

## 📂 Project Structure

Study-Tracker/
│
├── backend/
│ ├── config/
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── server.js
│ └── package.json
│
├── frontend/
│ ├── index.html
│ ├── login.html
│ ├── signup.html
│ ├── js/
│ ├── style.css
│ └── package.json
│
└── .gitignore

---

## 🔐 Environment Variables (Backend)

The backend uses environment variables for security:

PORT
MONGO_URI
JWT_SECRET
CORS_ORIGINS
TRUST_PROXY
NODE_ENV

These are configured directly in **Render → Environment Settings**.

---

## 🧠 What I Learned

- Full-stack deployment workflow
- Handling CORS between Netlify & Render
- Secure authentication using JWT
- Production environment configuration
- Real-world debugging & cold-start behavior

---

## 👨‍💻 Author

**Prince (Prince-Gulia)**  
BCA Student | Aspiring Data Scientist | Full-Stack Developer

GitHub: https://github.com/Prince-Gulia

---

⭐ If you like this project, consider giving it a star!
