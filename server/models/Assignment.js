const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema({
  columnName: { type: String, required: true },
  dataType: { type: String, required: true }
}, { _id: false });

const sampleTableSchema = new mongoose.Schema({
  tableName: { type: String, required: true },
  columns: [columnSchema],
  rows: { type: mongoose.Schema.Types.Mixed, required: true } // Flexible array of objects
}, { _id: false });

const expectedOutputSchema = new mongoose.Schema({
  type: { 
    type: String, 
    required: true,
    enum: ['table', 'single_value', 'column', 'count', 'row']
  },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { _id: false });

const testCaseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  input: { type: String, default: '' }, // SQL query to set up test data (optional)
  expectedOutput: expectedOutputSchema,
  description: { type: String }
}, { _id: false });

const assignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  difficulty: { 
    type: String, 
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  question: { type: String, required: true },
  sampleTables: [sampleTableSchema],
  expectedOutput: expectedOutputSchema,
  testCases: [testCaseSchema], // Array of test cases
  schemaName: { type: String, required: true }, // PostgreSQL schema name for this assignment
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

assignmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);


