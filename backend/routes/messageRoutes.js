const express = require('express');
const router = express.Router();
const { getMessages, sendMessage } = require('../controllers/messageController');
const { authMiddleware } = require('../middlewares/authMiddleware');

router.get('/:complaintId', authMiddleware, getMessages);
router.post('/:complaintId', authMiddleware, sendMessage);

module.exports = router;
