const { User } = require('./models');
const { connectDB } = require('./config/db');
require('dotenv').config();

const setupMasters = async () => {
    try {
        await connectDB();
        
        const masters = [
            {
                name: 'Master Admin',
                email: 'shraysingal230409@gmail.com',
                password: 'Master@123',
                role: 'admin', // Lowercase to match your DB Enum
                department: 'Management'
            },
            {
                name: 'Master Faculty',
                email: 'shraysingal23092004@gmail.com',
                password: 'Master@123',
                role: 'faculty', // Changed to 'faculty' to match your DB Enum
                department: 'Computer Science'
            },
            {
                name: 'Master Student',
                email: 'shray.singal.cs27@iilm.edu',
                password: 'Master@123',
                role: 'student', // Lowercase to match your DB Enum
                department: 'B.Tech CS'
            }
        ];

        for (const m of masters) {
            // findOrCreate will trigger the beforeCreate hook in the User model
            const [user, created] = await User.findOrCreate({
                where: { email: m.email },
                defaults: {
                    name: m.name,
                    password: m.password, // Plain password, model hooks will hash it
                    role: m.role,
                    department: m.department,
                    status: 'Active'
                }
            });

            if (!created) {
                user.role = m.role;
                user.password = m.password; // Plain password, model hooks will hash it
                user.status = 'Active';
                await user.save();
                console.log(`✅ Updated existing Master: ${m.email} (${m.role})`);
            } else {
                console.log(`✨ Created new Master: ${m.email} (${m.role})`);
            }
        }

        console.log('\n🚀 ALL MASTER ACCOUNTS ARE READY!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error setting up masters:', error);
        process.exit(1);
    }
};

setupMasters();
