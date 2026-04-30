const { connectDB } = require('./config/db');
const User = require('./models/User');

const deleteUser = async () => {
    try {
        await connectDB();
        
        const count = await User.destroy({ 
            where: { email: 'm2@gmail.com' },
            force: true
        });
        
        console.log(`Successfully deleted ${count} user(s) with email m2@gmail.com from the database.`);
        process.exit(0);
    } catch (e) {
        console.error('Error deleting user:', e);
        process.exit(1);
    }
};

deleteUser();
