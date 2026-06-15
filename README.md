# 🚀 NovaTech: College Smart Complaint System v5.0 — Research Edition

> **100% Free & Open Source** — Zero paid dependencies. Self-hosted. Research-grade AI pipeline.

A research-grade, AI-powered grievance management system for educational institutions. Features NLP-driven sentiment analysis, duplicate detection, automated escalation, campus heat mapping, and a complete knowledge base — all running on free, offline AI libraries.

---

## 🧠 Research Novelty (vs. Existing Academic Literature)

| Gap in Existing Papers | Our Solution |
|---|---|
| Paid AI APIs (OpenAI, Gemini) | Zero-cost NLP via `natural` library (AFINN + TF-IDF) |
| No duplicate detection | TF-IDF Cosine Similarity on submission |
| No sentiment analysis | AFINN-based sentiment scoring with urgency keywords |
| Manual priority only | Multi-factor priority prediction (5 factors) |
| No escalation workflow | Time-based auto-escalation (3 levels) |
| No anonymity | Anonymous complaint mode |
| No QR integration | QR-code pre-filled complaint submission |
| No knowledge base | Auto-generated FAQ from resolved complaints |
| No performance scoring | Department performance ranking algorithm |
| Cloud-dependent (Cloudinary, Twilio, AWS) | 100% self-hosted, zero paid services |
| No complaint lifecycle tracking | Full timeline visualization |
| Static analytics only | Trend prediction + AI recommendations |

---

## 🌟 Technology Stack (100% Free)

| Layer | Technology | Cost |
|---|---|---|
| 📧 Email | Nodemailer (Gmail SMTP) | Free |
| 🧠 AI/NLP | `natural`, `string-similarity` | Free |
| 📦 Storage | Local DiskStorage (Multer) | Free |
| ⚡ Cache | Local Redis | Free |
| 🗄️ Database | PostgreSQL (Sequelize ORM) | Free |
| 📡 Real-time | Socket.io | Free |
| 📱 QR Codes | `qrcode` library | Free |
| 🗺️ Maps | Leaflet.js + OpenStreetMap | Free |
| 🎨 Frontend | Vanilla JS, HTML5, CSS3, WebRTC | Free |

---

## 🚀 Features (40+)

### AI Features (All Offline — Zero API Cost)
- 🤖 **AI Category Suggestion** — Keyword-based auto-categorization
- 🧠 **AI Sentiment Analysis** — AFINN lexicon sentiment scoring with urgency detection
- 🔁 **AI Duplicate Detection** — TF-IDF cosine similarity check before submission
- ⚡ **AI Priority Prediction** — Multi-factor scoring (category + sentiment + keywords + length + magnitude)
- 📝 **AI Summarization** — Extractive summarization via TF-IDF sentence ranking
- 🔍 **AI Similarity Search** — Find related complaints for any given complaint
- 💡 **AI Smart Recommendations** — Preventive maintenance suggestions from complaint patterns
- ✍️ **AI Description Enhancement** — Template-based expansion for clarity

### Workflow & Automation
- ⏳ **SLA Monitoring** — Priority-based deadlines (24h/48h/72h) with overdue tracking
- 🔺 **Auto-Escalation** — 3-level escalation (L0 → L1 at 24h → L2 at 48h overdue)
- 🔔 **In-App Notification Center** — Real-time bell with unread badges
- 📧 **Automated Email** — Welcome, acknowledgment, resolution, and admin alert emails
- 🔄 **Complaint Reopening** — Students can reopen unsatisfactory resolutions
- 📋 **Complaint Timeline** — Full lifecycle tracking (Created → Resolved → Reopened)

### Analytics & Governance
- 📊 **Department Performance Rankings** — Composite scoring algorithm with visual score bars
- 🏢 **Hostel Room Complaint Tracker** — Color-coded density grid
- 📈 **Trend Prediction** — Weekly complaint volume analysis per category (90 days)
- 🌐 **Heatmap Data** — Location × Room complaint aggregation
- 📖 **Knowledge Base** — Searchable resolved complaints + auto-generated FAQ
- 🔢 **QR Code Generator** — Location-specific QR codes for quick complaint submission

### Security & Privacy
- 🛡️ **JWT Authentication** with Redis-backed blacklisting
- 👤 **Anonymous Complaint Mode** — Identity masked from all staff
- 🗑️ **Account Deletion** — Full data purge (GDPR-like compliance)
- 🚦 **Self-Healing Watchdog** — Auto-recovery for DB/Redis connections
- 🔒 **Rate Limiting** — DDoS protection on all sensitive endpoints

### UI/UX
- 📸 **Dual Media Capture** — Camera + file upload for photos and videos
- 🎥 **Live Video Recording** — WebRTC + MediaRecorder API
- 🌙 **Dark/Light Theme** — Persistent toggle
- 🌍 **Multi-Language** — English + Hindi (i18n)
- 🗺️ **Campus Map** — Leaflet.js integration with OpenStreetMap
- 💬 **Internal Chat** — Real-time Socket.io complaint discussion rooms
- ⭐ **Feedback & Rating** — Post-resolution star ratings
- 💀 **Skeleton Loaders** — Perceived performance during data fetching

---

## 📂 Project Structure

```text
College Smart Complaint System/
├── Frontend/
│   ├── css/
│   │   └── style.css             # Glassmorphism UI + v5.0 components (1270+ lines)
│   ├── js/
│   │   ├── auth.js               # Login, register, forgot password logic
│   │   └── dashboard.js          # Core logic: AI, notifications, timeline, analytics (2050+ lines)
│   ├── admin.html                # Admin dashboard (8 tabs incl. AI Insights, Rankings, QR)
│   ├── student.html              # Student hub (anonymous mode, duplicate warning)
│   ├── teacher.html              # Faculty resolution portal
│   ├── login.html                # Auth page
│   ├── register.html             # Onboarding
│   ├── forgot-password.html      # Password recovery
│   └── index.html                # Redirect
│
├── backend/
│   ├── config/
│   │   ├── cron.js               # SLA checker + auto-escalation (hourly)
│   │   ├── db.js                 # PostgreSQL connection (Sequelize)
│   │   ├── logger.js             # Winston logging
│   │   ├── mailer.js             # Nodemailer SMTP (Gmail)
│   │   ├── redis.js              # Local Redis connection
│   │   └── upload.js             # Multer DiskStorage (photos + videos, 50MB limit)
│   ├── controllers/
│   │   ├── authController.js     # JWT auth, profile, account deletion
│   │   ├── complaintController.js # Core + AI + Analytics (30+ handlers)
│   │   ├── feedbackController.js # Post-resolution feedback
│   │   ├── messageController.js  # Chat messages
│   │   └── notificationController.js # In-app notification center
│   ├── middlewares/
│   │   ├── authMiddleware.js     # JWT verification + role guards
│   │   ├── rateLimiter.js        # Express rate limiting
│   │   └── validator.js          # Express-validator wrapper
│   ├── models/
│   │   ├── Complaint.js          # 20+ columns incl. AI metrics
│   │   ├── ComplaintTimeline.js  # Lifecycle audit trail
│   │   ├── Feedback.js           # Student ratings
│   │   ├── Message.js            # Chat messages
│   │   ├── Notification.js       # In-app alerts
│   │   ├── User.js               # Roles, departments, profiles
│   │   └── index.js              # Model associations
│   ├── routes/
│   │   ├── authRoutes.js         # 11 auth endpoints
│   │   ├── complaintRoutes.js    # 22 complaint + AI + analytics endpoints
│   │   ├── feedbackRoutes.js     # Feedback submission
│   │   ├── healthRoutes.js       # System health checks
│   │   ├── messageRoutes.js      # Chat API
│   │   └── notificationRoutes.js # Notification CRUD
│   ├── utils/
│   │   ├── aiEngine.js           # 5 AI functions (sentiment, duplicate, priority, summary, similar)
│   │   └── aiTagger.js           # Category keyword matching
│   ├── logs/                     # Winston log files
│   ├── uploads/                  # Local media storage
│   ├── seed.js                   # Master account seeder
│   ├── server.js                 # Express + Socket.io entry point
│   └── .env                      # Environment variables
│
├── PRD.md                        # Product Requirements Document
├── README.md                     # This file
└── TODO.md                       # Development checklist
```

---

## 📊 Database Schema (6 Tables)

| Table | Key Columns |
|---|---|
| **User** | id, name, email, password, role, department, hostel, profilePhoto, phone, status |
| **Complaint** | id, studentId, title, description, category, priority, priorityScore, status, sentimentScore, sentimentLabel, isAnonymous, escalationLevel, escalatedAt, qualityScore, latitude, longitude, attachment, resolutionSummary, resolutionAttachment, location, room, assignedTo, deadline |
| **Feedback** | id, studentId, complaintId, message, rating |
| **Message** | id, complaintId, senderId, content |
| **Notification** | id, userId, title, message, type, isRead, link |
| **ComplaintTimeline** | id, complaintId, action, description, performedBy |

---

## 🔌 API Endpoints (30+)

| Category | Count | Key Endpoints |
|---|---|---|
| Auth | 11 | login, register, logout, forgot-password, change-password, update-profile-photo, delete-account |
| Complaints | 11 | raise, my-complaints, all, assigned, stats, resolve, bulk-resolve, assign, reopen |
| AI | 5 | suggest-category, enhance, check-duplicate, /:id/summarize, /:id/similar |
| Analytics | 5 | department-performance, heatmap, trends, hostel-tracking, recommendations |
| Knowledge Base | 2 | knowledge-base, knowledge-base/faq |
| QR | 1 | qr-generate |
| Notifications | 3 | GET /, PATCH /:id/read, POST /read-all |
| Timeline | 1 | GET /:id/timeline |
| Messages | 2 | GET /:complaintId, POST / |
| Feedback | 1 | POST / |
| Health | 1 | GET /status |

---

## 🛠️ Quick Start

```bash
# 1. Install dependencies
cd backend && npm install

# 2. Configure environment
# Create .env with:
POSTGRES_URI=postgresql://user:pass@localhost:5432/complaints
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
REDIS_URL=redis://localhost:6379

# 3. Seed master accounts
node seed.js

# 4. Run the server
npm run dev

# 5. Access the app
# http://localhost:5000/login.html
```

> **No Cloudinary, No Twilio, No AWS keys needed. Zero cost.**

---

**NovaTech v5.0 Research Edition** | *Engineered for Academic Excellence*
