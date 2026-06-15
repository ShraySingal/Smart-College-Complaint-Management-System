const { Notification } = require('../models/index');
const logger = require('../config/logger');

// Get all notifications for the current user
const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        const unreadCount = await Notification.count({
            where: { userId: req.user.id, isRead: false }
        });
        res.status(200).json({ notifications, unreadCount });
    } catch (error) {
        logger.error('Get notifications error:', error);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.update({ isRead: true }, { where: { id, userId: req.user.id } });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Mark read error:', error);
        res.status(500).json({ message: 'Error marking notification' });
    }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
    try {
        await Notification.update({ isRead: true }, { where: { userId: req.user.id, isRead: false } });
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Mark all read error:', error);
        res.status(500).json({ message: 'Error marking notifications' });
    }
};

// Helper: Create a notification (used by other controllers)
const createNotification = async (userId, title, message, type = 'system', link = null) => {
    try {
        await Notification.create({ userId, title, message, type, link });
    } catch (error) {
        logger.error('Create notification error:', error);
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, createNotification };
