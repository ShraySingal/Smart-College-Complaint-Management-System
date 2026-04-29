const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

// Map short department codes to full names
const deptMap = {
    'it': 'Information Technology',
    'ece': 'Electronics & Communication',
    'me': 'Mechanical Engineering',
    'ce': 'Civil Engineering',
    'cse': 'Computer Science & Engineering',
    'cs': 'Computer Science',
    'ee': 'Electrical Engineering',
    'eee': 'Electrical & Electronics',
    'bme': 'Biomedical Engineering',
    'che': 'Chemical Engineering',
    'bt': 'Biotechnology',
    'aids': 'AI & Data Science',
    'aiml': 'AI & Machine Learning',
    'mba': 'Business Administration',
    'mca': 'Computer Applications'
};

function extractDeptAndYear(email) {
    // Pattern: name.dept.year@novatech.edu  OR  name@novatech.edu (for admins)
    const localPart = email.split('@')[0]; // e.g. "student1.it.2025"
    const parts = localPart.split('.');
    
    let department = null;
    let academicYear = null;

    if (parts.length >= 3) {
        // e.g. ["student1", "it", "2025"]
        const deptCode = parts[1].toLowerCase();
        department = deptMap[deptCode] || deptCode.toUpperCase();
        academicYear = parts[2];
    } else if (parts.length === 2) {
        // e.g. ["faculty41", "it"]
        const deptCode = parts[1].toLowerCase();
        department = deptMap[deptCode] || deptCode.toUpperCase();
    }

    return { department, academicYear };
}

async function updateDepartments() {
    try {
        console.log('Fetching all users from "Users" table...');
        const { rows: users } = await pool.query('SELECT id, email, role FROM "Users"');
        console.log(`Found ${users.length} users. Extracting departments from emails...`);

        let updatedCount = 0;

        for (const user of users) {
            const { department, academicYear } = extractDeptAndYear(user.email);

            if (department) {
                await pool.query(
                    'UPDATE "Users" SET department = $1, "academicYear" = $2 WHERE id = $3',
                    [department, academicYear || (user.role === 'faculty' ? 'Professor' : user.role === 'admin' ? 'Staff' : null), user.id]
                );
                updatedCount++;
            }
        }

        console.log(`✅ Successfully updated departments for ${updatedCount} users!`);
        console.log('The profile cards will now show each user\'s department and year.');
        pool.end();
    } catch (error) {
        console.error('❌ Error:', error);
        pool.end();
        process.exit(1);
    }
}

updateDepartments();
