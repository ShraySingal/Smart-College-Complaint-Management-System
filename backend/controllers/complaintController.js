const { Complaint, User, Feedback, Message, ComplaintTimeline, Notification } = require('../models/index');
const { sendEmail, sendResolutionEmail, sendComplaintAcknowledgeEmail, sendAdminNotificationEmail } = require('../config/mailer');
const { sequelize } = require('../config/db');
const redisClient = require('../config/redis');
const { Op } = require('sequelize');
const logger = require('../config/logger');
const { suggestCategory } = require('../utils/aiTagger');
const { createNotification } = require('../controllers/notificationController');
const { analyzeSentiment, checkDuplicate, predictPriority, summarizeText, findSimilar } = require('../utils/aiEngine');

const raiseComplaint = async (req, res) => {
    logger.info(`Incoming Complaint Submission: User ${req.user?.id} (${req.user?.email})`);
    try {
        const { title, description, category, room, location, latitude, longitude } = req.body;
        logger.info(`Data: title=${title}, category=${category}, location=${location}, hasFile=${!!req.file}`);

        const isAnonymous = req.body.isAnonymous === 'true' || req.body.isAnonymous === true;

        let attachmentUrl = null;
        if (req.file) {
            attachmentUrl = `/uploads/${req.file.filename}`;
        } else {
            return res.status(400).json({ message: 'An image or video attachment is required' });
        }
        
        // AI: Sentiment Analysis
        const sentiment = analyzeSentiment(description);
        
        // AI: Multi-Factor Priority Prediction
        const { priority, priorityScore } = predictPriority(category, description, sentiment.score, sentiment.label);

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
            priorityScore,
            sentimentScore: sentiment.score,
            sentimentLabel: sentiment.label,
            isAnonymous,
            location,
            room,
            latitude: latitude || null,
            longitude: longitude || null,
            attachment: attachmentUrl,
            deadline
        });

        try {
            await redisClient.del(`complaints:user:${req.user.id}`);
            await redisClient.del('complaints:all');
        } catch (redisErr) {
            logger.warn("Redis Cache Invalidation failed (Lite Mode Active)");
        }

        // Record timeline event
        await ComplaintTimeline.create({
            complaintId: complaint.id,
            action: 'CREATED',
            description: `Complaint raised with ${priority} priority in ${location}`,
            performedBy: req.user.id
        });

        req.app.get('io').emit('admin_notification', {
            type: 'NEW_COMPLAINT',
            message: `New ${priority} priority complaint raised: ${title}`,
            complaintId: complaint.id
        });

        // --- NEW: Email Notifications (Asynchronous / Fire-and-Forget) ---
        // We don't 'await' this block so the response goes back to the user immediately
        (async () => {
            try {
                const user = await User.findByPk(req.user.id);
                if (user) {
                    // 1. Send acknowledgment to the student
                    sendComplaintAcknowledgeEmail(user, complaint).catch(e => logger.error("Acknowledge Email failed:", e));
                    
                    // 2. Notify all admins (In parallel)
                    const admins = await User.findAll({ where: { role: 'admin' } });
                    Promise.all(admins.map(admin => 
                        sendAdminNotificationEmail(admin, user, complaint).catch(e => logger.error(`Admin Email failed for ${admin.email}:`, e))
                    ));
                }
            } catch (emailErr) {
                logger.error("Background email process failed:", emailErr);
            }
        })();

        res.status(201).json({ success: true, message: "Complaint raised successfully!", complaint });
    } catch (err) {
        logger.error("Raise complaint error:", err);
        res.status(500).json({ 
            message: 'Server error while submitting complaint', 
            error: err.message 
        });
    }
};

const getMyComplaints = async (req, res) => {
    try {
        const { search, status, category } = req.query;
        logger.info(`🔍 Fetching complaints for User: ${req.user.id} | Filters: search=${search}, status=${status}, category=${category}`);
        const cacheKey = `complaints:user:${req.user.id}:${search}:${status}:${category}`;
        const whereClause = { studentId: req.user.id };
        if (search && search.trim() !== "") whereClause.title = { [Op.iLike]: `%${search}%` };
        if (status && status.trim() !== "") whereClause.status = status;
        if (category && category.trim() !== "") whereClause.category = category;

        const complaints = await Complaint.findAll({
            where: whereClause,
            include: [{ model: Feedback }],
            order: [['createdAt', 'DESC']]
        });
        logger.info(`✅ Found ${complaints.length} complaints for user ${req.user.id}`);

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
        let cachedData = null;
        try {
            cachedData = await redisClient.get(cacheKey);
        } catch (redisErr) {
            logger.warn("Redis Fetch Error (Lite Mode Active):", redisErr.message);
        }

        if (cachedData) return res.status(200).json(JSON.parse(cachedData));

        const offset = (page - 1) * limit;
        const whereClause = {};
        if (status && status.trim() !== "") whereClause.status = status;
        if (priority && priority.trim() !== "") whereClause.priority = priority;
        if (category && category.trim() !== "") whereClause.category = category;
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

        try {
            await redisClient.setEx(cacheKey, 60, JSON.stringify(responseData));
        } catch (redisErr) {
            // Silent fail
        }
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

        try {
            const keys = await redisClient.keys('complaints:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (redisErr) {
            logger.warn("Redis Resolve Cache Invalidation failed");
        }

        // Record timeline event
        await ComplaintTimeline.create({
            complaintId: complaint.id,
            action: 'RESOLVED',
            description: `Resolved: ${resolutionSummary || 'Resolved by admin'}`,
            performedBy: req.user.id
        });

        req.app.get('io').to(complaint.User.id).emit('user_notification', {
            type: 'COMPLAINT_RESOLVED',
            message: `Your complaint "${complaint.title}" has been resolved!`,
            complaintId: complaint.id
        });

        // In-app notification (replaces Twilio SMS)
        await createNotification(
            complaint.User.id,
            'Complaint Resolved',
            `Your complaint "${complaint.title}" has been resolved.`,
            'resolution',
            complaint.id
        );

        if (complaint.User && complaint.User.email) {
            await sendResolutionEmail(complaint.User, complaint);
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
        try {
            const keys = await redisClient.keys('complaints:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (redisErr) {
            logger.warn("Redis Assign Cache Invalidation failed");
        }

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

        try {
            const keys = await redisClient.keys('complaints:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (redisErr) {
            logger.warn("Redis Reopen Cache Invalidation failed");
        }

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

        // Record timeline event
        await ComplaintTimeline.create({
            complaintId: complaint.id,
            action: 'REOPENED',
            description: `Complaint reopened by ${complaint.User.name}`,
            performedBy: req.user.id
        });

        try {
            const keys = await redisClient.keys('complaints:*');
            if (keys.length > 0) await redisClient.del(keys);
        } catch (redisErr) {
            logger.warn('Redis cache clear failed');
        }

        req.app.get('io').emit('admin_notification', {
            type: 'COMPLAINT_REOPENED',
            message: `User ${complaint.User.name} reopened complaint: ${complaint.title}`,
            complaintId: complaint.id
        });

        // Notify all admins
        const admins = await User.findAll({ where: { role: 'admin' } });
        for (const admin of admins) {
            await createNotification(
                admin.id,
                'Complaint Reopened',
                `${complaint.User.name} reopened: "${complaint.title}"`,
                'complaint_update',
                complaint.id
            );
        }

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
        const inProgress = await Complaint.count({ where: { status: 'In Progress' } });
        const resolved = await Complaint.count({ where: { status: 'Resolved' } });
        const overdue = await Complaint.count({ 
            where: { 
                status: { [Op.ne]: 'Resolved' },
                deadline: { [Op.lt]: new Date() }
            } 
        });

        // Group by Category
        const categoryCounts = await Complaint.findAll({
            attributes: ['category', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['category']
        });

        const categoryData = categoryCounts.map(c => ({
            category: c.category,
            count: parseInt(c.get('count'), 10)
        }));

        res.status(200).json({ 
            total, pending, inProgress, resolved, overdue, categoryData 
        });
    } catch (error) {
        logger.error('Stats error:', error);
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

const enhanceDescription = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Text is required for enhancement' });
        }
        
        const keywords = {
            'fan': 'I am writing to formally report an issue regarding a malfunctioning fan in the specified area. The fan is currently not operational, causing discomfort. I request prompt maintenance to resolve this issue as it is affecting the learning environment.',
            'light': 'I am submitting a complaint regarding a broken or non-functional light fixture. Poor visibility in this area creates an unsafe and unproductive environment. Please arrange for an electrician to replace or repair the lighting as soon as possible.',
            'water': 'I would like to bring to your attention a plumbing issue. There is a problem with the water supply/leakage in the designated area. This is causing inconvenience and potential water damage. Immediate assistance from the maintenance department is requested.',
            'wifi': 'I am experiencing significant connectivity issues with the campus Wi-Fi network. The internet connection is either completely down or excessively slow, which is severely hampering academic work and research. Kindly investigate and restore the network stability.',
            'internet': 'I am experiencing significant connectivity issues with the campus Wi-Fi network. The internet connection is either completely down or excessively slow, which is severely hampering academic work and research. Kindly investigate and restore the network stability.',
            'clean': 'I am writing to report a hygiene and cleanliness issue. The mentioned area has not been cleaned properly and requires immediate housekeeping attention to maintain a healthy and sanitary environment for everyone.',
            'dirty': 'I am writing to report a hygiene and cleanliness issue. The mentioned area has not been cleaned properly and requires immediate housekeeping attention to maintain a healthy and sanitary environment for everyone.',
            'ac': 'This is a formal request for maintenance regarding the air conditioning unit. The AC is failing to cool the room properly or is completely non-functional. Due to the high temperatures, it is vital that this is repaired promptly.'
        };

        let enhancedText = '';
        const lowerText = text.toLowerCase();
        
        for (const [key, template] of Object.entries(keywords)) {
            if (lowerText.includes(key)) {
                enhancedText = template;
                break;
            }
        }

        if (!enhancedText) {
            enhancedText = `I am submitting this complaint to formally report the following issue: "${text.trim()}". This problem is causing inconvenience and I kindly request the concerned maintenance team to look into this matter and resolve it at the earliest possible convenience.`;
        }

        res.status(200).json({ enhanced: enhancedText });
    } catch (error) {
        logger.error('Enhance AI error:', error);
        res.status(500).json({ message: 'Error enhancing description' });
    }
};

const getTimeline = async (req, res) => {
    try {
        const { id } = req.params;
        const timeline = await ComplaintTimeline.findAll({
            where: { complaintId: id },
            include: [{ model: User, attributes: ['name', 'role'], foreignKey: 'performedBy' }],
            order: [['createdAt', 'ASC']]
        });
        res.status(200).json(timeline);
    } catch (error) {
        logger.error('Timeline error:', error);
        res.status(500).json({ message: 'Error fetching timeline' });
    }
};

// ========== AI: Summarize Complaint ==========
const summarizeComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findByPk(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        const summary = summarizeText(complaint.description);
        res.status(200).json({ summary });
    } catch (error) {
        logger.error('Summarize error:', error);
        res.status(500).json({ message: 'Summarization error' });
    }
};

// ========== AI: Find Similar Complaints ==========
const getSimilarComplaints = async (req, res) => {
    try {
        const complaint = await Complaint.findByPk(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Not found' });
        const all = await Complaint.findAll({ where: { id: { [Op.ne]: complaint.id } }, limit: 100, order: [['createdAt', 'DESC']] });
        const similar = findSimilar(complaint, all);
        res.status(200).json(similar);
    } catch (error) {
        logger.error('Similar error:', error);
        res.status(500).json({ message: 'Similarity search error' });
    }
};

// ========== AI: Check Duplicate Before Submit ==========
const checkDuplicateComplaint = async (req, res) => {
    try {
        const { title, description } = req.body;
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recent = await Complaint.findAll({
            where: { status: { [Op.ne]: 'Resolved' }, createdAt: { [Op.gte]: thirtyDaysAgo } },
            attributes: ['id', 'title', 'description', 'status'],
            limit: 50
        });
        const result = checkDuplicate(title, description, recent);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Duplicate check error:', error);
        res.status(500).json({ message: 'Duplicate check error' });
    }
};

// ========== QR Code Generation ==========
const generateQR = async (req, res) => {
    try {
        const QRCode = require('qrcode');
        const { location, room } = req.query;
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
        const url = `${baseUrl}/student.html?qr=true&location=${encodeURIComponent(location || '')}&room=${encodeURIComponent(room || '')}`;
        const qrDataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 });
        res.status(200).json({ qrCode: qrDataUrl, url });
    } catch (error) {
        logger.error('QR generation error:', error);
        res.status(500).json({ message: 'QR generation error' });
    }
};

// ========== Knowledge Base: Search Resolved Complaints ==========
const searchKnowledgeBase = async (req, res) => {
    try {
        const { q, category } = req.query;
        const where = { status: 'Resolved' };
        if (category) where.category = category;
        if (q) {
            where[Op.or] = [
                { title: { [Op.iLike]: `%${q}%` } },
                { description: { [Op.iLike]: `%${q}%` } },
                { resolutionSummary: { [Op.iLike]: `%${q}%` } }
            ];
        }
        const results = await Complaint.findAll({
            where,
            attributes: ['id', 'title', 'category', 'description', 'resolutionSummary', 'location', 'room', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        res.status(200).json(results);
    } catch (error) {
        logger.error('Knowledge base error:', error);
        res.status(500).json({ message: 'Knowledge base error' });
    }
};

// ========== Auto FAQ from Resolved Complaints ==========
const getAutoFAQ = async (req, res) => {
    try {
        const categories = ['Electricity', 'Water', 'Internet', 'Furniture', 'Hygiene', 'Other'];
        const faq = [];
        for (const cat of categories) {
            const resolved = await Complaint.findAll({
                where: { category: cat, status: 'Resolved', resolutionSummary: { [Op.ne]: null } },
                attributes: ['title', 'resolutionSummary'],
                order: [['createdAt', 'DESC']],
                limit: 3
            });
            if (resolved.length > 0) {
                faq.push({
                    category: cat,
                    items: resolved.map(c => ({ question: c.title, answer: c.resolutionSummary }))
                });
            }
        }
        res.status(200).json(faq);
    } catch (error) {
        logger.error('FAQ error:', error);
        res.status(500).json({ message: 'FAQ generation error' });
    }
};

// ========== Analytics: Department Performance ==========
const getDepartmentPerformance = async (req, res) => {
    try {
        const departments = await Complaint.findAll({
            attributes: [
                'category',
                [sequelize.fn('COUNT', sequelize.col('Complaint.id')), 'total'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN \"Complaint\".\"status\" = 'Resolved' THEN 1 END")), 'resolved'],
                [sequelize.fn('AVG', sequelize.literal("CASE WHEN \"Complaint\".\"status\" = 'Resolved' THEN EXTRACT(EPOCH FROM (\"Complaint\".\"updatedAt\" - \"Complaint\".\"createdAt\")) / 3600 END")), 'avgResolutionHours']
            ],
            group: ['category'],
            raw: true
        });
        
        const performance = departments.map(d => {
            const resolutionRate = d.total > 0 ? (d.resolved / d.total * 100) : 0;
            const score = Math.round(resolutionRate * 0.6 + Math.max(0, 100 - (d.avgResolutionHours || 0)) * 0.4);
            return {
                department: d.category,
                total: parseInt(d.total),
                resolved: parseInt(d.resolved),
                resolutionRate: parseFloat(resolutionRate.toFixed(1)),
                avgResolutionHours: parseFloat((d.avgResolutionHours || 0).toFixed(1)),
                performanceScore: Math.min(100, Math.max(0, score))
            };
        });
        
        performance.sort((a, b) => b.performanceScore - a.performanceScore);
        res.status(200).json(performance);
    } catch (error) {
        logger.error('Dept performance error:', error);
        res.status(500).json({ message: 'Performance analytics error' });
    }
};

// ========== Analytics: Heatmap Data ==========
const getHeatmapData = async (req, res) => {
    try {
        const data = await Complaint.findAll({
            attributes: [
                'location', 'room',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status != 'Resolved' THEN 1 END")), 'active']
            ],
            group: ['location', 'room'],
            raw: true
        });
        res.status(200).json(data);
    } catch (error) {
        logger.error('Heatmap error:', error);
        res.status(500).json({ message: 'Heatmap data error' });
    }
};

// ========== Analytics: Trend Prediction ==========
const getTrends = async (req, res) => {
    try {
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const trends = await Complaint.findAll({
            attributes: [
                [sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt')), 'week'],
                'category',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { createdAt: { [Op.gte]: ninetyDaysAgo } },
            group: [sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt')), 'category'],
            order: [[sequelize.fn('DATE_TRUNC', 'week', sequelize.col('createdAt')), 'ASC']],
            raw: true
        });
        res.status(200).json(trends);
    } catch (error) {
        logger.error('Trends error:', error);
        res.status(500).json({ message: 'Trends error' });
    }
};

// ========== Analytics: Hostel Room Tracking ==========
const getHostelTracking = async (req, res) => {
    try {
        const { hostel } = req.query;
        const where = { location: 'Hostel' };
        if (hostel) where.room = { [Op.iLike]: `%${hostel}%` };
        
        const rooms = await Complaint.findAll({
            attributes: [
                'room',
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalComplaints'],
                [sequelize.fn('COUNT', sequelize.literal("CASE WHEN status != 'Resolved' THEN 1 END")), 'activeComplaints']
            ],
            where,
            group: ['room'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            raw: true
        });
        res.status(200).json(rooms);
    } catch (error) {
        logger.error('Hostel tracking error:', error);
        res.status(500).json({ message: 'Hostel tracking error' });
    }
};

// ========== AI: Smart Recommendations ==========
const getRecommendations = async (req, res) => {
    try {
        // Find most common category+location combos
        const hotspots = await Complaint.findAll({
            attributes: [
                'category', 'location', 'room',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            where: { createdAt: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            group: ['category', 'location', 'room'],
            order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
            limit: 10,
            raw: true
        });
        
        const recommendations = hotspots.map(h => ({
            category: h.category,
            location: `${h.location} - ${h.room}`,
            count: parseInt(h.count),
            recommendation: `Schedule preventive ${h.category.toLowerCase()} maintenance at ${h.location} ${h.room} — ${h.count} complaints in the last 30 days.`
        }));
        
        res.status(200).json(recommendations);
    } catch (error) {
        logger.error('Recommendations error:', error);
        res.status(500).json({ message: 'Recommendations error' });
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
};
