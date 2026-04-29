const express = require('express');
const router = express.Router();
const { sequelize } = require('../config/db');
const redisClient = require('../config/redis');

router.get('/', async (req, res) => {
    let dbStatus = 'Disconnected';
    let redisStatus = 'Disconnected';

    try {
        await sequelize.authenticate();
        dbStatus = 'Connected';
    } catch (e) {}

    try {
        if (redisClient.isOpen) redisStatus = 'Connected';
    } catch (e) {}

    res.status(200).json({
        status: 'Server is running',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
        database: dbStatus,
        redis: redisStatus
    });
});

router.get('/logs', require('../middlewares/authMiddleware').authMiddleware, require('../middlewares/authMiddleware').adminMiddleware, (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../logs/app.log');

    if (!fs.existsSync(logFile)) return res.json([]);

    const content = fs.readFileSync(logFile, 'utf8');
    const lines = content.trim().split('\n').map(l => JSON.parse(l)).reverse().slice(0, 50);
    res.json(lines);
});

module.exports = router;
