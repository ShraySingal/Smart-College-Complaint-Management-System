const { connectDB, sequelize } = require('./config/db');
const { User } = require('./models/index');
const bcrypt = require('bcryptjs');

const hashExistingPasswords = async () => {
    try {
        await connectDB();
        
        console.log('Fetching users to encrypt passwords...');
        const users = await User.findAll();
        let updatedCount = 0;

        for (const user of users) {
            // Check if it's already a bcrypt hash (starts with $2)
            if (user.password && !user.password.startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(user.password, 12);
                
                // Update directly in the database, skipping hooks
                await User.update({ password: hashedPassword }, {
                    where: { id: user.id },
                    hooks: false
                });
                
                updatedCount++;
            }
        }

        console.log(`✅ Successfully encrypted ${updatedCount} passwords!`);
        console.log('You can now log in with your imported users.');
        process.exit();
    } catch (error) {
        console.error('❌ Error encrypting passwords:', error);
        process.exit(1);
    }
};

hashExistingPasswords();
