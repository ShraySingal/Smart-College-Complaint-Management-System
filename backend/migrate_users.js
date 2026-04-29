const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

const migrateUsers = async () => {
    try {
        console.log('Connecting to database...');
        
        // 1. Fetch from your custom lowercase 'users' table
        const { rows: customUsers } = await pool.query('SELECT * FROM users');
        console.log(`Found ${customUsers.length} users in your imported 'users' table.`);

        let migratedCount = 0;
        let skippedCount = 0;
        const now = new Date();

        console.log('Starting migration loop...');
        for (let i = 0; i < customUsers.length; i++) {
            const user = customUsers[i];
            
            // Skip if password is somehow already hashed
            let hashedPassword = user.password;
            if (!hashedPassword.startsWith('$2')) {
                hashedPassword = await bcrypt.hash(user.password, 12);
            }

            const newId = crypto.randomUUID();

            try {
                await pool.query(
                    `INSERT INTO "Users" (id, name, email, password, role, "createdAt", "updatedAt") 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)
                     ON CONFLICT (email) DO NOTHING`,
                    [newId, user.name, user.email, hashedPassword, user.role, now, now]
                );
                migratedCount++;
            } catch (err) {
                console.error(`Error migrating ${user.email}:`, err.message);
                skippedCount++;
            }

            if ((i + 1) % 100 === 0) {
                console.log(`Processed ${i + 1} / ${customUsers.length} users...`);
            }
        }

        console.log(`✅ Migration complete!`);
        console.log(`- Successfully migrated/checked: ${migratedCount}`);
        console.log(`- Total users in source: ${customUsers.length}`);

        process.exit();
    } catch (error) {
        if (error.code === '42P01') {
            console.error('❌ Could not find the lowercase "users" table. Make sure you imported it correctly!');
        } else {
            console.error('❌ Migration failed:', error);
        }
        process.exit(1);
    }
};

migrateUsers();
