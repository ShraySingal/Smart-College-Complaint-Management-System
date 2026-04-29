const { User, Complaint, Message, Feedback } = require('./models');
const { connectDB } = require('./config/db');
require('dotenv').config();

const removeUserData = async (email) => {
    try {
        await connectDB();
        
        const user = await User.findOne({ where: { email } });
        if (!user) {
            console.log(`❌ User with email ${email} not found.`);
            process.exit(1);
        }

        const userId = user.id;
        console.log(`🔍 Found user: ${user.name} (${userId})`);

        // 1. Delete Messages
        const msgCount = await Message.destroy({ where: { senderId: userId }, force: true });
        console.log(`🗑️ Deleted ${msgCount} messages.`);

        // 2. Delete Feedback
        const feedbackCount = await Feedback.destroy({ where: { studentId: userId }, force: true });
        console.log(`🗑️ Deleted ${feedbackCount} feedback entries.`);

        // 3. Delete Complaints (raised by student)
        const complaintCount = await Complaint.destroy({ where: { studentId: userId }, force: true });
        console.log(`🗑️ Deleted ${complaintCount} complaints raised by user.`);

        // 4. Update Complaints (assigned to user if they were staff)
        const assignedCount = await Complaint.update({ assignedTo: null }, { where: { assignedTo: userId } });
        console.log(`🔄 Unassigned ${assignedCount[0]} complaints from user.`);

        // 5. Delete User record
        await User.destroy({ where: { id: userId }, force: true });
        console.log(`✅ User ${user.name} permanently removed from system.`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error removing user data:', error);
        process.exit(1);
    }
};

removeUserData('sj2500621@gmail.com');
