const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validator');
const { complaintLimiter } = require('../middlewares/rateLimiter');
const upload = require('../config/upload');

const {
    raiseComplaint,
    getMyComplaints,
    getAllComplaints,
    resolveComplaint,
    bulkResolve,
    assignComplaint,
    reopenComplaint,
    getAITag,
    getStats,
    getAssignedComplaints,
    enhanceDescription,
    getTimeline,
    summarizeComplaint,
    getSimilarComplaints,
    checkDuplicateComplaint,
    generateQR,
    searchKnowledgeBase,
    getAutoFAQ,
    getDepartmentPerformance,
    getHeatmapData,
    getTrends,
    getHostelTracking,
    getRecommendations
} = require('../controllers/complaintController');

// Core CRUD
router.post('/raise', authMiddleware, complaintLimiter, upload.single('attachment'), [
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 100 }),
    body('category').isIn(['Electricity', 'Water', 'Internet', 'Furniture', 'Hygiene', 'Other']).withMessage('Invalid category'),
    body('description').notEmpty().withMessage('Description is required')
], validateRequest, raiseComplaint);

router.get('/my-complaints', authMiddleware, getMyComplaints);
router.get('/assigned', authMiddleware, getAssignedComplaints);
router.get('/all', authMiddleware, adminMiddleware, getAllComplaints);
router.get('/stats', authMiddleware, adminMiddleware, getStats);

// AI Features
router.post('/suggest-category', authMiddleware, getAITag);
router.post('/enhance', authMiddleware, enhanceDescription);
router.post('/check-duplicate', authMiddleware, checkDuplicateComplaint);

// QR Code
router.get('/qr-generate', authMiddleware, adminMiddleware, generateQR);

// Knowledge Base
router.get('/knowledge-base', authMiddleware, searchKnowledgeBase);
router.get('/knowledge-base/faq', authMiddleware, getAutoFAQ);

// Analytics (Admin)
router.get('/analytics/department-performance', authMiddleware, adminMiddleware, getDepartmentPerformance);
router.get('/analytics/heatmap', authMiddleware, adminMiddleware, getHeatmapData);
router.get('/analytics/trends', authMiddleware, adminMiddleware, getTrends);
router.get('/analytics/hostel-tracking', authMiddleware, adminMiddleware, getHostelTracking);
router.get('/analytics/recommendations', authMiddleware, adminMiddleware, getRecommendations);

// Complaint-specific
router.put('/:id/resolve', authMiddleware, adminMiddleware, upload.single('attachment'), [
    body('resolutionSummary').notEmpty().withMessage('Resolution summary is required')
], validateRequest, resolveComplaint);

router.post('/bulk-resolve', authMiddleware, adminMiddleware, bulkResolve);
router.patch('/:id/assign', authMiddleware, adminMiddleware, assignComplaint);
router.post('/:id/reopen', authMiddleware, reopenComplaint);
router.get('/:id/timeline', authMiddleware, getTimeline);
router.post('/:id/summarize', authMiddleware, summarizeComplaint);
router.get('/:id/similar', authMiddleware, getSimilarComplaints);

module.exports = router;