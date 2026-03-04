const express = require('express');
const router = express.Router();
const { pool } = require('../config/postgres');

// Helper: add _id alias so the React client (built for MongoDB) works unchanged
const withMongoId = (row) => row ? { ...row, _id: String(row.id) } : row;

// ─── GET all assignments ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, difficulty, question,
              sample_tables AS "sampleTables",
              expected_output AS "expectedOutput",
              test_cases AS "testCases",
              schema_name AS "schemaName",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM assignments
       ORDER BY id ASC`
    );
    res.json(result.rows.map(withMongoId));
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET single assignment by ID ──────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, difficulty, question,
              sample_tables AS "sampleTables",
              expected_output AS "expectedOutput",
              test_cases AS "testCases",
              schema_name AS "schemaName",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
       FROM assignments WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(withMongoId(result.rows[0]));
  } catch (error) {
    console.error('Get assignment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── GET user progress for an assignment ──────────────────────────────────────
router.get('/:id/progress', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'anonymous';
    const result = await pool.query(
      `SELECT sql_query AS "sqlQuery",
              is_completed AS "isCompleted",
              attempt_count AS "attemptCount",
              last_attempt AS "lastAttempt",
              last_submission AS "lastSubmission"
       FROM user_progress
       WHERE user_id = $1 AND assignment_id = $2`,
      [userId, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.json({ sqlQuery: '', isCompleted: false, attemptCount: 0 });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST save user progress ──────────────────────────────────────────────────
router.post('/:id/progress', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'] || 'anonymous';
    const { sqlQuery, isCompleted } = req.body;

    const result = await pool.query(
      `INSERT INTO user_progress (user_id, assignment_id, sql_query, is_completed, attempt_count, last_attempt, updated_at)
       VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
       ON CONFLICT (user_id, assignment_id) DO UPDATE SET
         sql_query      = EXCLUDED.sql_query,
         is_completed   = EXCLUDED.is_completed,
         attempt_count  = user_progress.attempt_count + 1,
         last_attempt   = NOW(),
         updated_at     = NOW()
       RETURNING sql_query AS "sqlQuery",
                 is_completed AS "isCompleted",
                 attempt_count AS "attemptCount",
                 last_attempt AS "lastAttempt"`,
      [userId, req.params.id, sqlQuery || '', isCompleted || false]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
