const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { executeQuery } = require('../config/postgres');
const Assignment = require('../models/Assignment');
const UserProgress = require('../models/UserProgress');
const { optionalAuth } = require('../middleware/auth');

// Helper function to normalize values for comparison
function normalizeValue(value) {
  if (value === null || value === undefined) return null;
  
  // Handle BigInt first (PostgreSQL may return integers as BigInt)
  if (typeof value === 'bigint') {
    return Number(value);
  }
  
  if (typeof value === 'number') {
    // Handle NaN and Infinity
    if (isNaN(value) || !isFinite(value)) return value;
    // Round to 6 decimal places for floating point comparison
    if (value % 1 !== 0) {
      return Math.round(value * 1000000) / 1000000;
    }
    return value;
  }
  
  if (typeof value === 'boolean') return value;
  
  if (typeof value === 'string') {
    // Trim whitespace and normalize
    const trimmed = value.trim();
    // PostgreSQL may return numbers as strings, especially for aggregate functions
    // Try to detect if it's a numeric string
    if (trimmed !== '' && !isNaN(trimmed) && trimmed !== 'NaN') {
      const numVal = Number(trimmed);
      // If it's a valid number, return as number for comparison
      if (!isNaN(numVal) && isFinite(numVal)) {
        return numVal % 1 === 0 ? numVal : Math.round(numVal * 1000000) / 1000000;
      }
    }
    return trimmed;
  }
  
  if (value instanceof Date) {
    return value.toISOString();
  }
  
  return value;
}

// Helper function to normalize an object (row) for comparison
function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  // Sort keys to ensure consistent comparison (case-insensitive)
  const sortedKeys = Object.keys(row).sort((a, b) => 
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  for (const key of sortedKeys) {
    // Use lowercase key for comparison to handle case differences
    const normalizedKey = key.toLowerCase();
    normalized[normalizedKey] = normalizeValue(row[key]);
  }
  return normalized;
}

/**
 * Compare query results with expected output
 * 
 * Handles all test case types:
 * - 'table': Compares full result sets (order-agnostic, case-insensitive columns)
 * - 'count': Compares count values (handles COUNT(*), GROUP BY COUNT, etc.)
 * - 'single_value': Compares single values (handles MAX, MIN, AVG results)
 * - 'column': Compares column values as arrays
 * - 'row': Compares single row
 * 
 * Features:
 * - Order-agnostic row matching (SQL doesn't guarantee order without ORDER BY)
 * - Case-insensitive column name matching
 * - Flexible type conversion (string "123" vs number 123)
 * - Floating point tolerance (0.01 for AVG, SUM with decimals)
 * - Handles PostgreSQL BigInt returns
 * - Extracts count from aggregate function results
 */
function compareResults(actual, expected, type) {
  try {
    if (type === 'table') {
      if (!Array.isArray(actual) || !Array.isArray(expected)) {
        console.log('Type mismatch: actual or expected is not an array');
        return false;
      }
      if (actual.length !== expected.length) {
        console.log(`Row count mismatch: actual=${actual.length}, expected=${expected.length}`);
        return false;
      }
      
      if (actual.length === 0 && expected.length === 0) {
        return true;
      }
      
      // Normalize all rows first
      const normalizedActual = actual.map(normalizeRow);
      const normalizedExpected = expected.map(normalizeRow);
      
      // Create a stable sort key for each row
      const createSortKey = (row) => {
        const keys = Object.keys(row).sort();
        return keys.map(key => `${key}:${String(row[key])}`).join('|');
      };
      
      // Determine if we should preserve order or sort
      // For queries with ORDER BY, we might want to preserve order, but for flexibility,
      // we'll make it order-agnostic unless the expected output explicitly requires order
      // (which we'll detect by checking if expected is already sorted)
      
      // Sort both arrays using the sort key (more robust sorting)
      // This makes comparison order-agnostic for most cases
      // For ORDER BY queries, if the user's query has ORDER BY, results will be ordered,
      // but we'll still match flexibly
      const sortedActual = [...normalizedActual].sort((a, b) => {
        const keyA = createSortKey(a);
        const keyB = createSortKey(b);
        // Use localeCompare for better string sorting
        const compare = keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
        return compare;
      });
      
      const sortedExpected = [...normalizedExpected].sort((a, b) => {
        const keyA = createSortKey(a);
        const keyB = createSortKey(b);
        const compare = keyA.localeCompare(keyB, undefined, { numeric: true, sensitivity: 'base' });
        return compare;
      });
      
      // Use a more flexible matching approach - find matching rows instead of position-based
      // This handles cases where row order might differ (SQL doesn't guarantee order without ORDER BY)
      const matchedExpected = new Set();
      
      // Compare each actual row with expected rows
      for (let i = 0; i < sortedActual.length; i++) {
        const actualRow = sortedActual[i];
        let rowMatched = false;
        let matchedExpectedIndex = -1;
        
        // Try to find a matching expected row
        for (let j = 0; j < sortedExpected.length; j++) {
          if (matchedExpected.has(j)) continue; // Skip already matched rows
          
          const expectedRow = sortedExpected[j];
          
          // Quick check: if row keys don't match in count, skip
          const actualKeys = Object.keys(actualRow).sort();
          const expectedKeys = Object.keys(expectedRow).sort();
          
          // We only care about expected columns - actual can have extra columns
          const actualKeysLower = new Set(actualKeys.map(k => k.toLowerCase()));
          const expectedKeysLower = new Set(expectedKeys.map(k => k.toLowerCase()));
          
          // Check if all expected columns exist in actual (case-insensitive)
          // Also handle aggregate function aliases
          let allExpectedColumnsExist = true;
          for (const expectedKey of expectedKeys) {
            const expectedKeyLower = expectedKey.toLowerCase();
            
            // First check exact match
            if (actualKeysLower.has(expectedKeyLower)) {
              continue; // Found exact match
            }
            
            // If no exact match, check for aggregate function aliases
            const aggregateNames = ['count', 'sum', 'avg', 'average', 'max', 'min'];
            const isSimpleAggregate = aggregateNames.includes(expectedKeyLower);
            
            if (isSimpleAggregate) {
              // Check if any actual key ends with the aggregate name
              const found = Array.from(actualKeysLower).some(ak => 
                ak === expectedKeyLower || ak.endsWith('_' + expectedKeyLower)
              );
              if (found) {
                continue; // Found aggregate alias match
              }
            }
            
            // Also handle reverse: actual key might be aggregate alias matching expected
            // e.g., average_price (actual) should match avg_price (expected)
            if (expectedKeyLower.includes('avg_') && !expectedKeyLower.includes('average_')) {
              // Expected has 'avg_', try to find actual with 'average_'
              const expectedWithAverage = expectedKeyLower.replace('avg_', 'average_');
              if (actualKeysLower.has(expectedWithAverage)) {
                continue; // Found aggregate alias match
              }
            } else if (expectedKeyLower.includes('average_') && !expectedKeyLower.includes('avg_')) {
              // Expected has 'average_', try to find actual with 'avg_'
              const expectedWithAvg = expectedKeyLower.replace('average_', 'avg_');
              if (actualKeysLower.has(expectedWithAvg)) {
                continue; // Found aggregate alias match
              }
            }
            
            // No match found
            allExpectedColumnsExist = false;
            break;
          }
          
          if (!allExpectedColumnsExist) {
            continue; // Try next expected row
          }
          
          // Create a mapping from expected keys to actual keys (case-insensitive)
          // Also handle aggregate function aliases (e.g., product_count, total_count, etc. should match count)
          const keyMapping = {};
          for (const expectedKey of expectedKeys) {
            const expectedKeyLower = expectedKey.toLowerCase();
            
            // First try exact match (case-insensitive)
            let matchingActualKey = actualKeys.find(ak => ak.toLowerCase() === expectedKeyLower);
            
            // If no exact match, try to match aggregate function aliases
            // Common patterns: count, product_count, total_count, order_count, etc.
            if (!matchingActualKey) {
              // Check if expected key is a simple aggregate name (count, sum, avg, max, min)
              const aggregateNames = ['count', 'sum', 'avg', 'average', 'max', 'min'];
              const isSimpleAggregate = aggregateNames.includes(expectedKeyLower);
              
              if (isSimpleAggregate) {
                // Try to find actual key that ends with the aggregate name
                // e.g., product_count should match count, total_sum should match sum
                // Pattern: *_count, *_sum, etc. or just count, sum, etc.
                matchingActualKey = actualKeys.find(ak => {
                  const akLower = ak.toLowerCase();
                  // Exact match or ends with _aggregateName
                  return akLower === expectedKeyLower || 
                         akLower.endsWith('_' + expectedKeyLower);
                });
              }
              
              // Also handle reverse: actual key might be aggregate alias matching expected
              // e.g., average_price (actual) should match avg_price (expected)
              if (!matchingActualKey) {
                // Handle avg vs average aliases
                if (expectedKeyLower.includes('avg_') && !expectedKeyLower.includes('average_')) {
                  // Expected has 'avg_', try to find actual with 'average_'
                  const expectedWithAverage = expectedKeyLower.replace('avg_', 'average_');
                  matchingActualKey = actualKeys.find(ak => ak.toLowerCase() === expectedWithAverage);
                } else if (expectedKeyLower.includes('average_') && !expectedKeyLower.includes('avg_')) {
                  // Expected has 'average_', try to find actual with 'avg_'
                  const expectedWithAvg = expectedKeyLower.replace('average_', 'avg_');
                  matchingActualKey = actualKeys.find(ak => ak.toLowerCase() === expectedWithAvg);
                }
              }
            }
            
            if (matchingActualKey) {
              keyMapping[expectedKey] = matchingActualKey;
            }
          }
          
          // Check if all values match (using key mapping for case-insensitive column names)
          let allValuesMatch = true;
          for (const expectedKey of expectedKeys) {
            const actualKey = keyMapping[expectedKey];
            if (!actualKey) {
              allValuesMatch = false;
              break;
            }
            
            // Normalize both values for proper comparison (handles string "2" vs number 2, etc.)
            const actualVal = normalizeValue(actualRow[actualKey]);
            const expectedVal = normalizeValue(expectedRow[expectedKey]);
            
            // More flexible comparison
            let valuesMatch = false;
            
            // Handle null/undefined
            if ((actualVal === null || actualVal === undefined) && 
                (expectedVal === null || expectedVal === undefined)) {
              valuesMatch = true;
            }
            // Exact match (after normalization)
            else if (actualVal === expectedVal) {
              valuesMatch = true;
            }
            // String comparison (case-insensitive, trimmed) - for non-numeric strings
            else if (typeof actualVal === 'string' && typeof expectedVal === 'string') {
              valuesMatch = actualVal.trim().toLowerCase() === expectedVal.trim().toLowerCase();
            }
            // Number comparison (with tolerance for floating point)
            else if (typeof actualVal === 'number' && typeof expectedVal === 'number') {
              // More lenient floating point comparison (increased tolerance for AVG, etc.)
              if (actualVal % 1 === 0 && expectedVal % 1 === 0) {
                // Both are integers - exact match
                valuesMatch = actualVal === expectedVal;
              } else {
                // At least one is floating point - use tolerance
                valuesMatch = Math.abs(actualVal - expectedVal) < 0.01;
              }
            }
            // If normalization converted one to number and other is still different type
            // This shouldn't happen often after normalization, but handle it anyway
            else {
              // Try converting both to numbers one more time (fallback)
              const numActual = Number(actualVal);
              const numExpected = Number(expectedVal);
              if (!isNaN(numActual) && !isNaN(numExpected)) {
                // Compare numbers with tolerance
                if (numActual % 1 === 0 && numExpected % 1 === 0) {
                  valuesMatch = numActual === numExpected;
                } else {
                  valuesMatch = Math.abs(numActual - numExpected) < 0.01;
                }
              }
              // If number conversion didn't work, try BigInt
              if (!valuesMatch) {
                try {
                  const bigActual = BigInt(actualVal);
                  const bigExpected = BigInt(expectedVal);
                  valuesMatch = bigActual === bigExpected;
                } catch (e) {
                  // Not BigInt compatible
                }
              }
            }
            
            if (!valuesMatch) {
              allValuesMatch = false;
              break;
            }
          }
          
          if (allValuesMatch) {
            rowMatched = true;
            matchedExpectedIndex = j;
            break; // Found matching row
          }
        }
        
        if (!rowMatched) {
          console.log(`Row ${i} from actual results could not be matched with any expected row`);
          console.log('Actual row:', JSON.stringify(actualRow, null, 2));
          console.log('Available expected rows:', sortedExpected.map((r, idx) => 
            matchedExpected.has(idx) ? `[MATCHED] Row ${idx}` : `Row ${idx}: ${JSON.stringify(r)}`
          ));
          return false;
        }
        
        // Mark this expected row as matched
        matchedExpected.add(matchedExpectedIndex);
      }
      
      // Check if all expected rows were matched
      if (matchedExpected.size !== sortedExpected.length) {
        console.log(`Not all expected rows were matched. Matched: ${matchedExpected.size}, Expected: ${sortedExpected.length}`);
        return false;
      }
      
      return true;
    } else if (type === 'count') {
      // For count, compare the length of actual results or the count value itself
      let actualCount;
      let expectedCount;
      
      // Handle actual result - could be:
      // 1. Array of rows (use length)
      // 2. Single row with count column (extract count)
      // 3. Number directly
      // 4. Object with count property
      if (Array.isArray(actual)) {
        if (actual.length === 0) {
          actualCount = 0;
        } else if (actual.length === 1 && typeof actual[0] === 'object' && actual[0] !== null) {
          // Single row result - check for count column
          const firstRow = actual[0];
          const countKey = Object.keys(firstRow).find(k => 
            k.toLowerCase() === 'count' || 
            k.toLowerCase().endsWith('count') ||
            k.toLowerCase().startsWith('count')
          );
          if (countKey) {
            actualCount = Number(firstRow[countKey]) || 0;
          } else {
            // No count column found, use array length
            actualCount = actual.length;
          }
        } else {
          // Multiple rows - check if any row has a count column matching expected
          // This handles cases like "verify Electronics has 3 products" 
          // where the query returns multiple category rows
          const firstRow = actual[0];
          if (typeof firstRow === 'object' && firstRow !== null) {
            const countKey = Object.keys(firstRow).find(k => 
              k.toLowerCase() === 'count' || 
              k.toLowerCase().endsWith('count') ||
              k.toLowerCase().startsWith('count')
            );
            if (countKey && typeof expected === 'number') {
              // Try to find a row with count matching expected value
              const matchingRow = actual.find(row => 
                Number(row[countKey]) === expected
              );
              if (matchingRow) {
                actualCount = expected;
              } else {
                // No matching count found, use array length
                actualCount = actual.length;
              }
            } else {
              // No count column or expected is not a number, use array length
              actualCount = actual.length;
            }
          } else {
            actualCount = actual.length;
          }
        }
      } else if (typeof actual === 'number') {
        actualCount = actual;
      } else if (typeof actual === 'object' && actual !== null) {
        // Object with count property (case-insensitive)
        const countKey = Object.keys(actual).find(k => 
          k.toLowerCase() === 'count' || 
          k.toLowerCase().endsWith('count') ||
          k.toLowerCase().startsWith('count')
        );
        actualCount = countKey ? Number(actual[countKey]) : (actual.length || 0);
      } else {
        actualCount = parseInt(actual) || 0;
      }
      
      // Handle expected result
      if (Array.isArray(expected)) {
        expectedCount = expected.length;
      } else if (typeof expected === 'number') {
        expectedCount = expected;
      } else if (typeof expected === 'object' && expected !== null) {
        const countKey = Object.keys(expected).find(k => 
          k.toLowerCase() === 'count' || 
          k.toLowerCase().endsWith('count') ||
          k.toLowerCase().startsWith('count')
        );
        expectedCount = countKey ? Number(expected[countKey]) : (expected.length || 0);
      } else {
        expectedCount = parseInt(expected) || 0;
      }
      
      console.log(`Count comparison: actual=${actualCount} (from ${Array.isArray(actual) ? 'array' : typeof actual}), expected=${expectedCount}`);
      return actualCount === expectedCount;
    } else if (type === 'single_value') {
      // Handle single value - could be from a single row result or direct value
      let actualValue = actual;
      let expectedValue = expected;
      
      // If actual is an array with one row, extract the value
      if (Array.isArray(actual) && actual.length > 0) {
        const firstRow = actual[0];
        if (typeof firstRow === 'object' && firstRow !== null) {
          // If it's an object, try to find a numeric or single value
          const keys = Object.keys(firstRow);
          if (keys.length === 1) {
            actualValue = firstRow[keys[0]];
          } else {
            // Multiple columns - try to find a value that matches expected
            // This handles cases like MAX(salary) which might return {max_salary: 80000}
            for (const key of keys) {
              const val = firstRow[key];
              const normalizedVal = normalizeValue(val);
              const normalizedExpected = normalizeValue(expected);
              if (normalizedVal === normalizedExpected || 
                  String(normalizedVal) === String(normalizedExpected) ||
                  (typeof normalizedVal === 'number' && typeof normalizedExpected === 'number' && 
                   Math.abs(normalizedVal - normalizedExpected) < 0.01)) {
                return true;
              }
            }
            // If no match found, compare the whole row
            actualValue = firstRow;
          }
        } else {
          actualValue = firstRow;
        }
      }
      
      const normalizedActual = normalizeValue(actualValue);
      const normalizedExpected = normalizeValue(expectedValue);
      
      // Exact match
      if (normalizedActual === normalizedExpected) return true;
      
      // String comparison (case-insensitive)
      if (String(normalizedActual).trim().toLowerCase() === String(normalizedExpected).trim().toLowerCase()) {
        return true;
      }
      
      // Number comparison
      const numActual = Number(normalizedActual);
      const numExpected = Number(normalizedExpected);
      if (!isNaN(numActual) && !isNaN(numExpected)) {
        if (numActual % 1 === 0 && numExpected % 1 === 0) {
          return numActual === numExpected;
        } else {
          // More lenient tolerance for floating point (handles AVG, etc.)
          return Math.abs(numActual - numExpected) < 0.01; // Increased tolerance to 0.01
        }
      }
      
      return false;
    } else if (type === 'column') {
      // For column type, compare as arrays
      const actualArr = Array.isArray(actual) ? actual : [actual];
      const expectedArr = Array.isArray(expected) ? expected : [expected];
      if (actualArr.length !== expectedArr.length) return false;
      
      const normalizedActual = actualArr.map(normalizeValue).sort();
      const normalizedExpected = expectedArr.map(normalizeValue).sort();
      
      return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
    } else if (type === 'row') {
      // For single row comparison
      const normalizedActual = normalizeRow(actual);
      const normalizedExpected = normalizeRow(expected);
      return JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected);
    }
    return false;
  } catch (error) {
    console.error('Error in compareResults:', error);
    return false;
  }
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
router.post('/', optionalAuth, [
  body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
  body('query').notEmpty().withMessage('SQL query is required'),
  body('userId').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { assignmentId, query } = req.body;
    // Use authenticated user ID if available, otherwise use provided userId
    const userId = req.userId || req.body.userId || 'anonymous';
    
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
          // If test case has setup input query, execute it first
          if (testCase.input && testCase.input.trim()) {
            try {
              await executeQuery(assignment.schemaName, testCase.input);
              console.log(`Setup query executed for test: ${testCase.name}`);
            } catch (setupError) {
              console.warn(`Setup query failed for test ${testCase.name}:`, setupError.message);
              // Continue with test even if setup fails
            }
          }
          
          // Execute the test case query - REAL TIME EXECUTION
          console.log(`\n=== Executing REAL query for test: ${testCase.name} ===`);
          console.log('Query:', sanitizedQuery);
          console.log('Schema:', assignment.schemaName);
          
          const testResult = await executeQuery(assignment.schemaName, sanitizedQuery);
          
          console.log('Query execution result:', {
            success: testResult.success,
            rowCount: testResult.rows?.length || 0,
            hasError: !!testResult.error
          });
          
          if (testResult.success) {
            // REAL VALIDATION - Compare actual results with expected
            const passed = compareResults(
              testResult.rows,
              testCase.expectedOutput.value,
              testCase.expectedOutput.type
            );
            
            // Debug logging - always log for debugging
            console.log(`\n=== Testing: ${testCase.name} ===`);
            console.log('Type:', testCase.expectedOutput.type);
            console.log('Actual rows count:', testResult.rows.length);
            console.log('Expected rows count:', Array.isArray(testCase.expectedOutput.value) ? testCase.expectedOutput.value.length : 'N/A');
            console.log('Actual (first row):', JSON.stringify(testResult.rows[0] || {}, null, 2));
            console.log('Expected (first row):', JSON.stringify(Array.isArray(testCase.expectedOutput.value) ? testCase.expectedOutput.value[0] : testCase.expectedOutput.value, null, 2));
            console.log('Actual result (full):', JSON.stringify(testResult.rows, null, 2));
            console.log('Expected result (full):', JSON.stringify(testCase.expectedOutput.value, null, 2));
            
            if (!passed) {
              console.log('❌ TEST FAILED');
              console.log('Full Actual:', JSON.stringify(testResult.rows, null, 2));
              console.log('Full Expected:', JSON.stringify(testCase.expectedOutput.value, null, 2));
            } else {
              console.log('✅ TEST PASSED');
            }
            
            // Create detailed test result
            const testResultData = {
              name: testCase.name,
              passed, // Real validation result
              description: testCase.description,
              actual: testResult.rows,
              expected: testCase.expectedOutput.value
            };
            
            // Add helpful error message if test failed
            if (!passed) {
              // Try to identify the issue
              let errorMessage = 'Test case validation failed. ';
              
              if (Array.isArray(testResult.rows) && Array.isArray(testCase.expectedOutput.value)) {
                if (testResult.rows.length !== testCase.expectedOutput.value.length) {
                  errorMessage += `Row count mismatch: got ${testResult.rows.length}, expected ${testCase.expectedOutput.value.length}. `;
                } else {
                  errorMessage += 'Row data does not match expected values. ';
                }
              } else if (testCase.expectedOutput.type === 'count') {
                const actualCount = Array.isArray(testResult.rows) ? testResult.rows.length : testResult.rows;
                errorMessage += `Count mismatch: got ${actualCount}, expected ${testCase.expectedOutput.value}. `;
              } else {
                errorMessage += 'Output does not match expected result. ';
              }
              
              testResultData.error = errorMessage.trim();
              allPassed = false;
            }
            
            testResults.push(testResultData);
          } else {
            testResults.push({
              name: testCase.name,
              passed: false,
              description: testCase.description,
              error: testResult.error
            });
            allPassed = false;
          }
        } catch (error) {
          testResults.push({
            name: testCase.name,
            passed: false,
            description: testCase.description,
            error: error.message
          });
          allPassed = false;
        }
      }
    } else {
      // If no test cases, validate against expected output
      if (assignment.expectedOutput) {
        console.log('\n=== Validating against expectedOutput (no test cases defined) ===');
        console.log('Expected output type:', assignment.expectedOutput.type);
        console.log('Actual rows count:', result.rows.length);
        console.log('Expected rows count:', Array.isArray(assignment.expectedOutput.value) ? assignment.expectedOutput.value.length : 'N/A');
        console.log('Actual (first row):', JSON.stringify(result.rows[0] || {}, null, 2));
        console.log('Expected (first row):', JSON.stringify(Array.isArray(assignment.expectedOutput.value) ? assignment.expectedOutput.value[0] : assignment.expectedOutput.value, null, 2));
        
        const passed = compareResults(
          result.rows,
          assignment.expectedOutput.value,
          assignment.expectedOutput.type
        );
        
        console.log(passed ? '✅ VALIDATION PASSED' : '❌ VALIDATION FAILED');
        console.log('Full Actual:', JSON.stringify(result.rows, null, 2));
        console.log('Full Expected:', JSON.stringify(assignment.expectedOutput.value, null, 2));
        
        allPassed = passed;
        
        const testResultData = {
          name: 'Default Test',
          passed,
          description: 'Validates against expected output',
          actual: result.rows,
          expected: assignment.expectedOutput.value
        };
        
        if (!passed) {
          let errorMessage = 'Validation failed. ';
          if (Array.isArray(result.rows) && Array.isArray(assignment.expectedOutput.value)) {
            if (result.rows.length !== assignment.expectedOutput.value.length) {
              errorMessage += `Row count mismatch: got ${result.rows.length}, expected ${assignment.expectedOutput.value.length}. `;
            } else {
              errorMessage += 'Row data does not match expected values. ';
            }
          }
          testResultData.error = errorMessage.trim();
        }
        
        testResults.push(testResultData);
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
    
    // Save submission with real results
    const submission = {
      assignmentId,
      userId,
      query: sanitizedQuery,
      passed: allPassed, // Real validation result
      testResults,
      complexity,
      submittedAt: new Date()
    };
    
    // Update or create user progress with real completion status
    await UserProgress.findOneAndUpdate(
      { userId, assignmentId },
      {
        userId,
        assignmentId,
        sqlQuery: sanitizedQuery,
        lastAttempt: new Date(),
        isCompleted: allPassed, // Real completion status
        $inc: { attemptCount: 1 },
        lastSubmission: submission
      },
      { upsert: true, new: true }
    );
    
    // Return real validation results
    res.json({
      success: true,
      passed: allPassed, // Real validation result
      testResults,
      complexity,
      result: result.rows,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Error in submit route:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

