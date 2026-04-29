const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.POSTGRES_URI,
    ssl: { rejectUnauthorized: false }
});

async function checkSchema() {
    const res = await pool.query(
        "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position"
    );
    console.log('--- Columns in your "users" table ---');
    res.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

    // Show a sample row
    const sample = await pool.query('SELECT * FROM users LIMIT 3');
    console.log('\n--- Sample rows ---');
    console.log(JSON.stringify(sample.rows, null, 2));

    pool.end();
}

checkSchema();
