require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        const client = await pool.connect();
        console.log('✅ PostgreSQL connection successful!');

        // Check current DB and user
        const info = await client.query('SELECT current_database(), current_user');
        console.log('   Database:', info.rows[0].current_database);
        console.log('   User:', info.rows[0].current_user);

        // List public tables
        const tables = await client.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
        );
        console.log('\n📋 Public tables:');
        if (tables.rows.length === 0) {
            console.log('   (none found — you need to run seed scripts)');
        } else {
            tables.rows.forEach(row => console.log('   -', row.table_name));
        }

        // List schemas
        const schemas = await client.query(
            "SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast') ORDER BY schema_name"
        );
        console.log('\n📂 Schemas:');
        schemas.rows.forEach(row => console.log('   -', row.schema_name));

        // Check if users table exists
        const usersCheck = await client.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public' ORDER BY ordinal_position"
        );
        if (usersCheck.rows.length > 0) {
            console.log('\n👤 Users table columns:');
            usersCheck.rows.forEach(row => console.log(`   - ${row.column_name} (${row.data_type})`));
        } else {
            console.log('\n⚠️  Users table not found — it will be auto-created on first server start');
        }

        // Check assignments table
        const assignCheck = await client.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'assignments' AND table_schema = 'public' ORDER BY ordinal_position"
        );
        if (assignCheck.rows.length > 0) {
            console.log('\n📝 Assignments table columns:');
            assignCheck.rows.forEach(row => console.log(`   - ${row.column_name} (${row.data_type})`));

            const count = await client.query('SELECT COUNT(*) as cnt FROM assignments');
            console.log(`   Total assignments: ${count.rows[0].cnt}`);
        } else {
            console.log('\n⚠️  Assignments table not found — you need to run seed scripts');
        }

        // Check user_progress table
        const progressCheck = await client.query(
            "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_progress' AND table_schema = 'public'"
        );
        if (progressCheck.rows.length > 0) {
            console.log('\n✅ user_progress table exists');
        } else {
            console.log('\n⚠️  user_progress table not found — you need to run init scripts');
        }

        client.release();
        console.log('\n🎉 All checks passed! Database is ready for production.');
    } catch (err) {
        console.error('❌ Connection test failed:', err.message);
    } finally {
        await pool.end();
    }
}

testConnection();
