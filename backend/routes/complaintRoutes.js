const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validator');
const { complaintLimiter } = require('../middlewares/rateLimiter');
const upload = require('../config/upload');

// ✅ Import FIRST before using
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
    enhanceDescription
} = require('../controllers/complaintController');

// Routes
router.post('/raise', authMiddleware, complaintLimiter, upload.single('attachment'), [
    body('title').notEmpty().withMessage('Title is required').isLength({ max: 100 }),
    body('category').isIn(['Electricity', 'Water', 'Internet', 'Furniture', 'Hygiene', 'Other']).withMessage('Invalid category'),
    body('description').notEmpty().withMessage('Description is required')
], validateRequest, raiseComplaint);

router.get('/my-complaints', authMiddleware, getMyComplaints);
router.get('/assigned', authMiddleware, getAssignedComplaints);
router.get('/all', authMiddleware, adminMiddleware, getAllComplaints);
router.get('/stats', authMiddleware, adminMiddleware, getStats);
router.post('/suggest-category', authMiddleware, getAITag);
router.post('/enhance', authMiddleware, enhanceDescription);

router.put('/:id/resolve', authMiddleware, adminMiddleware, upload.single('attachment'), [
    body('resolutionSummary').notEmpty().withMessage('Resolution summary is required')
], validateRequest, resolveComplaint);

router.post('/bulk-resolve', authMiddleware, adminMiddleware, bulkResolve);
router.patch('/:id/assign', authMiddleware, adminMiddleware, assignComplaint);
router.post('/:id/reopen', authMiddleware, reopenComplaint);

module.exports = router;