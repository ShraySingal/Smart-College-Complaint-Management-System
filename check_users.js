const { User } = require('./backend/models/index');
const { connectDB } = require('./backend/config/db');
require('dotenv').config({ path: './backend/.env' });

async function checkUsers() {
    await connectDB();
    const users = await User.findAll({ limit: 10 });
    console.log('Sample Users:');
    users.forEach(u => {
        console.log(`- ${u.email} | Role: ${u.role} | Name: ${u.name}`);
    });

    const rolesCount = await User.findAll({
        attributes: [
            'role',
            [require('sequelize').fn('COUNT', require('sequelize').col('role')), 'count']
        ],
        group: 'role'
    });
    console.log('\nRoles Count:');
    rolesCount.forEach(r => {
        console.log(`- ${r.role}: ${r.dataValues.count}`);
    });
    process.exit();
}

checkUsers();
