/**
 * Script to initialize sample assignments in MongoDB
 * Run this script after setting up MongoDB connection
 * 
 * Usage: node server/scripts/init-sample-assignments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Assignment = require('../models/Assignment');
const { initializeAssignmentTables } = require('../config/postgres');

// Sample assignments data
const sampleAssignments = [
  // EASY ASSIGNMENTS
  {
    title: "Find All Users",
    description: "A simple query to retrieve all records from a table",
    difficulty: "Easy",
    question: "Write a SQL query to select all columns and all rows from the users table.",
    sampleTables: [
      {
        tableName: "users",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "email", dataType: "TEXT" },
          { columnName: "age", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "John Doe", email: "john@example.com", age: 25 },
          { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
          { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { id: 1, name: "John Doe", email: "john@example.com", age: 25 },
        { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: All rows returned",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { id: 1, name: "John Doe", email: "john@example.com", age: 25 },
            { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
            { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 }
          ]
        },
        description: "Verify all users are returned"
      },
      {
        name: "Test Case 2: Correct number of rows",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify exactly 3 rows are returned"
      }
    ],
    schemaName: "assignment_1"
  },
  {
    title: "Filter Users by Age",
    description: "Learn to use WHERE clause for filtering data",
    difficulty: "Easy",
    question: "Write a SQL query to select all users who are older than 25 years.",
    sampleTables: [
      {
        tableName: "users",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "email", dataType: "TEXT" },
          { columnName: "age", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "John Doe", email: "john@example.com", age: 25 },
          { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
          { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 },
          { id: 4, name: "Alice Brown", email: "alice@example.com", age: 22 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { id: 2, name: "Jane Smith", email: "jane@example.com", age: 30 },
        { id: 3, name: "Bob Johnson", email: "bob@example.com", age: 28 }
      ]
    },
    testCases: [
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
    schemaName: "assignment_2"
  },
  {
    title: "Sort Employees by Salary",
    description: "Practice using ORDER BY clause",
    difficulty: "Easy",
    question: "Write a SQL query to select all employees and sort them by salary in descending order.",
    sampleTables: [
      {
        tableName: "employees",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "department", dataType: "TEXT" },
          { columnName: "salary", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "Alice", department: "IT", salary: 75000 },
          { id: 2, name: "Bob", department: "HR", salary: 60000 },
          { id: 3, name: "Charlie", department: "IT", salary: 80000 },
          { id: 4, name: "Diana", department: "Finance", salary: 70000 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { id: 3, name: "Charlie", department: "IT", salary: 80000 },
        { id: 1, name: "Alice", department: "IT", salary: 75000 },
        { id: 4, name: "Diana", department: "Finance", salary: 70000 },
        { id: 2, name: "Bob", department: "HR", salary: 60000 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Correct sorting",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { id: 3, name: "Charlie", department: "IT", salary: 80000 },
            { id: 1, name: "Alice", department: "IT", salary: 75000 },
            { id: 4, name: "Diana", department: "Finance", salary: 70000 },
            { id: 2, name: "Bob", department: "HR", salary: 60000 }
          ]
        },
        description: "Verify employees are sorted by salary in descending order"
      },
      {
        name: "Test Case 2: Correct row count",
        input: "",
        expectedOutput: {
          type: "count",
          value: 4
        },
        description: "Verify all 4 employees are returned"
      }
    ],
    schemaName: "assignment_3"
  },
  {
    title: "Count Products by Category",
    description: "Learn to use COUNT aggregate function",
    difficulty: "Easy",
    question: "Write a SQL query to count the number of products in each category.",
    sampleTables: [
      {
        tableName: "products",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "category", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { id: 1, name: "Laptop", category: "Electronics", price: 999.99 },
          { id: 2, name: "Mouse", category: "Electronics", price: 29.99 },
          { id: 3, name: "Desk", category: "Furniture", price: 299.99 },
          { id: 4, name: "Chair", category: "Furniture", price: 199.99 },
          { id: 5, name: "Keyboard", category: "Electronics", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { category: "Electronics", count: 3 },
        { category: "Furniture", count: 2 }
      ]
    },
    testCases: [
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
    schemaName: "assignment_4"
  },
  {
    title: "Find Maximum Salary",
    description: "Practice using MAX aggregate function",
    difficulty: "Easy",
    question: "Write a SQL query to find the maximum salary from the employees table.",
    sampleTables: [
      {
        tableName: "employees",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "salary", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "Alice", salary: 75000 },
          { id: 2, name: "Bob", salary: 60000 },
          { id: 3, name: "Charlie", salary: 80000 },
          { id: 4, name: "Diana", salary: 70000 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { max_salary: 80000 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Maximum salary value",
        input: "",
        expectedOutput: {
          type: "single_value",
          value: 80000
        },
        description: "Verify the maximum salary is 80000"
      },
      {
        name: "Test Case 2: Result is a single value",
        input: "",
        expectedOutput: {
          type: "count",
          value: 1
        },
        description: "Verify query returns exactly one row"
      }
    ],
    schemaName: "assignment_5"
  },

  // MEDIUM ASSIGNMENTS
  {
    title: "Join Orders and Products",
    description: "Practice JOIN operations to combine data from multiple tables",
    difficulty: "Medium",
    question: "Write a SQL query to retrieve all orders with their product names. Show order_id, customer_name, product_name, and quantity.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 1 },
          { order_id: 3, customer_name: "Bob Johnson", product_id: 101, quantity: 3 }
        ]
      },
      {
        tableName: "products",
        columns: [
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "product_name", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { product_id: 101, product_name: "Laptop", price: 999.99 },
          { product_id: 102, product_name: "Mouse", price: 29.99 },
          { product_id: 103, product_name: "Keyboard", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { order_id: 1, customer_name: "John Doe", product_name: "Laptop", quantity: 2 },
        { order_id: 2, customer_name: "Jane Smith", product_name: "Mouse", quantity: 1 },
        { order_id: 3, customer_name: "Bob Johnson", product_name: "Laptop", quantity: 3 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: All orders with product names",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { order_id: 1, customer_name: "John Doe", product_name: "Laptop", quantity: 2 },
            { order_id: 2, customer_name: "Jane Smith", product_name: "Mouse", quantity: 1 },
            { order_id: 3, customer_name: "Bob Johnson", product_name: "Laptop", quantity: 3 }
          ]
        },
        description: "Verify all orders are joined with product names"
      },
      {
        name: "Test Case 2: Correct row count",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify exactly 3 orders are returned"
      }
    ],
    schemaName: "assignment_6"
  },
  {
    title: "Calculate Total Order Value",
    description: "Practice JOIN with aggregate functions",
    difficulty: "Medium",
    question: "Write a SQL query to calculate the total value (price * quantity) for each order. Show order_id, customer_name, and total_value.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 1 },
          { order_id: 3, customer_name: "Bob Johnson", product_id: 101, quantity: 3 }
        ]
      },
      {
        tableName: "products",
        columns: [
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "product_name", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { product_id: 101, product_name: "Laptop", price: 999.99 },
          { product_id: 102, product_name: "Mouse", price: 29.99 },
          { product_id: 103, product_name: "Keyboard", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { order_id: 1, customer_name: "John Doe", total_value: 1999.98 },
        { order_id: 2, customer_name: "Jane Smith", total_value: 29.99 },
        { order_id: 3, customer_name: "Bob Johnson", total_value: 2999.97 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Correct total values",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { order_id: 1, customer_name: "John Doe", total_value: 1999.98 },
            { order_id: 2, customer_name: "Jane Smith", total_value: 29.99 },
            { order_id: 3, customer_name: "Bob Johnson", total_value: 2999.97 }
          ]
        },
        description: "Verify total value is calculated correctly for each order"
      },
      {
        name: "Test Case 2: All orders included",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify all 3 orders are returned"
      }
    ],
    schemaName: "assignment_7"
  },
  {
    title: "Find Employees with Above Average Salary",
    description: "Practice subqueries and aggregate functions",
    difficulty: "Medium",
    question: "Write a SQL query to find all employees who earn more than the average salary.",
    sampleTables: [
      {
        tableName: "employees",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "department", dataType: "TEXT" },
          { columnName: "salary", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "Alice", department: "IT", salary: 75000 },
          { id: 2, name: "Bob", department: "HR", salary: 60000 },
          { id: 3, name: "Charlie", department: "IT", salary: 80000 },
          { id: 4, name: "Diana", department: "Finance", salary: 70000 },
          { id: 5, name: "Eve", department: "HR", salary: 55000 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { id: 1, name: "Alice", department: "IT", salary: 75000 },
        { id: 3, name: "Charlie", department: "IT", salary: 80000 },
        { id: 4, name: "Diana", department: "Finance", salary: 70000 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Employees above average salary",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { id: 1, name: "Alice", department: "IT", salary: 75000 },
            { id: 3, name: "Charlie", department: "IT", salary: 80000 },
            { id: 4, name: "Diana", department: "Finance", salary: 70000 }
          ]
        },
        description: "Verify only employees with salary above average are returned"
      },
      {
        name: "Test Case 2: Correct count",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify exactly 3 employees are returned"
      }
    ],
    schemaName: "assignment_8"
  },
  {
    title: "Group Products by Category with Average Price",
    description: "Practice GROUP BY with aggregate functions",
    difficulty: "Medium",
    question: "Write a SQL query to show each category with the average price of products in that category.",
    sampleTables: [
      {
        tableName: "products",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "category", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { id: 1, name: "Laptop", category: "Electronics", price: 999.99 },
          { id: 2, name: "Mouse", category: "Electronics", price: 29.99 },
          { id: 3, name: "Desk", category: "Furniture", price: 299.99 },
          { id: 4, name: "Chair", category: "Furniture", price: 199.99 },
          { id: 5, name: "Keyboard", category: "Electronics", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { category: "Electronics", avg_price: 369.99 },
        { category: "Furniture", avg_price: 249.99 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Correct average prices",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { category: "Electronics", avg_price: 369.99 },
            { category: "Furniture", avg_price: 249.99 }
          ]
        },
        description: "Verify average price is calculated correctly for each category"
      },
      {
        name: "Test Case 2: All categories included",
        input: "",
        expectedOutput: {
          type: "count",
          value: 2
        },
        description: "Verify both categories are returned"
      }
    ],
    schemaName: "assignment_9"
  },
  {
    title: "Find Customers with Multiple Orders",
    description: "Practice GROUP BY with HAVING clause",
    difficulty: "Medium",
    question: "Write a SQL query to find customers who have placed more than 1 order. Show customer_name and order_count.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 1 },
          { order_id: 3, customer_name: "John Doe", product_id: 103, quantity: 1 },
          { order_id: 4, customer_name: "Bob Johnson", product_id: 101, quantity: 3 },
          { order_id: 5, customer_name: "John Doe", product_id: 102, quantity: 2 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { customer_name: "John Doe", order_count: 3 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Customers with multiple orders",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { customer_name: "John Doe", order_count: 3 }
          ]
        },
        description: "Verify only customers with more than 1 order are returned"
      },
      {
        name: "Test Case 2: Correct order count",
        input: "",
        expectedOutput: {
          type: "count",
          value: 1
        },
        description: "Verify exactly 1 customer is returned"
      }
    ],
    schemaName: "assignment_10"
  },

  // HARD ASSIGNMENTS
  {
    title: "Find Top 3 Products by Sales",
    description: "Practice complex JOINs with aggregation and LIMIT",
    difficulty: "Hard",
    question: "Write a SQL query to find the top 3 products by total quantity sold. Show product_name and total_quantity.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 5 },
          { order_id: 3, customer_name: "Bob Johnson", product_id: 101, quantity: 3 },
          { order_id: 4, customer_name: "Alice Brown", product_id: 103, quantity: 1 },
          { order_id: 5, customer_name: "Charlie Wilson", product_id: 102, quantity: 4 }
        ]
      },
      {
        tableName: "products",
        columns: [
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "product_name", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { product_id: 101, product_name: "Laptop", price: 999.99 },
          { product_id: 102, product_name: "Mouse", price: 29.99 },
          { product_id: 103, product_name: "Keyboard", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { product_name: "Mouse", total_quantity: 9 },
        { product_name: "Laptop", total_quantity: 5 },
        { product_name: "Keyboard", total_quantity: 1 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Top 3 products by sales",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { product_name: "Mouse", total_quantity: 9 },
            { product_name: "Laptop", total_quantity: 5 },
            { product_name: "Keyboard", total_quantity: 1 }
          ]
        },
        description: "Verify top 3 products by total quantity are returned in descending order"
      },
      {
        name: "Test Case 2: Exactly 3 products",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify exactly 3 products are returned"
      }
    ],
    schemaName: "assignment_11"
  },
  {
    title: "Find Employees with Highest Salary in Each Department",
    description: "Practice window functions or correlated subqueries",
    difficulty: "Hard",
    question: "Write a SQL query to find the employee(s) with the highest salary in each department. Show department, name, and salary.",
    sampleTables: [
      {
        tableName: "employees",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "department", dataType: "TEXT" },
          { columnName: "salary", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "Alice", department: "IT", salary: 75000 },
          { id: 2, name: "Bob", department: "HR", salary: 60000 },
          { id: 3, name: "Charlie", department: "IT", salary: 80000 },
          { id: 4, name: "Diana", department: "Finance", salary: 70000 },
          { id: 5, name: "Eve", department: "HR", salary: 55000 },
          { id: 6, name: "Frank", department: "Finance", salary: 72000 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { department: "IT", name: "Charlie", salary: 80000 },
        { department: "HR", name: "Bob", salary: 60000 },
        { department: "Finance", name: "Frank", salary: 72000 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Highest salary per department",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { department: "IT", name: "Charlie", salary: 80000 },
            { department: "HR", name: "Bob", salary: 60000 },
            { department: "Finance", name: "Frank", salary: 72000 }
          ]
        },
        description: "Verify employee with highest salary in each department is returned"
      },
      {
        name: "Test Case 2: One per department",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify exactly 3 employees (one per department) are returned"
      }
    ],
    schemaName: "assignment_12"
  },
  {
    title: "Calculate Running Total of Sales",
    description: "Practice window functions for cumulative calculations",
    difficulty: "Hard",
    question: "Write a SQL query to calculate the running total of order values. Show order_id, customer_name, order_value, and running_total.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 1 },
          { order_id: 3, customer_name: "Bob Johnson", product_id: 101, quantity: 3 }
        ]
      },
      {
        tableName: "products",
        columns: [
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "product_name", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { product_id: 101, product_name: "Laptop", price: 999.99 },
          { product_id: 102, product_name: "Mouse", price: 29.99 },
          { product_id: 103, product_name: "Keyboard", price: 79.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { order_id: 1, customer_name: "John Doe", order_value: 1999.98, running_total: 1999.98 },
        { order_id: 2, customer_name: "Jane Smith", order_value: 29.99, running_total: 2029.97 },
        { order_id: 3, customer_name: "Bob Johnson", order_value: 2999.97, running_total: 5029.94 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Correct running totals",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { order_id: 1, customer_name: "John Doe", order_value: 1999.98, running_total: 1999.98 },
            { order_id: 2, customer_name: "Jane Smith", order_value: 29.99, running_total: 2029.97 },
            { order_id: 3, customer_name: "Bob Johnson", order_value: 2999.97, running_total: 5029.94 }
          ]
        },
        description: "Verify running total is calculated correctly for each order"
      },
      {
        name: "Test Case 2: All orders included",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify all 3 orders are returned"
      }
    ],
    schemaName: "assignment_13"
  },
  {
    title: "Find Products Not Ordered",
    description: "Practice LEFT JOIN and NULL checks",
    difficulty: "Medium",
    question: "Write a SQL query to find all products that have never been ordered. Show product_id and product_name.",
    sampleTables: [
      {
        tableName: "orders",
        columns: [
          { columnName: "order_id", dataType: "INTEGER" },
          { columnName: "customer_name", dataType: "TEXT" },
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "quantity", dataType: "INTEGER" }
        ],
        rows: [
          { order_id: 1, customer_name: "John Doe", product_id: 101, quantity: 2 },
          { order_id: 2, customer_name: "Jane Smith", product_id: 102, quantity: 1 },
          { order_id: 3, customer_name: "Bob Johnson", product_id: 101, quantity: 3 }
        ]
      },
      {
        tableName: "products",
        columns: [
          { columnName: "product_id", dataType: "INTEGER" },
          { columnName: "product_name", dataType: "TEXT" },
          { columnName: "price", dataType: "REAL" }
        ],
        rows: [
          { product_id: 101, product_name: "Laptop", price: 999.99 },
          { product_id: 102, product_name: "Mouse", price: 29.99 },
          { product_id: 103, product_name: "Keyboard", price: 79.99 },
          { product_id: 104, product_name: "Monitor", price: 299.99 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { product_id: 103, product_name: "Keyboard" },
        { product_id: 104, product_name: "Monitor" }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Products with no orders",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { product_id: 103, product_name: "Keyboard" },
            { product_id: 104, product_name: "Monitor" }
          ]
        },
        description: "Verify products that have never been ordered are returned"
      },
      {
        name: "Test Case 2: Correct product IDs",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { product_id: 103, product_name: "Keyboard" },
            { product_id: 104, product_name: "Monitor" }
          ]
        },
        description: "Verify correct product IDs (103 and 104) are returned"
      }
    ],
    schemaName: "assignment_14"
  },
  {
    title: "Calculate Department Salary Statistics",
    description: "Practice multiple aggregate functions with GROUP BY",
    difficulty: "Hard",
    question: "Write a SQL query to show each department with the minimum, maximum, and average salary. Show department, min_salary, max_salary, and avg_salary.",
    sampleTables: [
      {
        tableName: "employees",
        columns: [
          { columnName: "id", dataType: "INTEGER" },
          { columnName: "name", dataType: "TEXT" },
          { columnName: "department", dataType: "TEXT" },
          { columnName: "salary", dataType: "INTEGER" }
        ],
        rows: [
          { id: 1, name: "Alice", department: "IT", salary: 75000 },
          { id: 2, name: "Bob", department: "HR", salary: 60000 },
          { id: 3, name: "Charlie", department: "IT", salary: 80000 },
          { id: 4, name: "Diana", department: "Finance", salary: 70000 },
          { id: 5, name: "Eve", department: "HR", salary: 55000 },
          { id: 6, name: "Frank", department: "Finance", salary: 72000 },
          { id: 7, name: "Grace", department: "IT", salary: 78000 }
        ]
      }
    ],
    expectedOutput: {
      type: "table",
      value: [
        { department: "IT", min_salary: 75000, max_salary: 80000, avg_salary: 77666.67 },
        { department: "HR", min_salary: 55000, max_salary: 60000, avg_salary: 57500 },
        { department: "Finance", min_salary: 70000, max_salary: 72000, avg_salary: 71000 }
      ]
    },
    testCases: [
      {
        name: "Test Case 1: Correct salary statistics",
        input: "",
        expectedOutput: {
          type: "table",
          value: [
            { department: "IT", min_salary: 75000, max_salary: 80000, avg_salary: 77666.67 },
            { department: "HR", min_salary: 55000, max_salary: 60000, avg_salary: 57500 },
            { department: "Finance", min_salary: 70000, max_salary: 72000, avg_salary: 71000 }
          ]
        },
        description: "Verify min, max, and average salary are calculated correctly for each department"
      },
      {
        name: "Test Case 2: All departments included",
        input: "",
        expectedOutput: {
          type: "count",
          value: 3
        },
        description: "Verify all 3 departments are returned"
      }
    ],
    schemaName: "assignment_15"
  }
];

async function initializeAssignments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ciphersqlstudio');
    console.log('✅ Connected to MongoDB');

    // Clear existing assignments (optional - comment out if you want to keep existing)
    // await Assignment.deleteMany({});
    // console.log('🗑️  Cleared existing assignments');

    // Insert assignments
    for (const assignmentData of sampleAssignments) {
      // Check if assignment already exists
      const existing = await Assignment.findOne({ schemaName: assignmentData.schemaName });
      
      if (existing) {
        // Force update test cases for all assignments (ensure exactly 2 test cases)
        existing.testCases = assignmentData.testCases || [];
        existing.expectedOutput = assignmentData.expectedOutput || existing.expectedOutput;
        await existing.save();
        console.log(`✅ Updated assignment "${assignmentData.title}" with ${assignmentData.testCases?.length || 0} test cases`);
        continue;
      }

      // Create assignment in MongoDB
      const assignment = new Assignment(assignmentData);
      await assignment.save();
      console.log(`✅ Created assignment: ${assignmentData.title}`);

      // Initialize PostgreSQL tables
      try {
        await initializeAssignmentTables(assignmentData.schemaName, assignmentData.sampleTables);
        console.log(`✅ Initialized PostgreSQL tables for: ${assignmentData.title}`);
      } catch (error) {
        console.error(`❌ Error initializing PostgreSQL tables for ${assignmentData.title}:`, error.message);
      }
    }

    console.log('\n🎉 Sample assignments initialized successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing assignments:', error);
    process.exit(1);
  }
}

// Run the script
initializeAssignments();
