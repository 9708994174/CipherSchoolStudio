const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // Can be sessionId for non-auth users
  assignmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Assignment',
    required: true 
  },
  sqlQuery: { type: String, default: '' },
  lastAttempt: { type: Date, default: Date.now },
  isCompleted: { type: Boolean, default: false },
  attemptCount: { type: Number, default: 0 },
  lastSubmission: { type: mongoose.Schema.Types.Mixed }
}, {
  timestamps: true
});

// Index for faster queries
userProgressSchema.index({ userId: 1, assignmentId: 1 });

module.exports = mongoose.model('UserProgress', userProgressSchema);


