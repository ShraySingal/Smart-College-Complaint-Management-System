const redis = require('redis');
const logger = require('./logger');

const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => {
    // Only log once to avoid console spam
    if (!redisClient.isErrorLogged) {
        logger.warn('⚠️ Redis not found. Running in Lite Mode (No Caching/Blacklisting).');
        redisClient.isErrorLogged = true;
    }
});

redisClient.on('connect', () => {
    logger.info('✅ Redis Connected');
    redisClient.isErrorLogged = false;
});

// Immediately attempt connection but don't crash if it fails
(async () => {
    try {
        await redisClient.connect();
    } catch (e) {
        // Silent fail - handled by error event
    }
})();

module.exports = redisClient;
