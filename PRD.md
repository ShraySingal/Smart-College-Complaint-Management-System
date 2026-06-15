# Product Requirements Document (PRD) — v5.0 (Research Edition)
## NovaTech College Smart Complaint System

### 1. Product Overview
The **NovaTech College Smart Complaint System v5.0** is a research-grade, AI-powered grievance management platform for educational institutions. It is **100% free and open-source** — zero paid dependencies, zero cloud vendor lock-in. The system features an offline NLP pipeline for sentiment analysis, duplicate detection, priority prediction, and extractive summarization — making it academically novel compared to existing IEEE/Scopus-published complaint management systems.

**Removed Paid Dependencies**: Twilio (SMS), Cloudinary (media storage), AWS S3 (backups) — all replaced with free self-hosted alternatives.

---

### 2. User Roles & Capabilities

| Role | Capabilities |
|---|---|
| **Student** | Raise complaints (with anonymous mode), photo/video evidence, duplicate warnings, view AI summaries/timeline/similar, provide feedback, reopen, delete account |
| **Teacher/Faculty** | Raise complaints, resolve with live photo/video proof, in-app notifications |
| **Admin** | All management + AI Insights tab, Department Rankings, Hostel Tracker, QR Generator, user management, bulk resolution, system logs |
| **Master Accounts** | Pre-seeded Admin, Faculty, Student accounts for immediate testing |

---

### 3. Feature Specification

#### 3.1. AI Engine (100% Offline — Zero API Cost)

| Feature | Algorithm | Library | Trigger |
|---|---|---|---|
| Category Suggestion | Dictionary keyword matching | Custom (`aiTagger.js`) | On description input |
| Sentiment Analysis | AFINN lexicon + urgency keywords | `natural` | On complaint creation |
| Priority Prediction | 5-factor weighted scoring | Custom (`aiEngine.js`) | On complaint creation |
| Duplicate Detection | String similarity (>60% threshold) | `string-similarity` | On title blur (pre-submit) |
| Extractive Summarization | TF-IDF sentence ranking (top 2) | `natural` | On-demand in detail modal |
| Similarity Search | Cosine similarity (>30% threshold) | `string-similarity` | On-demand in detail modal |
| Smart Recommendations | Category × Location × Time hotspots | SQL aggregation | Admin AI Insights tab |
| Description Enhancement | Template-based keyword expansion | Custom | On-demand in form |

**Priority Prediction — 5 Scoring Factors:**
1. Category weight (0–30): Electricity=28, Water=25, Hygiene=18, Internet=15, Other=12, Furniture=10
2. Sentiment urgency (0–30): Urgent=30, Negative=20, Neutral=10, Positive=5
3. Keyword urgency boost (0–20): Critical keywords (+20), High keywords (+12)
4. Description length (0–10): >200 chars (+10), >100 (+6), else (+3)
5. Negative sentiment magnitude (0–10): |score| × 10, capped at 10

**Final Priority**: High ≥ 60, Medium ≥ 35, Low < 35

#### 3.2. Workflow & Automation
- **SLA Management**: Auto-calculated deadlines — High: 24h, Medium: 48h, Low: 72h. Dynamic "OVERDUE" badge.
- **Auto-Escalation (3 Levels)**:
  - Level 0: Normal (within SLA)
  - Level 1: >24h overdue → automatic escalation
  - Level 2: >48h overdue → CRITICAL alert to admin
- **In-App Notification Center**: Bell icon with animated unread badge, dropdown panel, mark-all-read. Types: `complaint_update`, `escalation`, `system`, `resolution`.
- **Complaint Timeline**: Full lifecycle — CREATED → IN PROGRESS → RESOLVED → REOPENED. Vertical colored-dot timeline in detail modal.
- **Anonymous Mode**: Toggle switch on form. `isAnonymous=true` masks student identity in admin/faculty views.
- **Complaint Reopening**: Students reopen unsatisfactory resolutions → triggers admin notification + timeline event.

#### 3.3. Analytics & Governance
- **Department Performance Rankings**: Score = (resolution_rate × 0.6) + (speed_score × 0.4). Ranked table with animated score bars.
- **Hostel Room Tracker**: Color-coded density grid — Red (>3 active), Yellow (2–3), Green (≤1).
- **Trend Prediction**: Weekly volume by category over 90 days via `DATE_TRUNC`.
- **Heatmap Data**: Location × Room complaint aggregation for campus visualization.
- **Knowledge Base**: Searchable resolved complaints. Filter by category. Auto-FAQ from top 3 per category.
- **QR Code Generator**: Admin generates location-specific QRs → student scans → form auto-fills location/room.

#### 3.4. Communication & UI
- **Real-time Engine**: Socket.io for instant notifications, alerts, and chat rooms.
- **Automated Email Workflows**: Welcome (credentials), Acknowledgment (student), Alert (admin), Resolution (proof + attachments).
- **Internal Messaging**: Dedicated chat room per complaint.
- **Camera**: Toggle front/rear cameras. WebRTC + MediaRecorder for live video/photo.
- **Premium UI**: Glassmorphism design, Dark/Light mode, Star Ratings, Skeleton Loaders.
- **Multi-Language**: i18n (English + Hindi) without page reloads.
- **Admin Dashboard (8 Tabs)**: Complaints, Users, Analytics, AI Insights, Rankings, Hostel Tracker, QR Codes, System Logs.

#### 3.5. Security & Privacy
- JWT Authentication with Redis-backed token blacklisting on logout.
- Anonymous complaint mode (identity masking).
- Self-healing watchdog — auto-recovery for DB/Redis (30s interval).
- Rate limiting on login and complaint submission.
- Full account deletion with cascade purge (complaints, feedback, messages, notifications).

---

### 4. Technical Architecture

#### 4.1. Stack (100% Free)

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express.js |
| Database | PostgreSQL + Sequelize ORM |
| Cache | Local Redis |
| AI/NLP | `natural` (AFINN/TF-IDF), `string-similarity` |
| Real-time | Socket.io |
| Email | Nodemailer (Gmail SMTP) |
| Media Storage | Local DiskStorage (Multer, 50MB limit) |
| QR | `qrcode` library |
| Maps | Leaflet.js + OpenStreetMap |
| Logging | Winston (combined.log + app.log) |
| Scheduling | node-cron (SLA + escalation) |
| Frontend | Vanilla JS, HTML5, CSS3 (Outfit font), WebRTC, MediaRecorder API |

#### 4.2. Database Schema (6 Tables, 50+ Columns)

**User** — id, name, email, password, role (student/teacher/admin), department, hostel, academicYear, profilePhoto, phone, status (Active/Inactive)

**Complaint** — id, studentId, title, description, category, priority, priorityScore, status, sentimentScore, sentimentLabel, isAnonymous, escalationLevel, escalatedAt, qualityScore, latitude, longitude, attachment, resolutionSummary, resolutionAttachment, location, room, assignedTo, deadline

**Feedback** — id, studentId, complaintId, message, rating (1–5)

**Message** — id, complaintId, senderId, content

**Notification** — id, userId, title, message, type, isRead, link

**ComplaintTimeline** — id, complaintId, action (CREATED/RESOLVED/REOPENED/ESCALATED), description, performedBy

#### 4.3. API Surface (42 Endpoints)

| Group | Endpoints |
|---|---|
| **Auth (11)** | POST login, register, logout, forgot-password, change-password · PATCH update-room, update-profile-photo · DELETE delete-account · GET staff, all-users, status/:id |
| **Complaints (11)** | POST raise, bulk-resolve · GET my-complaints, all, assigned, stats · PUT /:id/resolve · PATCH /:id/assign · POST /:id/reopen |
| **AI (5)** | POST suggest-category, enhance, check-duplicate, /:id/summarize · GET /:id/similar |
| **Analytics (5)** | GET department-performance, heatmap, trends, hostel-tracking, recommendations |
| **Knowledge Base (2)** | GET knowledge-base, knowledge-base/faq |
| **QR (1)** | GET qr-generate |
| **Notifications (3)** | GET / · PATCH /:id/read · POST /read-all |
| **Timeline (1)** | GET /:id/timeline |
| **Messages (2)** | GET /:complaintId · POST / |
| **Feedback (1)** | POST / |
| **Health (1)** | GET /status |

#### 4.4. File Inventory (Post-Cleanup)

```
backend/  (5 files + 9 directories)
├── config/        6 files  (cron, db, logger, mailer, redis, upload)
├── controllers/   5 files  (auth, complaint, feedback, message, notification)
├── middlewares/    3 files  (auth, rateLimiter, validator)
├── models/        7 files  (6 models + index.js associations)
├── routes/        6 files  (auth, complaint, feedback, health, message, notification)
├── utils/         2 files  (aiEngine, aiTagger)
├── seed.js, server.js, .env, package.json, package-lock.json

Frontend/  (7 HTML + 2 directories)
├── css/style.css         1270+ lines
├── js/auth.js + dashboard.js  2050+ lines
├── 7 HTML pages (admin, student, teacher, login, register, forgot-password, index)
```

---

### 5. Research Novelty (vs. Existing Literature)

| # | Gap in Published Papers | NovaTech v5.0 Solution |
|---|---|---|
| 1 | Paid AI APIs (OpenAI/Gemini/Google Cloud NLP) | Zero-cost NLP via `natural` + `string-similarity` |
| 2 | No duplicate detection at submission time | TF-IDF cosine similarity with configurable threshold |
| 3 | No sentiment-aware prioritization | AFINN sentiment + urgency keyword detection |
| 4 | Manual priority assignment | 5-factor multi-signal priority prediction algorithm |
| 5 | No automated escalation | Time-based 3-level auto-escalation via cron |
| 6 | No anonymous reporting | Cryptographic identity masking mode |
| 7 | No physical-digital bridge | QR-code pre-filled complaint submission |
| 8 | No institutional knowledge base | Auto-generated FAQ from resolved complaint corpus |
| 9 | No performance scoring algorithm | Composite department ranking metric |
| 10 | Cloud-vendor lock-in (Cloudinary/Twilio/AWS) | 100% self-hosted, zero paid dependencies |
| 11 | No lifecycle visualization | Full complaint timeline with audit trail |
| 12 | Static analytics only | Trend prediction + AI preventive recommendations |

---

### 6. Success Metrics

| Metric | Target |
|---|---|
| API Response (analytics) | < 100ms |
| API Response (media-heavy) | < 500ms |
| AI Category Accuracy | > 70% |
| Duplicate Detection Precision | > 60% |
| Monthly Operating Cost | $0 (zero paid APIs) |
| Academic Novel Features | 12 (exceeding IEEE-published systems) |
| Total API Endpoints | 42 |
| Database Tables | 6 |
| Frontend Pages | 7 |
| Total Codebase | ~5000 lines |