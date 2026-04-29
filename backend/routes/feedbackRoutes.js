const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { submitFeedback } = require('../controllers/feedbackController');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validator');

router.post('/submit', authMiddleware, [
    body('complaintId').notEmpty().withMessage('Complaint ID is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('message').notEmpty().withMessage('Feedback message is required')
], validateRequest, submitFeedback);

module.exports = router;
