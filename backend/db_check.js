const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

async function listTables() {
    try {
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
        console.log('Tables:');
        res.rows.forEach(r => console.log(`- ${r.table_name}`));

        // Check content of lowercase 'users'
        const usersCount = await pool.query('SELECT role, count(*) FROM users GROUP BY role');
        console.log('\nLowercase users table stats:');
        usersCount.rows.forEach(r => console.log(`- ${r.role}: ${r.count}`));

        // Check all departments
        const depts = await pool.query("SELECT role, department, count(*) FROM \"Users\" GROUP BY role, department");
        console.log('\nDepartment distribution in "Users":');
        depts.rows.forEach(r => console.log(`- ${r.role} | ${r.department}: ${r.count}`));




    } catch (err) {
        console.error(err);
    }
    process.exit();
}

listTables();
