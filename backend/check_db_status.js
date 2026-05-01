const { Complaint, User } = require('./models/index');
const { connectDB } = require('./config/db');
require('dotenv').config();

const checkDB = async () => {
    try {
        await connectDB();
        const count = await Complaint.count();
        console.log(`Total Complaints in DB: ${count}`);
        
        const latest = await Complaint.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            include: [{ model: User, attributes: ['name', 'email'] }]
        });
        
        latest.forEach(c => {
            console.log(`- [${c.createdAt}] ${c.title} (by ${c.User?.name || 'Unknown'})`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

checkDB();
