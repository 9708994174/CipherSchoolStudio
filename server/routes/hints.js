const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Assignment = require('../models/Assignment');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate a fallback hint based on assignment difficulty and question
 */
function generateFallbackHint(assignment, userQuery) {
  const difficulty = assignment.difficulty.toLowerCase();
  const hasQuery = userQuery && userQuery.trim().length > 0;
  
  let hint = '';
  
  if (difficulty === 'easy') {
    hint = hasQuery 
      ? `For this easy problem, review your SELECT statement. Make sure you're selecting the correct columns and using the right table names. Check if you need to use WHERE clause to filter results.`
      : `Start by identifying which table(s) contain the data you need. Use SELECT to choose the columns, and consider if you need WHERE to filter rows.`;
  } else if (difficulty === 'medium') {
    hint = hasQuery
      ? `For this medium problem, you might need to use JOINs to combine data from multiple tables, or use aggregate functions like COUNT, SUM, AVG. Review your query structure and ensure all necessary tables are included.`
      : `This problem likely requires combining data from multiple tables using JOINs, or using aggregate functions. Identify the relationships between tables first.`;
  } else {
    hint = hasQuery
      ? `For this hard problem, you may need complex JOINs, subqueries, or window functions. Review your query logic step by step. Consider breaking it down into smaller parts.`
      : `This is a challenging problem. Start by understanding the relationships between tables. You may need multiple JOINs, subqueries, or advanced SQL functions.`;
  }
  
  // Add specific hints based on question content
  const questionLower = assignment.question.toLowerCase();
  if (questionLower.includes('count') || questionLower.includes('number')) {
    hint += ' Consider using COUNT() function.';
  }
  if (questionLower.includes('sum') || questionLower.includes('total')) {
    hint += ' Consider using SUM() function.';
  }
  if (questionLower.includes('average') || questionLower.includes('avg')) {
    hint += ' Consider using AVG() function.';
  }
  if (questionLower.includes('join') || questionLower.includes('multiple')) {
    hint += ' You may need to JOIN multiple tables.';
  }
  if (questionLower.includes('group') || questionLower.includes('each')) {
    hint += ' Consider using GROUP BY clause.';
  }
  if (questionLower.includes('order') || questionLower.includes('sort')) {
    hint += ' Use ORDER BY to sort your results.';
  }
  
  return hint;
}

/**
 * Generate a hint using LLM
 * Critical: The prompt must guide the LLM to provide hints, not solutions
 */
async function generateHint(assignment, userQuery) {
  // Try OpenAI first if API key is available
  if (process.env.OPENAI_API_KEY) {
    console.log('🤖 Using OpenAI API for hint generation');
    const prompt = `You are a SQL learning assistant. Your role is to provide helpful HINTS to guide students, NOT to give complete solutions.

Assignment Question: ${assignment.question}

Assignment Description: ${assignment.description}

Difficulty Level: ${assignment.difficulty}

Sample Tables Available:
${assignment.sampleTables.map(table => {
  return `Table: ${table.tableName}
Columns: ${table.columns.map(col => `${col.columnName} (${col.dataType})`).join(', ')}`;
}).join('\n\n')}

Student's Current Query:
${userQuery || '(No query submitted yet)'}

IMPORTANT INSTRUCTIONS:
1. Provide a HINT that guides the student toward the solution, but do NOT write the complete SQL query
2. Focus on concepts, SQL functions, or approaches they should consider
3. If the query is close to correct, point out what might be missing or incorrect
4. If the query is completely wrong, suggest which SQL concepts they should review
5. Keep the hint concise (2-3 sentences maximum)
6. Do NOT include any actual SQL code in your response
7. Encourage the student to think through the problem

Provide your hint now:`;

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful SQL learning assistant. You provide hints and guidance, never complete solutions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });
      
      const aiHint = completion.choices[0].message.content.trim();
      console.log('✅ OpenAI hint generated successfully');
      return aiHint;
    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);
      console.log('🔄 Falling back to built-in hints');
      // Fall back to basic hints if OpenAI fails
      return generateFallbackHint(assignment, userQuery);
    }
  }
  
  // Use fallback hints if OpenAI is not configured
  console.log('📝 Using built-in fallback hints (OpenAI API key not configured)');
  return generateFallbackHint(assignment, userQuery);
}

// Get hint for an assignment
router.post('/', [
  body('assignmentId').notEmpty().withMessage('Assignment ID is required'),
  body('query').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    
    const { assignmentId, query } = req.body;
    
    // Get assignment
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    // Generate hint (will use fallback if OpenAI is not configured)
    const hint = await generateHint(assignment, query || '');
    
    // Include hint source in response for debugging
    const hintSource = process.env.OPENAI_API_KEY ? 'openai' : 'built-in';
    
    res.json({ 
      hint,
      source: hintSource // Optional: helps frontend know which source was used
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



