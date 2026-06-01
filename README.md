# IAUMentor — Peer Mentorship Platform 🎓

A full-stack web application that connects students at Imam Abdulrahman Bin Faisal University (IAU) with peer mentors to support academic growth, skill development, and campus life.

---

## 🌟 Features

- **Authentication** — Secure signup/login with JWT tokens and bcrypt password hashing
- **Mentor Matching** — Browse and connect with peer mentors based on major and interests
- **Mentorship Sessions** — Schedule, manage, and track one-on-one sessions
- **Progress Tracking** — Visualize mentorship progress and goals over time
- **Forums** — Community discussion boards for students and mentors
- **Events** — Browse and register for academic and social campus events
- **Resources** — Share and access study materials and helpful links
- **Messaging** — Real-time direct messaging between mentors and mentees
- **Admin Dashboard** — Platform management and user oversight

---

## 🛠️ Tech Stack

**Frontend**
- HTML5, CSS3, JavaScript (Vanilla)

**Backend**
- Node.js + Express.js
- RESTful API architecture
- JWT Authentication
- Multer (file uploads)

**Database**
- MySQL (via mysql2)

**Dev Tools**
- Nodemon
- dotenv
- express-validator
- bcrypt

---

## 📁 Project Structure

```
IAUMentor_Platform/
├── public/
│   ├── css/              # Stylesheets
│   ├── js/               # Client-side JavaScript
│   ├── index.html        # Landing page
│   ├── dashboard.html    # Student dashboard
│   ├── mentor-profile.html
│   ├── messages.html
│   ├── forums.html
│   ├── events.html
│   ├── resources.html
│   ├── progress.html
│   ├── login.html
│   ├── signup.html
│   └── admin.html
├── server/
│   ├── config/           # Database configuration
│   ├── controllers/      # Route logic
│   ├── middleware/       # Auth & validation middleware
│   └── routes/           # API endpoints
├── package.json
└── .gitignore
```

---

## ⚙️ Getting Started

### Prerequisites
- Node.js v16+
- MySQL

### Installation

```bash
# Clone the repository
git clone https://github.com/Reema213/IAUMentor_Platform.git
cd IAUMentor_Platform

# Install dependencies
npm install

# Create a .env file and add your config
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=iaumentor
JWT_SECRET=your_jwt_secret
PORT=3000
```

### Run the App

```bash
# Development
npm run dev

# Production
npm start
```

Open your browser at `http://localhost:3000`

---

## 👩‍💻 Team

| Name | Responsibilities |
|------|-----------------|
| Reema AlMulla | System interfaces, backend integration, UML diagrams, debugging |
| Reema Aljaber | Backend functions (login, registration, user management), database & API, debugging |
| Lena Alqahtani | Database & backend API connection, debugging |
| Wadha AlBaker | Technical documentation (SPPM, SRS, SDD, STS), user & admin manuals, final report |
| Refah Aldossari | System interfaces (homepage, login, dashboard, profile) |
| Reham Khaled | QA & test cases, full system testing |


---

## 📚 Course

Developed as a semester project for a Software Engineering course at **Imam Abdulrahman Bin Faisal University (IAU)**, 2025.

---

## 📄 License

This project is for educational purposes.
