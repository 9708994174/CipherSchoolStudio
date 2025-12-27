const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/postgres');
const Assignment = require('../models/Assignment');
const UserProgress = require('../models/UserProgress');

// Helper function to compare query results
function compareResults(actual, expected, type) {
  if (type === 'table') {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      return false;
    }
    if (actual.length !== expected.length) {
      return false;
    }
    
    // Sort both arrays by first column for comparison
    const sortByFirstColumn = (arr) => {
      if (arr.length === 0) return arr;
      const firstKey = Object.keys(arr[0])[0];
      return [...arr].sort((a, b) => {
        if (a[firstKey] < b[firstKey]) return -1;
        if (a[firstKey] > b[firstKey]) return 1;
        return 0;
      });
    };
    
    const sortedActual = sortByFirstColumn(actual);
    const sortedExpected = sortByFirstColumn(expected);
    
    return JSON.stringify(sortedActual) === JSON.stringify(sortedExpected);
  } else if (type === 'count') {
    // For count, compare the length of actual results
    const actualCount = Array.isArray(actual) ? actual.length : parseInt(actual);
    const expectedCount = Array.isArray(expected) ? expected.length : parseInt(expected);
    return actualCount === expectedCount;
  } else if (type === 'single_value') {
    return actual === expected || String(actual) === String(expected);
  }
  return false;
}

// Sanitize query (same as in query.js)
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

// Submit and validate query against test cases
router.post('/', [
  body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
  body('query').notEmpty().withMessage('SQL query is required'),
  body('userId').notEmpty().withMessage('User ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { assignmentId, query, userId } = req.body;
    
    // Get assignment
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
    
    // Execute query
    const result = await executeQuery(assignment.schemaName, sanitizedQuery);
    
    if (!result.success) {
      return res.status(200).json({
        success: false,
        passed: false,
        error: result.error,
        testResults: [],
        complexity: {
          executionTime: Date.now(),
          queryLength: query.length,
          rowCount: 0,
          hasJoins: false,
          hasSubqueries: false,
          hasAggregates: false
        }
      });
    }
    
    // Validate against test cases if they exist
    const testResults = [];
    let allPassed = true;
    
    if (assignment.testCases && assignment.testCases.length > 0) {
      for (const testCase of assignment.testCases) {
        try {
          // Execute the test case query
          const testResult = await executeQuery(assignment.schemaName, sanitizedQuery);
          
          if (testResult.success) {
            const passed = compareResults(
              testResult.rows,
              testCase.expectedOutput.value,
              testCase.expectedOutput.type
            );
            
            testResults.push({
              name: testCase.name,
              passed,
              description: testCase.description
            });
            
            if (!passed) {
              allPassed = false;
            }
          } else {
            testResults.push({
              name: testCase.name,
              passed: false,
              error: testResult.error
            });
            allPassed = false;
          }
        } catch (error) {
          testResults.push({
            name: testCase.name,
            passed: false,
            error: error.message
          });
          allPassed = false;
        }
      }
    } else {
      // If no test cases, validate against expected output
      if (assignment.expectedOutput) {
        const passed = compareResults(
          result.rows,
          assignment.expectedOutput.value,
          assignment.expectedOutput.type
        );
        allPassed = passed;
        testResults.push({
          name: 'Default Test',
          passed,
          description: 'Validates against expected output'
        });
      } else {
        // No validation, just check if query executed successfully
        allPassed = result.success;
        testResults.push({
          name: 'Execution Test',
          passed: result.success,
          description: 'Query executed successfully'
        });
      }
    }
    
    // Calculate complexity metrics
    const complexity = {
      executionTime: Date.now(), // Simple timestamp, can be enhanced
      queryLength: query.length,
      rowCount: result.rowCount || 0,
      hasJoins: sanitizedQuery.toUpperCase().includes('JOIN'),
      hasSubqueries: sanitizedQuery.toUpperCase().includes('SELECT') && 
                     (sanitizedQuery.match(/SELECT/gi) || []).length > 1,
      hasAggregates: /(COUNT|SUM|AVG|MAX|MIN|GROUP BY)/i.test(sanitizedQuery)
    };
    
    // Save submission
    const submission = {
      assignmentId,
      userId,
      query: sanitizedQuery,
      passed: allPassed,
      testResults,
      complexity,
      submittedAt: new Date()
    };
    
    // Update or create user progress
    await UserProgress.findOneAndUpdate(
      { userId, assignmentId },
      {
        userId,
        assignmentId,
        sqlQuery: sanitizedQuery,
        lastAttempt: new Date(),
        isCompleted: allPassed,
        $inc: { attemptCount: 1 },
        lastSubmission: submission
      },
      { upsert: true, new: true }
    );
    
    res.json({
      success: true,
      passed: allPassed,
      testResults,
      complexity,
      result: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;

