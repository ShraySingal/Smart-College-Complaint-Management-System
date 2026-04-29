const { Complaint, User, Feedback, Message } = require('../models/index');
const { getPriority } = require('../utils/priorityLogic');
const { sendEmail, sendResolutionEmail, sendComplaintAcknowledgeEmail, sendAdminNotificationEmail } = require('../config/mailer');
const { sequelize } = require('../config/db');
const redisClient = require('../config/redis');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { suggestCategory } = require('../utils/aiTagger');
const { sendSMS } = require('../utils/smsService');

const raiseComplaint = async (req, res) => {
    try {
        const { title, description, category, room, location, latitude, longitude } = req.body;

        let attachmentUrl = null;
        if (req.file) {
            // Check if Cloudinary (path is URL) or DiskStorage (path is local filename)
            attachmentUrl = req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'An image or video attachment is required' });
        }
        
        const priority = getPriority(category);

        let deadlineHours = 72;
        if (priority === 'High') deadlineHours = 24;
        else if (priority === 'Medium') deadlineHours = 48;
        const deadline = new Date(Date.now() + deadlineHours * 60 * 60 * 1000);

        const complaint = await Complaint.create({
            studentId: req.user.id,
            title,
            description,
            category,
            priority,
            location,
            room,
            attachment: attachmentUrl,
            deadline
        });

        await redisClient.del(`complaints:user:${req.user.id}`);
        await redisClient.del('complaints:all');

        req.app.get('io').emit('admin_notification', {
            type: 'NEW_COMPLAINT',
            message: `New ${priority} priority complaint raised: ${title}`,
            complaintId: complaint.id
        });

        // --- NEW: Email Notifications ---
        const user = await User.findByPk(req.user.id);
        if (user) {
            // 1. Send acknowledgment to the student
            await sendComplaintAcknowledgeEmail(user, complaint);
            
            // 2. Notify all admins
            const admins = await User.findAll({ where: { role: 'admin' } });
            for (const admin of admins) {
                await sendAdminNotificationEmail(admin, user, complaint);
            }
        }

        res.status(201).json({ success: true, message: "Complaint raised successfully!", complaint });
    } catch (err) {
        logger.error("Raise complaint error:", err);
        res.status(500).json({ message: 'Server error while submitting complaint' });
    }
};

const getMyComplaints = async (req, res) => {
    try {
        const { search, status, category } = req.query;
        const cacheKey = `complaints:user:${req.user.id}:${search}:${status}:${category}`;
        const cachedData = await redisClient.get(cacheKey);
        
        if (cachedData) return res.status(200).json(JSON.parse(cachedData));

        const whereClause = { studentId: req.user.id };
        if (search) whereClause.title = { [Op.iLike]: `%${search}%` };
        if (status) whereClause.status = status;
        if (category) whereClause.category = category;

        const complaints = await Complaint.findAll({
            where: whereClause,
            include: [{ model: Feedback }],
            order: [['createdAt', 'DESC']]
        });

        await redisClient.setEx(cacheKey, 60, JSON.stringify(complaints));
        res.status(200).json(complaints);
    } catch (error) {
        logger.error('Error fetching my complaints:', error);
        res.status(500).json({ message: 'Server error fetching complaints' });
    }
};

const getAllComplaints = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, priority, search, category } = req.query;
        const cacheKey = `complaints:all:${page}:${limit}:${status}:${priority}:${search}:${category}`;
        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) return res.status(200).json(JSON.parse(cachedData));

        const offset = (page - 1) * limit;
        const whereClause = {};
        if (status) whereClause.status = status;
        if (priority) whereClause.priority = priority;
        if (category) whereClause.category = category;
        if (search) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const { count, rows } = await Complaint.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, attributes: ['name', 'email', 'role', 'department'] },
                { model: Feedback }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            offset: parseInt(offset, 10)
        });

        const responseData = {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page, 10),
            complaints: rows
        };

        await redisClient.setEx(cacheKey, 60, JSON.stringify(responseData));
        res.status(200).json(responseData);
    } catch (error) {
        logger.error('Error fetching all complaints:', error);
        res.status(500).json({ message: 'Server error fetching complaints' });
    }
};

const resolveComplaint = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const { resolutionSummary } = req.body;

        const complaint = await Complaint.findByPk(id, {
            include: [{ model: User, attributes: ['id', 'email', 'name'] }],
            transaction: t
        });

        if (!complaint) {
            await t.rollback();
            return res.status(404).json({ message: 'Complaint not found' });
        }

        complaint.status = 'Resolved';
        complaint.resolutionSummary = resolutionSummary || 'Resolved by admin';
        
        if (req.file) {
            complaint.resolutionAttachment = req.file.path.startsWith('http') ? req.file.path : `/uploads/${req.file.filename}`;
        }

        await complaint.save({ transaction: t });

        await t.commit();

        const keys = await redisClient.keys('complaints:*');
        if (keys.length > 0) await redisClient.del(keys);

        req.app.get('io').to(complaint.User.id).emit('user_notification', {
            type: 'COMPLAINT_RESOLVED',
            message: `Your complaint "${complaint.title}" has been resolved!`,
            complaintId: complaint.id
        });

        if (complaint.User && complaint.User.email) {
            await sendResolutionEmail(complaint.User, complaint);
            if (complaint.priority === 'High') {
                await sendSMS('+1234567890', `Urgent: Your complaint "${complaint.title}" has been resolved.`);
            }
        }

        res.status(200).json({ success: true, message: 'Complaint resolved', complaint });
    } catch (error) {
        if (t) await t.rollback();
        logger.error('Resolve error:', error);
        res.status(500).json({ message: 'Server error resolving complaint' });
    }
};

const bulkResolve = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { ids, resolutionSummary } = req.body;
        if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });

        await Complaint.update(
            { status: 'Resolved', resolutionSummary: resolutionSummary || 'Bulk resolved by admin' },
            { where: { id: ids }, transaction: t }
        );

        await t.commit();
        const keys = await redisClient.keys('complaints:*');
        if (keys.length > 0) await redisClient.del(keys);

        res.status(200).json({ success: true, message: `${ids.length} complaints resolved` });
    } catch (error) {
        if (t) await t.rollback();
        logger.error('Bulk resolve error:', error);
        res.status(500).json({ message: 'Server error in bulk resolution' });
    }
};

const assignComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { assignedTo } = req.body;

        const complaint = await Complaint.findByPk(id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        complaint.assignedTo = assignedTo;
        complaint.status = 'In Progress';
        await complaint.save();

        const keys = await redisClient.keys('complaints:*');
        if (keys.length > 0) await redisClient.del(keys);

        res.status(200).json({ success: true, message: 'Complaint assigned successfully' });
    } catch (error) {
        logger.error('Assign error:', error);
        res.status(500).json({ message: 'Server error assigning complaint' });
    }
};

const reopenComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const complaint = await Complaint.findByPk(id, {
            include: [{ model: User, attributes: ['id', 'name'] }]
        });

        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        complaint.status = 'Pending';
        complaint.resolutionSummary = null;
        await complaint.save();

        const keys = await redisClient.keys('complaints:*');
        if (keys.length > 0) await redisClient.del(keys);

        req.app.get('io').emit('admin_notification', {
            type: 'COMPLAINT_REOPENED',
            message: `User ${complaint.User.name} reopened complaint: ${complaint.title}`,
            complaintId: complaint.id
        });

        res.status(200).json({ success: true, message: 'Complaint reopened' });
    } catch (error) {
        logger.error('Reopen error:', error);
        res.status(500).json({ message: 'Server error reopening complaint' });
    }
};

const getAITag = async (req, res) => {
    try {
        const { text } = req.body;
        const suggestion = suggestCategory(text);
        res.status(200).json({ suggestion });
    } catch (error) {
        res.status(500).json({ message: 'AI error' });
    }
};

const getStats = async (req, res) => {
    try {
        const total = await Complaint.count();
        const pending = await Complaint.count({ where: { status: 'Pending' } });
        const resolved = await Complaint.count({ where: { status: 'Resolved' } });
        const overdue = await Complaint.count({ 
            where: { 
                status: { [Op.ne]: 'Resolved' },
                deadline: { [Op.lt]: new Date() }
            } 
        });

        res.status(200).json({ total, pending, resolved, overdue });
    } catch (error) {
        res.status(500).json({ message: 'Stats error' });
    }
};

const getAssignedComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.findAll({
            where: { assignedTo: req.user.id },
            include: [{ model: User, as: 'user', attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assigned tasks' });
    }
};

module.exports = { 
    raiseComplaint, 
    getMyComplaints, 
    getAllComplaints, 
    resolveComplaint, 
    bulkResolve, 
    assignComplaint, 
    reopenComplaint,
    getAITag,
    getStats,
    getAssignedComplaints
};
