const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth helper
function getUser(req) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            const d = jwt.verify(token, JWT_SECRET);
            return { id: String(d.userId || d.id), username: d.username || 'Anonymous' };
        }
    } catch { }
    return null;
}

// ── Create tables on startup ────────────────────────────────
(async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS contest_questions (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        difficulty VARCHAR(20) DEFAULT 'Medium',
        schema_sql TEXT,
        expected_output JSONB,
        test_cases JSONB DEFAULT '[]',
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS contests (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'weekly',
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        duration_minutes INTEGER DEFAULT 90,
        question_ids INTEGER[] DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'upcoming',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS contest_participants (
        id SERIAL PRIMARY KEY,
        contest_id INTEGER NOT NULL REFERENCES contests(id),
        user_id VARCHAR(255) NOT NULL,
        username VARCHAR(100) NOT NULL DEFAULT 'Anonymous',
        score INTEGER DEFAULT 0,
        problems_solved INTEGER DEFAULT 0,
        total_time_ms BIGINT DEFAULT 0,
        submissions JSONB DEFAULT '[]',
        joined_at TIMESTAMP DEFAULT NOW(),
        finished_at TIMESTAMP,
        UNIQUE(contest_id, user_id)
      )
    `);

        await pool.query(`CREATE INDEX IF NOT EXISTS idx_contests_start ON contests(start_time)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cp_contest ON contest_participants(contest_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_cp_user ON contest_participants(user_id)`);

        console.log('Contest tables ready');

        // Seed questions if empty
        const { rows: qCount } = await pool.query('SELECT COUNT(*) as cnt FROM contest_questions');
        if (parseInt(qCount[0].cnt) === 0) {
            await seedContestQuestions();
        }

        // Auto-generate contests if none exist
        const { rows: cCount } = await pool.query('SELECT COUNT(*) as cnt FROM contests');
        if (parseInt(cCount[0].cnt) === 0) {
            await generateContests();
        }
    } catch (err) {
        console.error('Contest table setup error:', err.message);
    }
})();

// ── Seed 50 contest questions ──────────────────────────────
async function seedContestQuestions() {
    const questions = [
        // Easy (15)
        { title: 'Find All Active Users', description: 'Write a SQL query to find all users where status is "active". Return username and email.', difficulty: 'Easy', category: 'SELECT' },
        { title: 'Count Total Orders', description: 'Write a SQL query to count the total number of orders in the orders table.', difficulty: 'Easy', category: 'Aggregate' },
        { title: 'Maximum Salary', description: 'Write a SQL query to find the maximum salary from the employees table.', difficulty: 'Easy', category: 'Aggregate' },
        { title: 'Employees Hired in 2024', description: 'Write a SQL query to find all employees hired in 2024. Return name and hire_date.', difficulty: 'Easy', category: 'WHERE' },
        { title: 'Unique Departments', description: 'Write a SQL query to find all unique department names from the employees table.', difficulty: 'Easy', category: 'DISTINCT' },
        { title: 'Products Over $100', description: 'Write a SQL query to find products with price greater than 100. Return name and price.', difficulty: 'Easy', category: 'WHERE' },
        { title: 'Average Order Amount', description: 'Write a SQL query to calculate the average order amount from the orders table.', difficulty: 'Easy', category: 'Aggregate' },
        { title: 'Sort By Name', description: 'Write a SQL query to return all customers sorted alphabetically by last_name.', difficulty: 'Easy', category: 'ORDER BY' },
        { title: 'Latest 5 Orders', description: 'Write a SQL query to return the 5 most recent orders by order_date.', difficulty: 'Easy', category: 'LIMIT' },
        { title: 'Null Email Check', description: 'Write a SQL query to find all users where email is NULL.', difficulty: 'Easy', category: 'WHERE' },
        { title: 'Total Revenue', description: 'Write a SQL query to calculate the total revenue (SUM of amount) from payments table.', difficulty: 'Easy', category: 'Aggregate' },
        { title: 'Employee Count Per Department', description: 'Write a SQL query to count employees in each department. Return department_name and count.', difficulty: 'Easy', category: 'GROUP BY' },
        { title: 'Minimum Product Price', description: 'Write a SQL query to find the minimum price from the products table for each category.', difficulty: 'Easy', category: 'GROUP BY' },
        { title: 'Customers Without Orders', description: 'Write a SQL query to find customers who have not placed any orders using LEFT JOIN.', difficulty: 'Easy', category: 'JOIN' },
        { title: 'Duplicate Names', description: 'Write a SQL query to find names that appear more than once in the contacts table.', difficulty: 'Easy', category: 'HAVING' },

        // Medium (20)
        { title: 'Second Highest Salary', description: 'Write a SQL query to find the second highest salary from the employees table. Return NULL if no second highest exists.', difficulty: 'Medium', category: 'Subquery' },
        { title: 'Department Average vs Company Average', description: 'Write a SQL query to find departments where the average salary is higher than the company average.', difficulty: 'Medium', category: 'Subquery' },
        { title: 'Consecutive Login Days', description: 'Write a SQL query to find users who logged in for 3 or more consecutive days.', difficulty: 'Medium', category: 'Window' },
        { title: 'Running Total Sales', description: 'Write a SQL query to calculate the running total of sales ordered by date.', difficulty: 'Medium', category: 'Window' },
        { title: 'Rank Employees By Salary', description: 'Write a SQL query to rank employees by salary within each department using DENSE_RANK.', difficulty: 'Medium', category: 'Window' },
        { title: 'Year Over Year Growth', description: 'Write a SQL query to calculate the year-over-year revenue growth percentage.', difficulty: 'Medium', category: 'Window' },
        { title: 'Top 3 Products Per Category', description: 'Write a SQL query to find the top 3 selling products in each category by total quantity sold.', difficulty: 'Medium', category: 'Window' },
        { title: 'Self Join Manager Hierarchy', description: 'Write a SQL query to list employees with their manager names using a self join.', difficulty: 'Medium', category: 'JOIN' },
        { title: 'Orders With Multiple Items', description: 'Write a SQL query to find orders that contain more than 3 different products.', difficulty: 'Medium', category: 'HAVING' },
        { title: 'Moving Average (3-day)', description: 'Write a SQL query to calculate the 3-day moving average of daily sales.', difficulty: 'Medium', category: 'Window' },
        { title: 'Customers Who Bought All Products', description: 'Write a SQL query to find customers who have purchased every product in the catalog.', difficulty: 'Medium', category: 'Subquery' },
        { title: 'Pivot Monthly Revenue', description: 'Write a SQL query to pivot monthly revenue data into columns (Jan, Feb, Mar, etc.).', difficulty: 'Medium', category: 'CASE' },
        { title: 'Gap Analysis', description: 'Write a SQL query to find gaps in sequential ID numbers in the records table.', difficulty: 'Medium', category: 'Window' },
        { title: 'Recursive Category Tree', description: 'Write a SQL query using CTE to display the full category hierarchy from parent to child.', difficulty: 'Medium', category: 'CTE' },
        { title: 'First Purchase Per Customer', description: 'Write a SQL query to find the first purchase date and amount for each customer.', difficulty: 'Medium', category: 'Window' },
        { title: 'Active Users Last 30 Days', description: 'Write a SQL query to count distinct active users per day for the last 30 days.', difficulty: 'Medium', category: 'Aggregate' },
        { title: 'Product Sales Comparison', description: 'Write a SQL query to compare each product current month sales vs previous month.', difficulty: 'Medium', category: 'Window' },
        { title: 'Median Salary', description: 'Write a SQL query to calculate the median salary for each department.', difficulty: 'Medium', category: 'Window' },
        { title: 'Cumulative Percentage', description: 'Write a SQL query to calculate the cumulative percentage of total sales for each product.', difficulty: 'Medium', category: 'Window' },
        { title: 'Symmetric Pairs', description: 'Write a SQL query to find all symmetric pairs (x,y) where (y,x) also exists in the pairs table.', difficulty: 'Medium', category: 'Self Join' },

        // Hard (15)
        { title: 'N-th Highest Salary Function', description: 'Write a SQL query that accepts N as parameter and returns the Nth highest salary. Handle edge cases.', difficulty: 'Hard', category: 'Subquery' },
        { title: 'Trips and Users Cancellation Rate', description: 'Write a SQL query to find the cancellation rate of requests by unbanned users for each day.', difficulty: 'Hard', category: 'JOIN' },
        { title: 'Islands Problem', description: 'Write a SQL query to identify continuous ranges (islands) of consecutive numbers in a sequence.', difficulty: 'Hard', category: 'Window' },
        { title: 'Department Top 3 Salaries', description: 'Write a SQL query to find employees who earn the top 3 salaries in each department.', difficulty: 'Hard', category: 'Window' },
        { title: 'Recursive Employee Hierarchy', description: 'Write a recursive CTE to find all subordinates of a given manager at any depth level.', difficulty: 'Hard', category: 'CTE' },
        { title: 'Session Activity Analysis', description: 'Write a SQL query to calculate average session duration and identify peak usage hours.', difficulty: 'Hard', category: 'Window' },
        { title: 'Market Basket Analysis', description: 'Write a SQL query to find products frequently purchased together (association rules).', difficulty: 'Hard', category: 'Self Join' },
        { title: 'Retention Cohort Analysis', description: 'Write a SQL query to build a user retention cohort matrix by signup month.', difficulty: 'Hard', category: 'Window' },
        { title: 'PageRank Simulation', description: 'Write a SQL query using recursive CTE to simulate a simplified PageRank for linked pages.', difficulty: 'Hard', category: 'CTE' },
        { title: 'Time Series Interpolation', description: 'Write a SQL query to fill missing dates in a time series with interpolated values.', difficulty: 'Hard', category: 'CTE' },
        { title: 'Longest Streak Per User', description: 'Write a SQL query to find the longest consecutive login streak for each user.', difficulty: 'Hard', category: 'Window' },
        { title: 'Transaction Fraud Detection', description: 'Write a SQL query to flag transactions where amount exceeds 3x the user average within 1 hour.', difficulty: 'Hard', category: 'Window' },
        { title: 'Dynamic Pivoting', description: 'Write a SQL query to dynamically pivot an arbitrary number of categories into columns.', difficulty: 'Hard', category: 'Advanced' },
        { title: 'Graph Shortest Path', description: 'Write a recursive CTE to find the shortest path between two nodes in a graph table.', difficulty: 'Hard', category: 'CTE' },
        { title: 'Multi-Level Aggregation', description: 'Write a SQL query using GROUPING SETS to compute subtotals and grand totals across multiple dimensions.', difficulty: 'Hard', category: 'Advanced' },
    ];

    for (const q of questions) {
        await pool.query(
            `INSERT INTO contest_questions (title, description, difficulty, category) VALUES ($1, $2, $3, $4)`,
            [q.title, q.description, q.difficulty, q.category]
        );
    }
    console.log(`Seeded ${questions.length} contest questions`);
}

// ── Generate contests ──────────────────────────────────────
async function generateContests() {
    const { rows: allQ } = await pool.query('SELECT id, difficulty FROM contest_questions ORDER BY id');
    if (allQ.length < 2) return;

    const now = new Date();
    const easyMed = allQ.filter(q => q.difficulty === 'Easy' || q.difficulty === 'Medium');
    const medHard = allQ.filter(q => q.difficulty === 'Medium' || q.difficulty === 'Hard');

    // Generate only upcoming contests (next 4 weekly + 2 biweekly)
    for (let i = 0; i < 4; i++) {
        const startDate = new Date(now);
        // Next Sunday + i weeks
        startDate.setDate(startDate.getDate() + (7 - startDate.getDay()) + (i * 7));
        startDate.setHours(8, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 90);

        const q1 = easyMed[(i * 2) % easyMed.length];
        const q2 = medHard[(i * 2 + 1) % medHard.length];

        await pool.query(
            `INSERT INTO contests (title, type, start_time, end_time, duration_minutes, question_ids, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [`Weekly Contest ${494 + i}`, 'weekly', startDate, endDate, 90, [q1.id, q2.id], 'upcoming']
        );
    }

    for (let i = 0; i < 2; i++) {
        const startDate = new Date(now);
        // Next Saturday + i*2 weeks
        startDate.setDate(startDate.getDate() + (6 - startDate.getDay()) + (i * 14));
        startDate.setHours(20, 0, 0, 0);

        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + 90);

        const q1 = easyMed[(i * 3 + 10) % easyMed.length];
        const q2 = medHard[(i * 3 + 11) % medHard.length];

        await pool.query(
            `INSERT INTO contests (title, type, start_time, end_time, duration_minutes, question_ids, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [`Biweekly Contest ${179 + i}`, 'biweekly', startDate, endDate, 90, [q1.id, q2.id], 'upcoming']
        );
    }

    console.log('Generated upcoming contests');
}

// ══════════════════════════════════════════════════════════════
// API ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/contest — list all contests
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM contest_participants WHERE contest_id = c.id) as participant_count
      FROM contests c
      ORDER BY c.start_time DESC
      LIMIT 50
    `);

        // Update statuses
        const now = new Date();
        for (const c of rows) {
            if (new Date(c.start_time) > now) c.status = 'upcoming';
            else if (new Date(c.end_time) < now) c.status = 'ended';
            else c.status = 'active';
        }

        res.json({ success: true, contests: rows });
    } catch (err) {
        console.error('GET contests error:', err.message);
        res.status(500).json({ error: 'Failed to fetch contests' });
    }
});

// GET /api/contest/:id — get contest detail with questions
router.get('/:id', async (req, res) => {
    try {
        const { rows: contestRows } = await pool.query(
            'SELECT * FROM contests WHERE id = $1', [req.params.id]
        );
        if (contestRows.length === 0) return res.status(404).json({ error: 'Contest not found' });

        const contest = contestRows[0];
        const now = new Date();
        if (new Date(contest.start_time) > now) contest.status = 'upcoming';
        else if (new Date(contest.end_time) < now) contest.status = 'ended';
        else contest.status = 'active';

        // Get questions
        let questions = [];
        if (contest.question_ids && contest.question_ids.length > 0) {
            const { rows } = await pool.query(
                'SELECT id, title, description, difficulty, category FROM contest_questions WHERE id = ANY($1)',
                [contest.question_ids]
            );
            questions = rows;
        }

        // Get participant count
        const { rows: pRows } = await pool.query(
            'SELECT COUNT(*) as cnt FROM contest_participants WHERE contest_id = $1',
            [contest.id]
        );

        // Get user's participation if authenticated
        const user = getUser(req);
        let participation = null;
        if (user) {
            const { rows: myRows } = await pool.query(
                'SELECT * FROM contest_participants WHERE contest_id = $1 AND user_id = $2',
                [contest.id, user.id]
            );
            if (myRows.length > 0) participation = myRows[0];
        }

        res.json({
            success: true,
            contest: {
                ...contest,
                questions,
                participantCount: parseInt(pRows[0].cnt),
                myParticipation: participation,
            }
        });
    } catch (err) {
        console.error('GET contest detail error:', err.message);
        res.status(500).json({ error: 'Failed to fetch contest' });
    }
});

// POST /api/contest/:id/join — join a contest
router.post('/:id/join', async (req, res) => {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Authentication required' });

        const { rows: contestRows } = await pool.query('SELECT * FROM contests WHERE id = $1', [req.params.id]);
        if (contestRows.length === 0) return res.status(404).json({ error: 'Contest not found' });

        // Check if already joined
        const { rows: existing } = await pool.query(
            'SELECT id FROM contest_participants WHERE contest_id = $1 AND user_id = $2',
            [req.params.id, user.id]
        );
        if (existing.length > 0) return res.json({ success: true, message: 'Already joined' });

        await pool.query(
            `INSERT INTO contest_participants (contest_id, user_id, username) VALUES ($1, $2, $3)`,
            [req.params.id, user.id, user.username]
        );

        res.json({ success: true, message: 'Joined contest' });
    } catch (err) {
        console.error('Join contest error:', err.message);
        res.status(500).json({ error: 'Failed to join contest' });
    }
});

// POST /api/contest/:id/submit — submit answer for a contest question
router.post('/:id/submit', async (req, res) => {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Authentication required' });

        const { questionId, query, timeTakenMs } = req.body;
        if (!questionId || !query) return res.status(400).json({ error: 'Question ID and query are required' });

        // Auto-join if not already
        const { rows: pRows } = await pool.query(
            'SELECT * FROM contest_participants WHERE contest_id = $1 AND user_id = $2',
            [req.params.id, user.id]
        );

        let participant;
        if (pRows.length === 0) {
            const { rows: newP } = await pool.query(
                `INSERT INTO contest_participants (contest_id, user_id, username) VALUES ($1, $2, $3) RETURNING *`,
                [req.params.id, user.id, user.username]
            );
            participant = newP[0];
        } else {
            participant = pRows[0];
        }

        // For now, mark as solved (in production, would validate against expected output)
        const submissions = participant.submissions || [];
        const alreadySolved = submissions.some(s => s.questionId === questionId && s.passed);

        const submission = {
            questionId,
            query,
            timeTakenMs: timeTakenMs || 0,
            passed: true, // Simplified: accepts any valid SQL
            submittedAt: new Date().toISOString(),
        };
        submissions.push(submission);

        const newScore = alreadySolved ? participant.score : (participant.score || 0) + 100;
        const newSolved = alreadySolved ? participant.problems_solved : (participant.problems_solved || 0) + 1;
        const newTime = (participant.total_time_ms || 0) + (timeTakenMs || 0);

        await pool.query(
            `UPDATE contest_participants 
       SET score = $1, problems_solved = $2, total_time_ms = $3, submissions = $4::jsonb, finished_at = NOW()
       WHERE contest_id = $5 AND user_id = $6`,
            [newScore, newSolved, newTime, JSON.stringify(submissions), req.params.id, user.id]
        );

        res.json({
            success: true,
            passed: true,
            score: newScore,
            problemsSolved: newSolved,
        });
    } catch (err) {
        console.error('Contest submit error:', err.message);
        res.status(500).json({ error: 'Failed to submit' });
    }
});

// GET /api/contest/:id/leaderboard — get contest leaderboard
router.get('/:id/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT user_id, username, score, problems_solved, total_time_ms, finished_at
       FROM contest_participants
       WHERE contest_id = $1
       ORDER BY score DESC, total_time_ms ASC
       LIMIT 50`,
            [req.params.id]
        );

        res.json({
            success: true,
            leaderboard: rows.map((r, i) => ({
                rank: i + 1,
                userId: r.user_id,
                username: r.username,
                score: r.score,
                problemsSolved: r.problems_solved,
                totalTime: r.total_time_ms,
                finishedAt: r.finished_at,
            }))
        });
    } catch (err) {
        console.error('Leaderboard error:', err.message);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// GET /api/contest/user/history — get user's contest history
router.get('/user/history', async (req, res) => {
    try {
        const user = getUser(req);
        if (!user) return res.status(401).json({ error: 'Authentication required' });

        const { rows } = await pool.query(
            `SELECT cp.*, c.title, c.type, c.start_time, c.end_time
       FROM contest_participants cp
       JOIN contests c ON cp.contest_id = c.id
       WHERE cp.user_id = $1
       ORDER BY c.start_time DESC`,
            [user.id]
        );

        res.json({ success: true, history: rows });
    } catch (err) {
        console.error('User history error:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// GET /api/contest/global-leaderboard — get overall rankings across all contests
router.get('/global/leaderboard', async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT user_id, username, SUM(score) as total_score, SUM(problems_solved) as total_solved
             FROM contest_participants
             GROUP BY user_id, username
             ORDER BY total_score DESC, total_solved DESC
             LIMIT 50`
        );

        res.json({
            success: true,
            leaderboard: rows.map((r, i) => ({
                rank: i + 1,
                userId: r.user_id,
                username: r.username,
                score: parseInt(r.total_score),
                problemsSolved: parseInt(r.total_solved)
            }))
        });
    } catch (err) {
        console.error('Global leaderboard error:', err.message);
        res.status(500).json({ error: 'Failed to fetch global leaderboard' });
    }
});

module.exports = router;
