const twilio = require('twilio');
const logger = require('../config/logger');

const sendSMS = async (to, message) => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        logger.warn('Twilio credentials missing. SMS not sent.');
        return;
    }

    const client = twilio(accountSid, authToken);

    try {
        await client.messages.create({
            body: message,
            from: fromNumber,
            to: to
        });
        logger.info(`SMS sent to ${to}`);
    } catch (error) {
        logger.error('SMS sending failed:', error);
    }
};

module.exports = { sendSMS };
