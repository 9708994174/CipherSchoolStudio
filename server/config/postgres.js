const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE || 'ciphersqlstudio_app',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL connection error:', err);
});

/**
 * Create a schema for a workspace (assignment)
 */
async function createSchema(schemaName) {
  const client = await pool.connect();
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    console.log(`✅ Schema ${schemaName} created/verified`);
  } catch (error) {
    console.error(`❌ Error creating schema ${schemaName}:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set search path to a specific schema
 */
async function setSearchPath(schemaName) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schemaName}`);
  } catch (error) {
    console.error(`❌ Error setting search path:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query in a specific schema
 */
async function executeQuery(schemaName, query) {
  const client = await pool.connect();
  try {
    // Set search path to the schema
    await client.query(`SET search_path TO ${schemaName}`);
    
    // Execute the user's query
    const result = await client.query(query);
    
    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      columns: result.fields ? result.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : []
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  } finally {
    client.release();
  }
}

/**
 * Initialize tables for an assignment in its schema
 */
async function initializeAssignmentTables(schemaName, sampleTables) {
  const client = await pool.connect();
  try {
    // Create schema if it doesn't exist
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
    
    // Set search path
    await client.query(`SET search_path TO ${schemaName}`);
    
    // Drop existing tables in this schema (for re-initialization)
    for (const table of sampleTables) {
      await client.query(`DROP TABLE IF EXISTS ${table.tableName} CASCADE`);
    }
    
    // Create tables and insert data
    for (const table of sampleTables) {
      // Build CREATE TABLE statement
      const columnDefinitions = table.columns.map(col => {
        const pgType = mapDataTypeToPostgreSQL(col.dataType);
        return `${col.columnName} ${pgType}`;
      }).join(', ');
      
      await client.query(`CREATE TABLE ${table.tableName} (${columnDefinitions})`);
      
      // Insert sample data
      if (table.rows && table.rows.length > 0) {
        const columns = table.columns.map(col => col.columnName);
        const placeholders = table.rows.map((_, i) => {
          const rowPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ');
          return `(${rowPlaceholders})`;
        }).join(', ');
        
        const values = table.rows.flatMap(row => 
          columns.map(col => row[col])
        );
        
        const insertQuery = `INSERT INTO ${table.tableName} (${columns.join(', ')}) VALUES ${placeholders}`;
        await client.query(insertQuery, values);
      }
    }
    
    console.log(`✅ Initialized tables for schema ${schemaName}`);
  } catch (error) {
    console.error(`❌ Error initializing tables:`, error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Map common data types to PostgreSQL types
 */
function mapDataTypeToPostgreSQL(dataType) {
  const typeMap = {
    'INTEGER': 'INTEGER',
    'TEXT': 'TEXT',
    'VARCHAR': 'VARCHAR(255)',
    'STRING': 'TEXT',
    'REAL': 'REAL',
    'FLOAT': 'REAL',
    'DOUBLE': 'DOUBLE PRECISION',
    'BOOLEAN': 'BOOLEAN',
    'DATE': 'DATE',
    'TIMESTAMP': 'TIMESTAMP',
    'DECIMAL': 'DECIMAL(10, 2)',
    'NUMERIC': 'NUMERIC'
  };
  
  return typeMap[dataType.toUpperCase()] || 'TEXT';
}

/**
 * Get table schemas for a specific schema
 */
async function getTableSchemas(schemaName) {
  const client = await pool.connect();
  try {
    await client.query(`SET search_path TO ${schemaName}`);
    
    const result = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = $1
      ORDER BY table_name, ordinal_position
    `, [schemaName]);
    
    return result.rows;
  } catch (error) {
    console.error(`❌ Error getting table schemas:`, error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  createSchema,
  setSearchPath,
  executeQuery,
  initializeAssignmentTables,
  getTableSchemas
};




