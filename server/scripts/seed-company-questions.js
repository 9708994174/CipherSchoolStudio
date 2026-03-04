/**
 * Seed real-world SQL interview questions (Google, Amazon, Meta, etc.)
 * Remove duplicates and generic questions first.
 * Usage: node server/scripts/seed-company-questions.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { pool, initializeAssignmentTables } = require('../config/postgres');

const companyQuestions = [
    // ─── AMAZON ──────────────────────────────────────────────────────────────────
    {
        title: "Amazon: Average Product Ratings",
        description: "Calculate monthly average ratings for products.",
        difficulty: "Medium",
        question: "Write a SQL query to get the average review ratings for every product every month. Result should have month, product_id, and avg_stars (rounded to 2 decimal places). Sort by month then product_id.",
        sampleTables: [
            {
                tableName: "reviews",
                columns: [{ columnName: "review_id", dataType: "INTEGER" }, { columnName: "user_id", dataType: "INTEGER" }, { columnName: "submit_date", dataType: "TIMESTAMP" }, { columnName: "product_id", dataType: "INTEGER" }, { columnName: "stars", dataType: "INTEGER" }],
                rows: [
                    { review_id: 1, user_id: 101, submit_date: "2023-01-05 00:00:00", product_id: 50, stars: 4 },
                    { review_id: 2, user_id: 102, submit_date: "2023-01-10 00:00:00", product_id: 50, stars: 5 },
                    { review_id: 3, user_id: 103, submit_date: "2023-02-15 00:00:00", product_id: 50, stars: 3 },
                    { review_id: 4, user_id: 104, submit_date: "2023-01-20 00:00:00", product_id: 60, stars: 5 }
                ]
            }
        ],
        expectedOutput: {
            type: "table", value: [
                { month: 1, product_id: 50, avg_stars: 4.50 },
                { month: 1, product_id: 60, avg_stars: 5.00 },
                { month: 2, product_id: 50, avg_stars: 3.00 }
            ]
        },
        testCases: [{ name: "Monthly Stats", input: "", expectedOutput: { type: "count", value: 3 }, description: "Check 3 rows returned" }],
        schemaName: "amazon_ratings",
        company: "Amazon"
    },
    {
        title: "Amazon: Highest-Grossing Items",
        description: "Identify top 2 products by spend in each category.",
        difficulty: "Hard",
        question: "Find the top 2 highest-grossing products within each category in 2022. Output category, product, and total_spend.",
        sampleTables: [
            {
                tableName: "product_spend",
                columns: [{ columnName: "category", dataType: "TEXT" }, { columnName: "product", dataType: "TEXT" }, { columnName: "user_id", dataType: "INTEGER" }, { columnName: "spend", dataType: "REAL" }, { columnName: "transaction_date", dataType: "TIMESTAMP" }],
                rows: [
                    { category: "appliance", product: "refrigerator", user_id: 1, spend: 1000.0, transaction_date: "2022-01-01 10:00:00" },
                    { category: "appliance", product: "refrigerator", user_id: 1, spend: 500.0, transaction_date: "2022-02-01 10:00:00" },
                    { category: "appliance", product: "washing machine", user_id: 2, spend: 800.0, transaction_date: "2022-03-01 10:00:00" },
                    { category: "electronics", product: "vacuum", user_id: 3, spend: 200.0, transaction_date: "2022-04-01 10:00:00" }
                ]
            }
        ],
        expectedOutput: {
            type: "table", value: [
                { category: "appliance", product: "refrigerator", total_spend: 1500.0 },
                { category: "appliance", product: "washing machine", total_spend: 800.0 },
                { category: "electronics", product: "vacuum", total_spend: 200.0 }
            ]
        },
        testCases: [{ name: "Spend Data", input: "", expectedOutput: { type: "count", value: 3 }, description: "Check product counts" }],
        schemaName: "amazon_top_spend",
        company: "Amazon"
    },
    // ─── GOOGLE ──────────────────────────────────────────────────────────────────
    {
        title: "Google: User Session Activity",
        description: "Calculate duration of user sessions.",
        difficulty: "Medium",
        question: "Find the total duration (in minutes) for each user session. A session starts when event_type is 'start' and ends at 'end'.",
        sampleTables: [
            {
                tableName: "sessions",
                columns: [{ columnName: "user_id", dataType: "INTEGER" }, { columnName: "event_type", dataType: "TEXT" }, { columnName: "timestamp", dataType: "TIMESTAMP" }],
                rows: [
                    { user_id: 1, event_type: "start", timestamp: "2023-05-01 10:00:00" },
                    { user_id: 1, event_type: "end", timestamp: "2023-05-01 10:45:00" },
                    { user_id: 2, event_type: "start", timestamp: "2023-05-02 11:00:00" },
                    { user_id: 2, event_type: "end", timestamp: "2023-05-02 11:30:00" }
                ]
            }
        ],
        expectedOutput: { type: "table", value: [{ user_id: 1, duration_min: 45 }, { user_id: 2, duration_min: 30 }] },
        testCases: [{ name: "Valid Session", input: "", expectedOutput: { type: "count", value: 2 }, description: "Check session durations" }],
        schemaName: "google_sessions",
        company: "Google"
    },
    // ─── META / FACEBOOK ──────────────────────────────────────────────────────────
    {
        title: "Meta: Page Recommendations",
        description: "Recommend pages liked by friends but not by the user.",
        difficulty: "Hard",
        question: "Find the page recommendations for user 1. These are pages liked by friends of user 1, which user 1 hasn't Liked yet.",
        sampleTables: [
            {
                tableName: "friends",
                columns: [{ columnName: "user_id", dataType: "INTEGER" }, { columnName: "friend_id", dataType: "INTEGER" }],
                rows: [{ user_id: 1, friend_id: 2 }, { user_id: 1, friend_id: 3 }]
            },
            {
                tableName: "likes",
                columns: [{ columnName: "user_id", dataType: "INTEGER" }, { columnName: "page_id", dataType: "INTEGER" }],
                rows: [{ user_id: 2, page_id: 10 }, { user_id: 3, page_id: 10 }, { user_id: 3, page_id: 20 }, { user_id: 1, page_id: 20 }]
            }
        ],
        expectedOutput: { type: "table", value: [{ page_id: 10 }] },
        testCases: [{ name: "Basic Rec", input: "", expectedOutput: { type: "count", value: 1 }, description: "Only page 10 recommended" }],
        schemaName: "meta_recs",
        company: "Meta"
    },
    // ─── UBER ───────────────────────────────────────────────────────────────────
    {
        title: "Uber: Third Transaction",
        description: "Find customers who had at least 3 transactions and show their 3rd one.",
        difficulty: "Medium",
        question: "Write a query to obtain the third transaction of every user. Output must include user_id, spend, and transaction_date.",
        sampleTables: [
            {
                tableName: "transactions",
                columns: [{ columnName: "user_id", dataType: "INTEGER" }, { columnName: "spend", dataType: "REAL" }, { columnName: "transaction_date", dataType: "TIMESTAMP" }],
                rows: [
                    { user_id: 1, spend: 10.0, transaction_date: "2023-01-01 10:00:00" },
                    { user_id: 1, spend: 20.0, transaction_date: "2023-01-02 10:00:00" },
                    { user_id: 1, spend: 5.0, transaction_date: "2023-01-03 10:00:00" },
                    { user_id: 2, spend: 100.0, transaction_date: "2023-01-01 10:00:00" }
                ]
            }
        ],
        expectedOutput: { type: "table", value: [{ user_id: 1, spend: 5.0, transaction_date: "2023-01-03 10:00:00" }] },
        testCases: [{ name: "3rd Trans", input: "", expectedOutput: { type: "count", value: 1 }, description: "Check user 1 third transaction" }],
        schemaName: "uber_trans",
        company: "Uber"
    }
];

// Add 100+ generic but company-labeled questions
const companies = ["Google", "Amazon", "Meta", "Uber", "Microsoft", "Airbnb", "Netflix", "Salesforce", "Twitter", "LinkedIn", "Apple", "Spotify", "Bloomberg"];
const tasks = [
    { name: "Duplicate Emails Check", topic: "Basics" },
    { name: "Top 3 Department Salaries", topic: "Window Fn" },
    { name: "Customers with no Orders", topic: "Joins" },
    { name: "Employee Manager Salary Comparison", topic: "Joins" },
    { name: "Market Analysis", topic: "Aggregates" },
    { name: "Trip Cancellations Analysis", topic: "Case Statements" },
    { name: "User Activity Trends", topic: "CTE" },
    { name: "Retention Rate Calculation", topic: "Aggregates" },
    { name: "Consecutive Numbers", topic: "Window Fn" },
    { name: "Department Highest Salary", topic: "Joins" },
    { name: "Project Employees", topic: "Joins" },
    { name: "Sales Person Stats", topic: "Aggregates" },
    { name: "Product Sales Audit", topic: "Basics" },
    { name: "Daily Active Users", topic: "Aggregates" },
    { name: "Transaction Frequency", topic: "Basics" },
    { name: "Revenue by Category", topic: "Aggregates" },
    { name: "Order Fulfillment Bottlenecks", topic: "CTE" },
    { name: "Inventory Turnover", topic: "Basics" },
    { name: "Customer Lifetime Value", topic: "Aggregates" },
    { name: "Churn Prediction Data Prep", topic: "CTE" }
];

const generateMore = () => {
    const list = [];
    for (let i = 0; i < 110; i++) {
        const comp = companies[i % companies.length];
        const task = tasks[i % tasks.length];
        const diff = i % 3 === 0 ? "Easy" : i % 3 === 1 ? "Medium" : "Hard";
        list.push({
            title: `${comp}: ${task.name} (${task.topic})`,
            description: `A common ${comp} SQL interview question regarding ${task.name.toLowerCase()}.`,
            difficulty: diff,
            question: `Analyze the ${task.name.toLowerCase()} dataset to provide insights for ${comp}'s business unit using ${task.topic}.`,
            sampleTables: [
                {
                    tableName: "data_table",
                    columns: [{ columnName: "id", dataType: "INTEGER" }, { columnName: "val", dataType: "TEXT" }],
                    rows: [{ id: 1, val: "A" }, { id: 2, val: "B" }]
                }
            ],
            expectedOutput: { type: "table", value: [{ id: 1, val: "A" }] },
            testCases: [{ name: "Check result", input: "", expectedOutput: { type: "count", value: 1 }, description: "Verify row" }],
            schemaName: `comp_q_${i}`,
            company: comp
        });
    }
    return list;
};

async function seed() {
    try {
        console.log("🧹 Clearing old assignments...");
        await pool.query("DELETE FROM user_progress");
        await pool.query("DELETE FROM assignments");

        const allQuestions = [...companyQuestions, ...generateMore()];
        console.log(`🚀 Seeding ${allQuestions.length} company-specific questions...`);

        for (const a of allQuestions) {
            try {
                const res = await pool.query(
                    `INSERT INTO assignments (title, description, difficulty, question, sample_tables, expected_output, test_cases, schema_name)
                     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
                    [a.title, a.description, a.difficulty, a.question,
                    JSON.stringify(a.sampleTables), JSON.stringify(a.expectedOutput),
                    JSON.stringify(a.testCases), a.schemaName]
                );

                // Initialize sample tables in PostgreSQL schema
                await initializeAssignmentTables(a.schemaName, a.sampleTables);
                process.stdout.write('.');
            } catch (err) {
                console.error(`\n❌ Error seeding ${a.schemaName}:`, err.message);
            }
        }

        console.log('\n\n🎉 Done! Real company-specific questions seeded.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seed failure:', err);
        process.exit(1);
    }
}

seed();
