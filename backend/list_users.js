const { User } = require('./models/index');
const { connectDB } = require('./config/db');
require('dotenv').config();

const listUsers = async () => {
    try {
        await connectDB();
        const users = await User.findAll({
            attributes: ['id', 'name', 'email', 'role']
        });
        
        users.forEach(u => {
            console.log(`- ${u.name} (${u.email}) [${u.role}] ID: ${u.id}`);
        });
        
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
};

listUsers();
