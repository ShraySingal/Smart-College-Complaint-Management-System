const { sequelize, connectDB } = require('./config/db');
const User = require('./models/User');

const migrate = async () => {
    try {
        await connectDB();
        
        console.log("Fetching users from the imported 'users' table...");
        const [importedUsers] = await sequelize.query('SELECT * FROM "users"');
        
        console.log(`Found ${importedUsers.length} users to migrate.`);
        
        let successCount = 0;
        let skipCount = 0;
        let errorCount = 0;

        for (const rawUser of importedUsers) {
            try {
                // Check if user already exists
                const exists = await User.findOne({ where: { email: rawUser.email } });
                if (exists) {
                    skipCount++;
                    continue;
                }

                // Determine role based on name
                let role = 'student';
                if (rawUser.name.toLowerCase().includes('admin')) {
                    role = 'admin';
                } else if (rawUser.name.toLowerCase().includes('faculty') || rawUser.name.toLowerCase().includes('teacher')) {
                    role = 'faculty';
                }

                await User.create({
                    name: rawUser.name,
                    email: rawUser.email,
                    password: rawUser.password, // Hook will hash this!
                    role: role,
                    department: 'General',
                    hostel: 'None',
                    academicYear: 'N/A'
                });
                successCount++;
                
                if (successCount % 100 === 0) {
                    console.log(`Migrated ${successCount} users...`);
                }
            } catch (err) {
                console.error(`Failed to migrate ${rawUser.email}:`, err.message);
                errorCount++;
            }
        }

        console.log(`\nMigration Complete!`);
        console.log(`Successfully Migrated: ${successCount}`);
        console.log(`Skipped (Duplicates): ${skipCount}`);
        console.log(`Failed: ${errorCount}`);
        
        if (successCount > 0) {
            console.log("\nDropping the old 'users' table since migration is complete...");
            await sequelize.query('DROP TABLE IF EXISTS "users"');
            console.log("Old 'users' table dropped successfully.");
        }

        process.exit(0);
    } catch (e) {
        console.error("Migration failed critically:", e);
        process.exit(1);
    }
};

migrate();
