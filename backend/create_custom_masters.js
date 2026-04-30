const { connectDB } = require('./config/db');
const User = require('./models/User');

const createCustomMasters = async () => {
    try {
        await connectDB();
        
        console.log('Creating Custom Master Accounts...');
        
        const accounts = [
            {
                name: 'Shray Singal (Student)',
                email: 'shray.singal.cs27@iilm.edu',
                password: 'password123',
                role: 'student',
                department: 'Computer Science',
                hostel: 'Block A',
                academicYear: '2nd Year',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShrayStudent'
            },
            {
                name: 'Shray Singal (Faculty)',
                email: 'shraysingal230904@gmail.com',
                password: 'password123',
                role: 'faculty',
                department: 'Computer Science',
                hostel: 'Faculty Quarters',
                academicYear: 'Professor',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShrayFaculty'
            },
            {
                name: 'Shray Singal (Admin)',
                email: 'shraysingal23092004@gmail.com',
                password: 'password123',
                role: 'admin',
                department: 'Administration',
                hostel: 'Admin Block',
                academicYear: 'Staff',
                profilePhoto: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ShrayAdmin'
            }
        ];

        for (const acc of accounts) {
            // Clean up any existing user with this email just in case
            await User.destroy({ where: { email: acc.email }, force: true });
            
            // Create the secure account (password will be automatically bcrypt hashed)
            await User.create(acc);
            console.log(`Created: ${acc.role} - ${acc.email}`);
        }

        console.log('✅ All custom masters safely injected into Supabase!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to create masters:', error);
        process.exit(1);
    }
};

createCustomMasters();
