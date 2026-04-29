const { connectDB, sequelize } = require('./config/db');
const { User } = require('./models/index');

const seedDatabase = async () => {
    try {
        await connectDB();

        console.log('Clearing existing users...');
        await User.destroy({ where: {}, force: true });

        console.log('Creating seed users...');
        const users = [
            {
                name: 'Admin User',
                email: 'admin@college.edu',
                password: 'password123',
                role: 'admin',
                department: 'Administration',
                hostel: 'Admin Block',
                academicYear: 'Staff',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin'
            },
            {
                name: 'Jane Smith (Faculty)',
                email: 'jane.smith@college.edu',
                password: 'password123',
                role: 'faculty',
                department: 'Computer Science',
                hostel: 'Faculty Quarters, Room 12',
                academicYear: 'Professor',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jane'
            },
            {
                name: 'John Doe (Student)',
                email: 'john.doe@student.college.edu',
                password: 'password123',
                role: 'student',
                department: 'Computer Science',
                hostel: 'Block B, Room 304',
                academicYear: '3rd Year, B.Tech',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=John'
            }
        ];

        for (const user of users) {
            await User.create(user);
        }

        console.log('✅ Database Seeding Complete!');
        console.log('You can now log in with:');
        console.log('- Admin: admin@college.edu (pw: password123)');
        console.log('- Faculty: jane.smith@college.edu (pw: password123)');
        console.log('- Student: john.doe@student.college.edu (pw: password123)');
        process.exit();
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedDatabase();
