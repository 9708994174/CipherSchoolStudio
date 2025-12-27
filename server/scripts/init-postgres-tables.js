/**
 * Script to initialize PostgreSQL tables for all existing assignments
 * This will recreate tables even if they already exist
 * 
 * Usage: node server/scripts/init-postgres-tables.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const { initializeAssignmentTables } = require('../config/postgres');

async function initializePostgresTables() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphersqlstudio', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all assignments from MongoDB
    const assignments = await Assignment.find({});
    
    if (assignments.length === 0) {
      console.log('⚠️  No assignments found in MongoDB. Run init-sample-assignments.js first.');
      process.exit(0);
    }

    console.log(`\n📋 Found ${assignments.length} assignment(s). Initializing PostgreSQL tables...\n`);

    // Initialize PostgreSQL tables for each assignment
    for (const assignment of assignments) {
      try {
        console.log(`🔄 Initializing tables for: ${assignment.title} (schema: ${assignment.schemaName})`);
        await initializeAssignmentTables(assignment.schemaName, assignment.sampleTables);
        console.log(`✅ Successfully initialized tables for: ${assignment.title}\n`);
      } catch (error) {
        console.error(`❌ Error initializing tables for ${assignment.title}:`, error.message);
        console.error(`   Schema: ${assignment.schemaName}\n`);
      }
    }

    console.log('🎉 PostgreSQL tables initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing PostgreSQL tables:', error);
    process.exit(1);
  }
}

// Run the script
initializePostgresTables();



