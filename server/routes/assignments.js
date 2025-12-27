const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const UserProgress = require('../models/UserProgress');

// Get all assignments
router.get('/', async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ createdAt: -1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a single assignment by ID
router.get('/:id', async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user progress for an assignment
router.get('/:id/progress', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'] || 'anonymous';
    const progress = await UserProgress.findOne({
      userId,
      assignmentId: req.params.id
    });
    
    if (!progress) {
      return res.json({
        sqlQuery: '',
        isCompleted: false,
        attemptCount: 0
      });
    }
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save user progress
router.post('/:id/progress', async (req, res) => {
  try {
    const userId = req.body.userId || req.headers['x-user-id'] || 'anonymous';
    const { sqlQuery, isCompleted } = req.body;
    
    const progress = await UserProgress.findOneAndUpdate(
      { userId, assignmentId: req.params.id },
      {
        sqlQuery: sqlQuery || '',
        isCompleted: isCompleted || false,
        $inc: { attemptCount: 1 },
        lastAttempt: new Date()
      },
      { upsert: true, new: true }
    );
    
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;



