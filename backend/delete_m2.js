const { connectDB, sequelize } = require('./config/db');
const { User, Complaint, Feedback, Message } = require('./models/index');

const deleteUserPermanently = async (email) => {
    try {
        await connectDB();
        
        console.log(`Searching for user with email: ${email}`);
        const user = await User.findOne({ where: { email } });
        
        if (!user) {
            console.log('User not found.');
            process.exit(0);
        }

        console.log(`User found: ${user.name} (${user.id}). Deleting all associated data...`);

        // Force delete to bypass paranoid (soft-delete)
        await User.destroy({
            where: { email },
            force: true
        });

        console.log(`✅ All data for ${email} has been permanently removed from the database.`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error deleting user:', error);
        process.exit(1);
    }
};

deleteUserPermanently('m2@gmail.com');
