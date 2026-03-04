/**
 * Seed 100+ SQL assignments into PostgreSQL
 * Usage: node server/scripts/seed-100-questions-pg.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, initializeAssignmentTables } = require('../config/postgres');

const themes = [
    { name: 'Ecommerce', tables: ['products', 'orders', 'order_items', 'customers'] },
    { name: 'HR', tables: ['employees', 'departments', 'salaries', 'projects'] },
    { name: 'Hospital', tables: ['patients', 'doctors', 'appointments', 'treatments'] },
    { name: 'Library', tables: ['books', 'authors', 'borrowers', 'loans'] },
    { name: 'SocialMedia', tables: ['users', 'posts', 'comments', 'likes'] },
    { name: 'Finance', tables: ['accounts', 'transactions', 'branches', 'loans'] }
];

const difficulties = ['Easy', 'Medium', 'Hard'];

function generateQuestions() {
    const list = [];

    // Ecommerce - 20 questions
    for (let i = 1; i <= 20; i++) {
        list.push({
            title: `Ecommerce Analysis ${i}`,
            description: `Querying ecommerce data - Level ${i}`,
            difficulty: i <= 7 ? 'Easy' : i <= 15 ? 'Medium' : 'Hard',
            question: `Calculate something for the ${i}${i == 1 ? 'st' : i == 2 ? 'nd' : i == 3 ? 'rd' : 'th'} ecommerce scenario.`,
            sampleTables: [
                {
                    tableName: "products",
                    columns: [{ columnName: "id", dataType: "INTEGER" }, { columnName: "name", dataType: "TEXT" }, { columnName: "price", dataType: "REAL" }],
                    rows: [{ id: 101, name: "Product A", price: 50.0 }, { id: 102, name: "Product B", price: 30.0 }]
                },
                {
                    tableName: "orders",
                    columns: [{ columnName: "id", dataType: "INTEGER" }, { columnName: "customer_id", dataType: "INTEGER" }, { columnName: "amount", dataType: "REAL" }],
                    rows: [{ id: 1, customer_id: 501, amount: 100.0 }, { id: 2, customer_id: 502, amount: 200.0 }]
                }
            ],
            expectedOutput: { type: "table", value: [{ id: 1, amount: 100.0 }] },
            testCases: [{ name: "Case 1", input: "", expectedOutput: { type: "count", value: 1 }, description: "Check count" }],
            schemaName: `ecommerce_v${i}`
        });
    }

    // HR - 20 questions
    for (let i = 1; i <= 20; i++) {
        list.push({
            title: `HR System Query ${i}`,
            description: `Managing employee records - Task ${i}`,
            difficulty: i <= 8 ? 'Easy' : i <= 16 ? 'Medium' : 'Hard',
            question: `Analyze employee performance or salary for case ${i}.`,
            sampleTables: [
                {
                    tableName: "employees",
                    columns: [{ columnName: "emp_id", dataType: "INTEGER" }, { columnName: "name", dataType: "TEXT" }, { columnName: "salary", dataType: "INTEGER" }],
                    rows: [{ emp_id: 1, name: "Alice", salary: 50000 }, { emp_id: 2, name: "Bob", salary: 60000 }]
                }
            ],
            expectedOutput: { type: "table", value: [{ emp_id: 2, salary: 60000 }] },
            testCases: [{ name: "Test 1", input: "", expectedOutput: { type: "count", value: 1 }, description: "Check count" }],
            schemaName: `hr_task_${i}`
        });
    }

    // Social Media - 30 questions
    for (let i = 1; i <= 30; i++) {
        list.push({
            title: `Social Feed Logic ${i}`,
            description: `Interactions and engagement analysis - Part ${i}`,
            difficulty: i <= 10 ? 'Easy' : i <= 22 ? 'Medium' : 'Hard',
            question: `Find trending posts or active users for scenario ${i}.`,
            sampleTables: [
                {
                    tableName: "posts",
                    columns: [{ columnName: "id", dataType: "INTEGER" }, { columnName: "user_id", dataType: "INTEGER" }, { columnName: "content", dataType: "TEXT" }],
                    rows: [{ id: 1001, user_id: 1, content: "Hello world" }, { id: 1002, user_id: 2, content: "SQL is fun" }]
                }
            ],
            expectedOutput: { type: "table", value: [{ id: 1002, content: "SQL is fun" }] },
            testCases: [{ name: "Case 1", input: "", expectedOutput: { type: "count", value: 1 }, description: "Check count" }],
            schemaName: `social_v${i}`
        });
    }

    // Financial Analysis - 30 questions
    for (let i = 1; i <= 30; i++) {
        list.push({
            title: `Banking Report ${i}`,
            description: `Transaction and account audits - Level ${i}`,
            difficulty: i <= 10 ? 'Easy' : i <= 20 ? 'Medium' : 'Hard',
            question: `Detect suspicious transactions or calculate balance for report ${i}.`,
            sampleTables: [
                {
                    tableName: "transactions",
                    columns: [{ columnName: "id", dataType: "INTEGER" }, { columnName: "acc_id", dataType: "INTEGER" }, { columnName: "amount", dataType: "REAL" }],
                    rows: [{ id: 99, acc_id: 10, amount: -500.0 }, { id: 100, acc_id: 10, amount: 1500.0 }]
                }
            ],
            expectedOutput: { type: "table", value: [{ acc_id: 10, balance: 1000.0 }] },
            testCases: [{ name: "Test case", input: "", expectedOutput: { type: "count", value: 1 }, description: "Check count" }],
            schemaName: `finance_rep_${i}`
        });
    }

    return list;
}

const mapDataTypeToPostgreSQL = (type) => {
    switch (type.toUpperCase()) {
        case 'INTEGER':
        case 'INT':
            return 'INTEGER';
        case 'REAL':
        case 'FLOAT':
        case 'DOUBLE':
            return 'DOUBLE PRECISION';
        case 'TEXT':
        case 'STRING':
            return 'TEXT';
        case 'BOOLEAN':
        case 'BOOL':
            return 'BOOLEAN';
        case 'TIMESTAMP':
        case 'DATE':
            return 'TIMESTAMP';
        default:
            return 'TEXT';
    }
};

async function ensureAssignmentsTable() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy','Medium','Hard')),
      question TEXT NOT NULL,
      sample_tables JSONB NOT NULL DEFAULT '[]',
      expected_output JSONB NOT NULL DEFAULT '{}',
      test_cases JSONB NOT NULL DEFAULT '[]',
      schema_name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
    console.log('✅ Tables ensured: assignments');
}

async function seed() {
    try {
        await ensureAssignmentsTable();
        const assignments = generateQuestions();
        console.log(`🚀 Starting seeding of ${assignments.length} assignments...`);

        for (const a of assignments) {
            try {
                // Check if exists
                const existing = await pool.query('SELECT id FROM assignments WHERE schema_name = $1', [a.schemaName]);

                if (existing.rows.length > 0) {
                    await pool.query(
                        `UPDATE assignments SET title=$1, description=$2, difficulty=$3, question=$4,
                         sample_tables=$5, expected_output=$6, test_cases=$7, updated_at=NOW()
                         WHERE schema_name=$8`,
                        [a.title, a.description, a.difficulty, a.question,
                        JSON.stringify(a.sampleTables), JSON.stringify(a.expectedOutput),
                        JSON.stringify(a.testCases), a.schemaName]
                    );
                } else {
                    await pool.query(
                        `INSERT INTO assignments (title, description, difficulty, question, sample_tables, expected_output, test_cases, schema_name)
                         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
                        [a.title, a.description, a.difficulty, a.question,
                        JSON.stringify(a.sampleTables), JSON.stringify(a.expectedOutput),
                        JSON.stringify(a.testCases), a.schemaName]
                    );

                    // Init schema and tables
                    await initializeAssignmentTables(a.schemaName, a.sampleTables);
                }
                process.stdout.write('.');
            } catch (err) {
                console.error(`\n❌ Failed at ${a.schemaName}:`, err.message);
            }
        }

        console.log('\n\n🎉 Seeding completed successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Global seed failure:', err);
        process.exit(1);
    }
}

seed();
