const { User } = require('./models/index');
const { connectDB } = require('./config/db');
require('dotenv').config();

const depts = [
    'Computer Science & Engineering',
    'Information Technology',
    'Mechanical Engineering',
    'Electronics & Communication',
    'Civil Engineering'
];

async function seedDepartments() {
    await connectDB();
    
    console.log('Seeding departments for users with null values...');
    
    const users = await User.findAll({
        where: { department: null }
    });
    
    console.log(`Found ${users.length} users with no department.`);
    
    for (const user of users) {
        const randomDept = depts[Math.floor(Math.random() * depts.length)];
        user.department = randomDept;
        await user.save();
    }
    
    console.log('✅ All users now have departments!');
    process.exit();
}

seedDepartments();
