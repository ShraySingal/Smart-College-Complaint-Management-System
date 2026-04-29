const twilio = require('twilio');

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMS = async (to, message) => {
    try {
        // Basic validation: must be a valid international number
        if (!to || !to.startsWith('+')) {
            console.log(`[SMS SKIP]: Invalid phone number ${to}. Must start with +countrycode`);
            return;
        }

        const response = await client.messages.create({
            body: `[NovaTech] ${message}`,
            from: process.env.TWILIO_PHONE,
            to: to
        });
        console.log(`[SMS SUCCESS]: SID ${response.sid}`);
    } catch (error) {
        console.error("[SMS ERROR]:", error.message);
    }
};

const sendWelcomeSMS = async (user) => {
    // We assume the user's phone might be stored in the database or provided during reg
    // For now, let's try to find a 'phone' field. If it doesn't exist, we skip.
    if (user.phone) {
        await sendSMS(user.phone, `Hello ${user.name}, welcome to the College Smart Complaint System! Raise your first complaint at http://localhost:5010`);
    }
};

module.exports = { sendSMS, sendWelcomeSMS };
