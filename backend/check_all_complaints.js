const { Complaint, User } = require('./models/index');
const { connectDB } = require('./config/db');
require('dotenv').config();

const checkAll = async () => {
    try {
        await connectDB();
        const complaints = await Complaint.findAll({
            include: [{ model: User, attributes: ['name', 'email'] }]
        });
        
        console.log(`Total Complaints in DB: ${complaints.length}`);
        complaints.forEach(c => {
            console.log(`- [${c.id}] ${c.title} | StudentID: ${c.studentId} | Reporter: ${c.User?.name || 'UNKNOWN'}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkAll();
