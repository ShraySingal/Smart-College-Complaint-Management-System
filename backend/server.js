const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const logger = require('./config/logger');
const { connectDB } = require('./config/db');
const setupCronJobs = require('./config/cron');
const redisClient = require('./config/redis');

// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

// Self-Healing: Connection Watchdogs
setInterval(async () => {
    try {
        await require('./config/db').sequelize.authenticate();
    } catch (err) {
        logger.error('CRITICAL: Database connection lost. Attempting auto-recovery...');
        connectDB();
    }

    try {
        if (redisClient.isOpen) {
            const ping = await redisClient.ping();
            if (ping !== 'PONG') throw new Error('Redis down');
        }
    } catch (err) {
        logger.error('CRITICAL: Redis connection lost. Functionality might be limited.');
    }
}, 30000); // Check every 30 seconds

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/health', require('./routes/healthRoutes'));

// Error Handling Middleware
app.use((err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File is too large. Maximum limit is 10MB.' });
        }
        return res.status(400).json({ message: err.message });
    } else if (err) {
        return res.status(400).json({ message: err.message });
    }
    next();
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.set('io', io);

io.on('connection', (socket) => {
    logger.info(`New client connected: ${socket.id}`);

    socket.on('join', (userId) => {
        socket.join(userId);
        logger.info(`User ${userId} joined their notification room`);
    });

    socket.on('join_complaint', (complaintId) => {
        socket.join(complaintId);
        logger.info(`User joined complaint chat room: ${complaintId}`);
    });

    socket.on('disconnect', () => {
        logger.info('Client disconnected');
    });
});

// Initialize Cron Jobs
setupCronJobs(io);

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`🌍 Frontend available at http://localhost:${PORT}/login.html`);
    });
}

module.exports = app;
