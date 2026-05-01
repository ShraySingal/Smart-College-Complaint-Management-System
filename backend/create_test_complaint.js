const { Complaint, User } = require('./models/index');
const { connectDB } = require('./config/db');
require('dotenv').config();

const createTest = async () => {
    try {
        await connectDB();
        const user = await User.findOne({ where: { role: 'student' } });
        if (!user) {
            console.log('No student found in DB. Creating one...');
            // ... would need more logic here
            return;
        }
        
        const complaint = await Complaint.create({
            studentId: user.id,
            title: 'Test Complaint',
            description: 'This is a test complaint created via script.',
            category: 'Electricity',
            priority: 'Low',
            location: 'Hostel',
            room: '101',
            attachment: '/uploads/test.jpg',
            deadline: new Date(Date.now() + 72 * 60 * 60 * 1000)
        });
        
        console.log('✅ Test Complaint Created:', complaint.id);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

createTest();
