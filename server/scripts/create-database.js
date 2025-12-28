/**
 * Script to create the PostgreSQL database if it doesn't exist
 * 
 * Usage: node server/scripts/create-database.js
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  database: 'postgres', // Connect to default postgres database to create new one
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function createDatabase() {
  const client = await pool.connect();
  const dbName = process.env.PG_DATABASE || 'ciphersqlstudio_app';
  
  try {
    // Check if database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );
    
    if (result.rows.length > 0) {
      console.log(`✅ Database "${dbName}" already exists`);
    } else {
      // Create the database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database "${dbName}" created successfully`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error(`❌ Error creating database:`, error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createDatabase();





