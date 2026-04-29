const rateLimit = require('express-rate-limit');

// Limiter for login endpoint: 5 attempts per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        message: 'Too many login attempts from this IP, please try again after 15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Limiter for complaint submission: 3 complaints per hour to prevent spam
const complaintLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, 
    message: {
        message: 'Complaint submission limit reached. Please try again in an hour.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = { loginLimiter, complaintLimiter };
