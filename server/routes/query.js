const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/postgres');
const Assignment = require('../models/Assignment');

// Security: Basic SQL injection prevention
function sanitizeQuery(query) {
  // Remove dangerous SQL keywords that could modify schema or data
  const dangerousKeywords = [
    'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 'INSERT', 
    'UPDATE', 'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
  ];
  
  const upperQuery = query.toUpperCase().trim();
  
  // Check if query starts with dangerous keywords
  for (const keyword of dangerousKeywords) {
    if (upperQuery.startsWith(keyword)) {
      throw new Error(`Operation not allowed: ${keyword} statements are not permitted`);
    }
  }
  
  // Only allow SELECT statements
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
    
    // Get assignment to find schema name
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Sanitize query
    let sanitizedQuery;
    try {
      sanitizedQuery = sanitizeQuery(query);
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }
    
    // Execute query in the assignment's schema
    const result = await executeQuery(assignment.schemaName, sanitizedQuery);
    
    res.json(result);
  } catch (error) {
    console.error('Error in query execution:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;





