# NovaTech v5.0 — Development Checklist

## ✅ Phase 1: Infrastructure Overhaul (COMPLETE)
- [x] Remove `twilio` package
- [x] Remove `cloudinary` + `multer-storage-cloudinary` packages
- [x] Remove `aws-sdk` package
- [x] Rewrite `config/upload.js` → local DiskStorage only (50MB, supports .webm)
- [x] Rewrite `config/cron.js` → local backup + SLA + auto-escalation
- [x] Create `models/Notification.js` (userId, title, message, type, isRead, link)
- [x] Create `models/ComplaintTimeline.js` (complaintId, action, description, performedBy)
- [x] Add 9 columns to `models/Complaint.js` (sentiment, priority, escalation, anonymous, GPS)
- [x] Update `models/index.js` with new associations
- [x] Create `controllers/notificationController.js` (3 handlers)
- [x] Create `routes/notificationRoutes.js` (3 endpoints)
- [x] Wire notification routes in `server.js`
- [x] Replace all SMS calls with `createNotification()` in complaintController
- [x] Install `qrcode` + `string-similarity`

## ✅ Phase 2: AI Engine (COMPLETE)
- [x] Create `utils/aiEngine.js` with 5 offline AI functions:
  - [x] `analyzeSentiment()` — AFINN + urgency keywords
  - [x] `checkDuplicate()` — string similarity >60%
  - [x] `predictPriority()` — 5-factor weighted scoring
  - [x] `summarizeText()` — TF-IDF sentence ranking
  - [x] `findSimilar()` — cosine similarity search
- [x] Integrate sentiment + priority into `raiseComplaint()`
- [x] Add `summarizeComplaint` endpoint
- [x] Add `getSimilarComplaints` endpoint
- [x] Add `checkDuplicateComplaint` endpoint
- [x] Add `generateQR` endpoint
- [x] Add `searchKnowledgeBase` + `getAutoFAQ` endpoints
- [x] Add `getDepartmentPerformance` endpoint
- [x] Add `getHeatmapData` endpoint
- [x] Add `getTrends` endpoint
- [x] Add `getHostelTracking` endpoint
- [x] Add `getRecommendations` endpoint
- [x] Rewrite `routes/complaintRoutes.js` (22 endpoints)

## ✅ Phase 3: Frontend UI (COMPLETE)
- [x] Notification bell + panel on `student.html`
- [x] Notification bell + panel on `teacher.html`
- [x] Notification bell + panel on `admin.html`
- [x] Duplicate warning (AI) on complaint form title blur
- [x] Anonymous complaint toggle switch
- [x] `isAnonymous` field in FormData submission
- [x] Timeline visualization in view modal
- [x] AI Summary display in view modal
- [x] Similar Complaints section in view modal
- [x] Hook `loadTimeline`, `loadSimilarComplaints`, `summarizeComplaint` into modal open
- [x] `loadNotifications()` on page init + 30s interval
- [x] QR auto-fill from URL params
- [x] Admin tab: **AI Insights** (Recommendations + Knowledge Base + FAQ)
- [x] Admin tab: **Rankings** (Department Performance table + score bars)
- [x] Admin tab: **Hostel Tracker** (Room density grid)
- [x] Admin tab: **QR Generator** (Location-specific QR codes)
- [x] Updated `switchTab()` for all 8 admin tabs
- [x] 380+ lines of new CSS (notifications, timeline, toggle, scores, hostel cards, analytics)

## ✅ Cleanup (COMPLETE)
- [x] Delete `scratch/test_cloudinary.js`
- [x] Delete `backend/check_all_complaints.js`
- [x] Delete `backend/check_db_status.js`
- [x] Delete `backend/create_test_complaint.js`
- [x] Delete `backend/list_users.js`
- [x] Delete `backend/seed_depts.js`
- [x] Delete `backend/utils/priorityLogic.js` (replaced by `aiEngine.predictPriority`)
- [x] Delete `backend/utils/sms.js` + `smsService.js`
- [x] Delete stale root `node_modules/`
- [x] Remove dead `getPriority` import from complaintController
- [x] Verify zero references to Cloudinary, Twilio, AWS, SMS

## ✅ Documentation (COMPLETE)
- [x] Update `README.md` — v5.0 with project structure, API table, DB schema
- [x] Update `PRD.md` — v5.0 with AI spec, file inventory, research novelty
- [x] Update `TODO.md` — all items checked off
