const jwt = require('jsonwebtoken');
const { User } = require('../models/index');
const dotenv = require('dotenv');

dotenv.config();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        // Check if token is blacklisted (Only if Redis is connected)
        const redisClient = require('../config/redis');
        if (redisClient.isOpen) {
            const isBlacklisted = await redisClient.get(`blacklist_${token}`);
            if (isBlacklisted) {
                return res.status(401).json({ message: 'Token is revoked. Please login again.' });
            }
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!user) {
            return res.status(401).json({ message: 'Token is not valid' });
        }

        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token is not valid' });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

module.exports = { authMiddleware, adminMiddleware };
