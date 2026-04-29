# 🚀 NovaTech: College Smart Complaint System v4.2

A high-performance, real-time enterprise solution for educational institutions. Built with a premium Glassmorphism UI, AI-powered logic, and a fully integrated cloud architecture.

---

## 🌟 Major Integrations (Live)
*   ☁️ **Cloudinary**: Real-time cloud storage for high-definition evidence (Images/Videos) during reporting and resolution.
*   📱 **Twilio SMS**: Instant mobile alerts for critical resolutions.
*   📧 **Nodemailer (SMTP)**: Official automated email correspondence via Gmail, including welcome credentials and resolution proof.
*   🛡️ **Cloud Redis**: Real-time JWT blacklisting and high-performance server-side session management.
*   🤖 **AI Suggestion Engine**: Automated category tagging for incoming complaints.

## 🚀 Key Features

### **Security & Data Privacy**
*   🛡️ **Enterprise Security**: JWT authentication with Redis-backed blacklisting.
*   🚦 **Self-Healing Watchdog**: Frontend & Backend watchdogs monitor DB/Redis health and auto-recover.
*   🗑️ **Data Purge**: Users can permanently delete their accounts and completely wipe all associated data (Complaints, Messages, Feedback) from the system.
*   ⚡ **Smart Dashboard**: High-performance paging (10 items/page) and 60s analytics caching.
*   📝 **System Logs**: Live admin log viewer to monitor traffic and security events in real-time.

### **Advanced Functionality**
*   👥 **User Management**: Admin control over all user roles (Student, Teacher, Staff, Admin) and account status (Active/Inactive). Master accounts provided out-of-the-box.
*   🛠️ **Resolution Evidence**: Faculty and Admins can upload Images or Videos as direct proof of task resolution.
*   📸 **Dual Media Capture**: Browser-based camera capture + traditional device uploads with **Local Fallback** support.
*   ⏳ **SLA Monitoring**: Priority-based deadlines (24h/48h/72h) with dynamic overdue countdowns.
*   🗺️ **Campus Map**: Interactive Leaflet.js integration for pinpointing complaint locations.
*   💬 **Internal Chat**: Real-time discussion rooms for every complaint to facilitate resolution.
*   📊 **Analytics Hub**: Live stats grid for Admins (Total, Pending, Resolved, Overdue).
*   🔄 **Streamlined Onboarding**: Fully automated, fast account creation with role-based validation and zero bloat fields.

---

## 📂 Project Structure

```text
/College Smart Complaint System
├── /Frontend
│   ├── /css/style.css        # Premium Glassmorphism UI & Theme Engine
│   ├── /js/auth.js           # Registration & Auth Logic
│   ├── /js/dashboard.js      # Core Logic (Maps, Chat, Camera, Stats)
│   ├── student.html          # Student Hub
│   ├── teacher.html          # Faculty/Staff Resolution Portal
│   ├── admin.html            # Master Control & Analytics Dashboard
│   └── register.html         # New User Onboarding
├── /backend
│   ├── /backups              # Local & S3 backup storage
│   ├── /config               # Cloudinary, Redis, Mailer, Cron
│   ├── /controllers          # Business Logic (AI, Auth, Complaints, Messages)
│   ├── /logs                 # Winston combined.log & app.log
│   ├── /middlewares          # Security, RateLimits, Watchdogs
│   ├── /models               # PostgreSQL (Sequelize) Schemas
│   └── server.js             # Express + Socket.io Integrated Server
```

---

## 🛠️ Quick Start

1.  **Environment Setup**: Fill the `.env` file in `/backend` with your keys (Cloudinary, Twilio, SMTP).
2.  **Install**: `cd backend && npm install`
3.  **Run**: `npm run dev`
4.  **Access**: `http://localhost:5000/login.html`

---
**NovaTech v4.2** | *Engineered for Excellence*
