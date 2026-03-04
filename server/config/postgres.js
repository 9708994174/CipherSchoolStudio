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
  connectionTimeoutMillis: 10000, // Increased timeout to 10 seconds
});

// Test connection on startup
pool.connect()
  .then((client) => {
    console.log('✅ Connected to PostgreSQL');
    client.release();
  })
  .catch((err) => {
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    console.error('   Please check your PostgreSQL connection settings in .env file');
    console.error('   PG_HOST:', process.env.PG_HOST || 'localhost');
    console.error('   PG_PORT:', process.env.PG_PORT || 5432);
    console.error('   PG_DATABASE:', process.env.PG_DATABASE || 'ciphersqlstudio_app');
    // Don't exit - allow server to start but queries will fail gracefully
  });

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err.message);
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
 * REAL EXECUTION - No caching, always executes against PostgreSQL
 */
async function executeQuery(schemaName, query) {
  let client;
  const executionStart = Date.now();

  try {
    // Get client from pool with timeout handling
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('PostgreSQL connection timeout')), 10000)
      )
    ]);

    // Use a transaction so SET LOCAL search_path is scoped and reverts on release
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);

    // Execute the user's query - REAL EXECUTION
    console.log(`[REAL EXECUTION] Executing query in schema: ${schemaName}`);
    console.log(`[REAL EXECUTION] Query: ${query.substring(0, 100)}...`);

    const result = await client.query(query);
    await client.query('COMMIT');

    const executionTime = Date.now() - executionStart;
    console.log(`[REAL EXECUTION] Query executed in ${executionTime}ms, returned ${result.rows.length} rows`);

    return {
      success: true,
      rows: result.rows,
      rowCount: result.rowCount,
      columns: result.fields ? result.fields.map(f => ({ name: f.name, type: f.dataTypeID })) : [],
      executionTime: executionTime
    };
  } catch (error) {
    const executionTime = Date.now() - executionStart;
    console.error(`[REAL EXECUTION] Query failed after ${executionTime}ms:`, error.message);
    if (client) await client.query('ROLLBACK').catch(() => { });

    let errorMessage = error.message;
    if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Cannot connect to PostgreSQL database. Please check your database connection settings.';
    } else if (error.code === '28P01') {
      errorMessage = 'PostgreSQL authentication failed. Please check your database credentials.';
    } else if (error.code === '3D000') {
      errorMessage = `Database "${process.env.PG_DATABASE || 'ciphersqlstudio_app'}" does not exist. Please create it first.`;
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Database connection timeout. Please check if PostgreSQL is running.';
    }

    return {
      success: false,
      error: errorMessage,
      code: error.code,
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Initialize tables for an assignment in its schema
 */
async function initializeAssignmentTables(schemaName, sampleTables) {
  const client = await pool.connect();
  try {
    // Create schema if it doesn't exist (schema-qualified, no search_path change needed)
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

    // Use SET LOCAL so the search_path is scoped to this transaction only
    // and resets automatically when the client is returned to the pool.
    await client.query('BEGIN');
    await client.query(`SET LOCAL search_path TO "${schemaName}", public`);

    // Drop existing tables in this schema (for re-initialization)
    for (const table of sampleTables) {
      await client.query(`DROP TABLE IF EXISTS "${schemaName}"."${table.tableName}" CASCADE`);
    }

    // Create tables and insert data using schema-qualified names
    for (const table of sampleTables) {
      const columnDefinitions = table.columns.map(col => {
        const pgType = mapDataTypeToPostgreSQL(col.dataType);
        return `"${col.columnName}" ${pgType}`;
      }).join(', ');

      await client.query(`CREATE TABLE "${schemaName}"."${table.tableName}" (${columnDefinitions})`);

      if (table.rows && table.rows.length > 0) {
        const columns = table.columns.map(col => col.columnName);
        const placeholders = table.rows.map((_, i) => {
          const rowPlaceholders = columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ');
          return `(${rowPlaceholders})`;
        }).join(', ');

        const values = table.rows.flatMap(row => columns.map(col => row[col]));
        const colList = columns.map(c => `"${c}"`).join(', ');
        const insertQuery = `INSERT INTO "${schemaName}"."${table.tableName}" (${colList}) VALUES ${placeholders}`;
        await client.query(insertQuery, values);
      }
    }

    await client.query('COMMIT');
    console.log(`✅ Initialized tables for schema ${schemaName}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => { });
    console.error(`❌ Error initializing tables:`, error);
    throw error;
  } finally {
    client.release(); // search_path reverts to default because SET LOCAL was transaction-scoped
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




