const { User } = require('./backend/models/index');
const { connectDB } = require('./backend/config/db');

async function removeUser() {
    try {
        await connectDB();
        const email = 'shraysingal2394@gmail.com';
        
        const user = await User.findOne({ where: { email } });
        if (user) {
            await user.destroy({ force: true }); // Permanent delete
            console.log(`✅ SUCCESS: User ${email} has been removed.`);
        } else {
            console.log(`❌ ERROR: User ${email} not found.`);
        }
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error);
        process.exit(1);
    }
}

removeUser();
