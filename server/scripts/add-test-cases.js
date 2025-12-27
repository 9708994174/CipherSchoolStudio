require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');

// Test cases for each assignment
const testCasesMap = {
  "assignment_2": [
    {
      name: "Test Case 1: Users older than 25",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
          { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 }
        ]
      },
      description: "Verify only users with age > 25 are returned"
    },
    {
      name: "Test Case 2: Correct count",
      input: "",
      expectedOutput: {
        type: "count",
        value: 2
      },
      description: "Verify exactly 2 users are returned"
    }
  ],
  "assignment_4": [
    {
      name: "Test Case 1: Correct category counts",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { category: "Electronics", count: 3 },
          { category: "Furniture", count: 2 }
        ]
      },
      description: "Verify correct count for each category"
    },
    {
      name: "Test Case 2: Electronics count",
      input: "",
      expectedOutput: {
        type: "count",
        value: 3
      },
      description: "Verify Electronics category has 3 products"
    }
  ],
  "assignment_5": [
    {
      name: "Test Case 1: Maximum salary value",
      input: "",
      expectedOutput: {
        type: "single_value",
        value: 80000
      },
      description: "Verify the maximum salary is 80000"
    }
  ],
  "assignment_6": [
    {
      name: "Test Case 1: Join results",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { order_id: 1, customer_name: "John Doe", product_name: "Laptop", quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_name: "Mouse", quantity: 1 },
          { order_id: 3, customer_name: "Bob Johnson", product_name: "Laptop", quantity: 1 }
        ]
      },
      description: "Verify orders are joined with product names correctly"
    }
  ],
  "assignment_7": [
    {
      name: "Test Case 1: Total order value",
      input: "",
      expectedOutput: {
        type: "single_value",
        value: 2029.97
      },
      description: "Verify total order value is calculated correctly"
    }
  ],
  "assignment_8": [
    {
      name: "Test Case 1: Above average salary",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { id: 1, name: "Alice", department: "IT", salary: 75000 },
          { id: 3, name: "Charlie", department: "IT", salary: 80000 },
          { id: 4, name: "Diana", department: "Finance", salary: 70000 }
        ]
      },
      description: "Verify employees with above average salary are returned"
    }
  ],
  "assignment_9": [
    {
      name: "Test Case 1: Category average prices",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { category: "Electronics", avg_price: 369.99 },
          { category: "Furniture", avg_price: 249.99 }
        ]
      },
      description: "Verify average prices are calculated correctly for each category"
    }
  ],
  "assignment_10": [
    {
      name: "Test Case 1: Customers with multiple orders",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { customer_name: "John Doe", order_count: 3 }
        ]
      },
      description: "Verify customers with multiple orders are identified"
    }
  ],
  "assignment_11": [
    {
      name: "Test Case 1: Top 3 products",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { product_id: 101, product_name: "Laptop", total_sales: 5 },
          { product_id: 102, product_name: "Mouse", total_sales: 3 },
          { product_id: 103, product_name: "Keyboard", total_sales: 1 }
        ]
      },
      description: "Verify top 3 products by sales are returned"
    }
  ],
  "assignment_12": [
    {
      name: "Test Case 1: Highest salary per department",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { department: "IT", name: "Charlie", salary: 80000 },
          { department: "HR", name: "Bob", salary: 60000 },
          { department: "Finance", name: "Diana", salary: 70000 }
        ]
      },
      description: "Verify highest salary employee in each department"
    }
  ],
  "assignment_13": [
    {
      name: "Test Case 1: Running total calculation",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { order_id: 1, customer_name: "John Doe", order_value: 1999.98, running_total: 1999.98 },
          { order_id: 2, customer_name: "Jane Smith", order_value: 29.99, running_total: 2029.97 }
        ]
      },
      description: "Verify running total is calculated correctly"
    }
  ],
  "assignment_15": [
    {
      name: "Test Case 1: Department statistics",
      input: "",
      expectedOutput: {
        type: "table",
        value: [
          { department: "IT", min_salary: 75000, max_salary: 80000, avg_salary: 77666.67 },
          { department: "HR", min_salary: 55000, max_salary: 60000, avg_salary: 57500 },
          { department: "Finance", min_salary: 70000, max_salary: 72000, avg_salary: 71000 }
        ]
      },
      description: "Verify department salary statistics are calculated correctly"
    }
  ]
};

async function addTestCases() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphersqlstudio', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    for (const [schemaName, testCases] of Object.entries(testCasesMap)) {
      const assignment = await Assignment.findOne({ schemaName });
      if (assignment) {
        if (!assignment.testCases || assignment.testCases.length === 0) {
          assignment.testCases = testCases;
          await assignment.save();
          console.log(`✅ Added ${testCases.length} test cases to "${assignment.title}"`);
        } else {
          console.log(`⏭️  "${assignment.title}" already has ${assignment.testCases.length} test cases`);
        }
      } else {
        console.log(`❌ Assignment with schema "${schemaName}" not found`);
      }
    }

    console.log('\n🎉 Test cases added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding test cases:', error);
    process.exit(1);
  }
}

addTestCases();

