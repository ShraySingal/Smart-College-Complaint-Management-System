# Product Requirements Document (PRD) - v4.2 (Production Ready)
## College Smart Complaint System

### 1. Product Overview
The **NovaTech College Smart Complaint System** is an enterprise-grade solution for managing institutional grievances. It prioritizes accountability via media evidence (for both reporting and resolution), real-time feedback loops via WebSockets, and automated maintenance via scheduled background tasks and self-healing watchdogs.

---

### 2. User Roles & Capabilities
*   **Student**: Raise complaints with real-time photo/video evidence. View resolution evidence and provide feedback. Reopen if unsatisfied. Manage account lifecycle (Delete Account & Data).
*   **Teacher/Faculty**: Report departmental issues and manage personal assigned maintenance tasks, providing proof of resolution (Images/Videos).
*   **Admin**: Master control for assignment, user account management, bulk resolution, system health monitoring, and SLA oversight.
*   **Master Accounts**: Pre-configured Master Admin, Master Faculty, and Master Student accounts for immediate testing and deployment.

---

### 3. Core Enterprise Features (v4.2)

#### 3.1. Intelligence & Logic
- **AI-Powered Tagging**: Dictionary-based keyword engine to auto-suggest categories (Electricity, Water, etc.) for students.
- **SLA Management**: Automatic calculation of resolution deadlines (High: 24h, Med: 48h, Low: 72h) with dynamic "OVERDUE" status.
- **Self-Healing Architecture**: Backend/Frontend watchdogs detect database/Redis connection drops and trigger auto-reconnection.

#### 3.2. Communication & UI
- **Real-time Engine**: Socket.io for instant notifications, admin alerts, and internal discussion rooms.
- **Automated Email Workflows**: 
  - Welcome emails containing login credentials and timestamps.
  - Acknowledgment emails for students and Alert emails for admins upon complaint submission.
  - Resolution emails containing proof of resolution (attachment links) and timestamps.
- **Internal Messaging**: Dedicated chat rooms for every complaint to facilitate direct communication between staff and students.
- **Premium UI**: Glassmorphism design system matching across all auth pages (Login, Forgot Password). Persistent Dark/Light mode, responsive navigation, and direct 1-click Account Deletion icon in the header.
- **Streamlined Onboarding**: Simplified registration flow capturing only essential credentials and role-specific data (e.g., Academic Year).

#### 3.3. Infrastructure & Automation
- **Integrated Cloud**: Live Cloudinary (Media), Twilio (SMS), and SMTP (Email) for professional communication. Cloud Redis for scalable token management.
- **Data Privacy & Control**: Users can permanently delete their accounts, triggering a complete purge of their data, complaints, feedback, and messages.
- **Local Fallback**: System automatically switches to local DiskStorage if cloud keys are missing, ensuring 100% uptime.
- **Automated Maintenance**: Nightly database backups (Local/S3) and hourly SLA checks via `node-cron`.

---

### 4. Technical Requirements

#### 4.1. Stack
- **Backend**: Node.js, Express, Socket.io, Winston.
- **Database**: PostgreSQL (Sequelize ORM).
- **Cache**: Cloud Redis (JWT Blacklisting & Performance).
- **Frontend**: Vanilla JS, HTML5, CSS3 (Outfit Font).

#### 4.2. Security
- **JWT Revocation**: Immediate token blacklisting in Redis upon logout.
- **Rate Limiting**: Protection against brute-forcing and anti-spam controls.
- **User Management**: Admin ability to Activate/Deactivate users instantly.

---

### 5. Success Metrics
- **Performance**: < 100ms for analytics stats; < 500ms for media-heavy complaint loads.
- **Transparency**: Live System Logs accessible to Admins for auditing.
- **Scalability**: Paginated datasets (10 items/page) to handle thousands of records.