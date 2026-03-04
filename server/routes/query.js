const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { pool, executeQuery } = require('../config/postgres');

// Security: Only allow SELECT / WITH queries
function sanitizeQuery(query) {
  const dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT',
    'UPDATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
  ];
  const upperQuery = query.toUpperCase().trim();
  for (const keyword of dangerousKeywords) {
    if (upperQuery.startsWith(keyword)) {
      throw new Error(`Operation not allowed: ${keyword} statements are not permitted`);
    }
  }
  if (!upperQuery.startsWith('SELECT') && !upperQuery.startsWith('WITH')) {
    throw new Error('Only SELECT and WITH (CTE) statements are allowed');
  }
  return query;
}

// Execute SQL query
router.post('/execute', [
  body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
  body('query').notEmpty().withMessage('SQL query is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { assignmentId, query } = req.body;

    // Get assignment from PostgreSQL
    const aResult = await pool.query(
      'SELECT schema_name AS "schemaName" FROM assignments WHERE id = $1',
      [assignmentId]
    );
    if (aResult.rows.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    const schemaName = aResult.rows[0].schemaName;

    // Sanitize query
    let sanitizedQuery;
    try {
      sanitizedQuery = sanitizeQuery(query);
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }

    // Execute query in the assignment's PostgreSQL schema
    const result = await executeQuery(schemaName, sanitizedQuery);
    res.json(result);
  } catch (error) {
    console.error('Error in query execution:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

module.exports = router;
