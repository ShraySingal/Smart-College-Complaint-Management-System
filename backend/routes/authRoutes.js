const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { login, registerUser, updateRoom, logout, getStaff, updateProfilePhoto, changePassword, forgotPassword, getAllUsers, toggleUserStatus, deleteAccount } = require('../controllers/authController');
const { authMiddleware, adminMiddleware } = require('../middlewares/authMiddleware');
const { validateRequest } = require('../middlewares/validator');
const { loginLimiter } = require('../middlewares/rateLimiter');
const upload = require('../config/upload');

// @route   POST /api/auth/login
router.post('/login', loginLimiter, [
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').notEmpty().withMessage('Password is required')
], validateRequest, login);

// @route   POST /api/auth/register
router.post('/register', [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Please include a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], validateRequest, registerUser);

// @route   PUT /api/auth/update-room
router.put('/update-room', authMiddleware, [
    body('hostel').notEmpty().withMessage('Room number is required')
], validateRequest, updateRoom);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// @route   POST /api/auth/logout
router.post('/logout', authMiddleware, logout);

// @route   GET /api/auth/staff
router.get('/staff', authMiddleware, adminMiddleware, getStaff);

// @route   GET /api/auth/all-users
router.get('/all-users', authMiddleware, adminMiddleware, getAllUsers);

// @route   PATCH /api/auth/status/:id
router.patch('/status/:id', authMiddleware, adminMiddleware, toggleUserStatus);

// @route   POST /api/auth/change-password
router.post('/change-password', authMiddleware, changePassword);

// @route   POST /api/auth/update-profile-photo
router.post('/update-profile-photo', authMiddleware, upload.single('profilePhoto'), updateProfilePhoto);

// @route   DELETE /api/auth/delete-account
router.delete('/delete-account', authMiddleware, deleteAccount);

module.exports = router;
