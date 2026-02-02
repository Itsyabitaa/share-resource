const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSchema() {
    try {
        console.log('🔍 Checking database schema...\n');

        // Check user table
        const userResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'user' 
            ORDER BY ordinal_position;
        `);
        console.log('📋 User table columns:');
        userResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check session table
        const sessionResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'session' 
            ORDER BY ordinal_position;
        `);
        console.log('\n📋 Session table columns:');
        sessionResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        // Check account table
        const accountResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'account' 
            ORDER BY ordinal_position;
        `);
        console.log('\n📋 Account table columns:');
        accountResult.rows.forEach(row => {
            console.log(`  - ${row.column_name}: ${row.data_type}`);
        });

        console.log('\n✅ Schema check completed!');
    } catch (error) {
        console.error('❌ Error checking schema:', error.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
