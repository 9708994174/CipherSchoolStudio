# Data Flow Diagram - CipherSQLStudio

## User Executes Query - Complete Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Assignment Attempt Page                                         │  │
│  │  - User writes SQL query in Monaco Editor                        │  │
│  │  - User clicks "Execute Query" button                            │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ onClick: handleExecute()                │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  API Service (api.js)                                           │  │
│  │  executeQuery(assignmentId, query)                              │  │
│  │  - Makes POST request to /api/query/execute                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST Request
                              │ { assignmentId, query }
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER (Express.js)                         │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Route: POST /api/query/execute                                 │  │
│  │  File: server/routes/query.js                                   │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 1: Validation                       │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Input Validation (express-validator)                           │  │
│  │  - Validates assignmentId exists                                │  │
│  │  - Validates query is not empty                                 │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 2: Query Sanitization               │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  sanitizeQuery(query)                                           │  │
│  │  - Blocks dangerous keywords (DROP, DELETE, ALTER, etc.)       │  │
│  │  - Only allows SELECT and WITH (CTE) statements                 │  │
│  │  - Returns sanitized query or throws error                     │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 3: Fetch Assignment                 │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  MongoDB Query                                                  │  │
│  │  Assignment.findById(assignmentId)                              │  │
│  │  - Retrieves assignment document                               │  │
│  │  - Gets schemaName for PostgreSQL schema                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 4: Execute Query in PostgreSQL      │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Execution                                           │  │
│  │  executeQuery(schemaName, sanitizedQuery)                      │  │
│  │  File: server/config/postgres.js                                │  │
│  │                                                                 │  │
│  │  1. Get connection from pool                                    │  │
│  │  2. SET search_path TO schemaName                              │  │
│  │  3. Execute user's query                                        │  │
│  │  4. Return: { success, rows, rowCount, columns }               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 5: Save Progress (Optional)         │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  MongoDB Update                                                 │  │
│  │  UserProgress.findOneAndUpdate()                                │  │
│  │  - Saves user's SQL query                                       │  │
│  │  - Increments attemptCount                                      │  │
│  │  - Updates lastAttempt timestamp                                │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Step 6: Return Response                   │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  Response JSON                                                  │  │
│  │  {                                                              │  │
│  │    success: true/false,                                        │  │
│  │    rows: [...],                                                │  │
│  │    rowCount: number,                                           │  │
│  │    columns: [...],                                             │  │
│  │    error: "error message" (if failed)                          │  │
│  │  }                                                              │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Response
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  State Update                                                    │  │
│  │  - setResults({ rows, rowCount, columns })                      │  │
│  │  - setError(null) or setError(message)                         │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              │ Re-render                                │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │  ResultsPanel Component                                          │  │
│  │  - Displays results in formatted table                          │  │
│  │  - Shows row count                                              │  │
│  │  - Handles empty results                                        │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

## Get Hint Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                          │
│                                                                         │
│  User clicks "Get Hint" button                                         │
│                              │                                          │
│                              │ onClick: handleGetHint()                │
│                              ▼                                          │
│  API Service: getHint(assignmentId, query)                              │
│  POST /api/hints                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP POST
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER (Express.js)                        │
│                                                                         │
│  1. Validate input (assignmentId required)                               │
│  2. Fetch assignment from MongoDB                                       │
│  3. Build LLM prompt with:                                              │
│     - Assignment question                                               │
│     - Sample tables schema                                              │
│     - User's current query (if any)                                     │
│     - Instructions to provide hints, not solutions                      │
│                              │                                          │
│                              │ API Call                                 │
│                              ▼                                          │
│  4. OpenAI API Request                                                  │
│     - Model: gpt-3.5-turbo                                              │
│     - System prompt: "Provide hints, not solutions"                     │
│     - User prompt: Assignment context + user query                      │
│                              │                                          │
│                              │ Response                                │
│                              ▼                                          │
│  5. Return hint text                                                    │
│     { hint: "Consider using WHERE clause to filter..." }                │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP Response
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE (React)                          │
│                                                                         │
│  State Update: setHint(hintText)                                       │
│  Display hint in editor panel below SQL editor                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Assignment Loading Flow

```
User navigates to /assignment/:id
        │
        ▼
┌───────────────────────────────────────┐
│  AssignmentAttempt Component Mounts    │
│  useEffect triggers                    │
└───────────────────────────────────────┘
        │
        ├─► fetchAssignment()
        │   GET /api/assignments/:id
        │   └─► MongoDB: Assignment.findById()
        │       └─► Returns assignment document
        │
        └─► fetchProgress()
            GET /api/assignments/:id/progress
            └─► MongoDB: UserProgress.findOne()
                └─► Returns saved query (if any)
        │
        ▼
State Updates:
- setAssignment(assignmentData)
- setQuery(savedQuery)
        │
        ▼
Components Render:
- Question Panel (assignment.question)
- Sample Data Viewer (assignment.sampleTables)
- SQL Editor (with saved query)
- Results Panel (empty initially)
```

## Key State Updates Throughout Application

1. **Assignment List Page**
   - `assignments` state: Array of all assignments
   - Updated on component mount via `getAssignments()` API call

2. **Assignment Attempt Page**
   - `assignment` state: Current assignment data
   - `query` state: User's SQL query
   - `results` state: Query execution results
   - `hint` state: LLM-generated hint
   - `loading` state: Loading indicators
   - `error` state: Error messages

3. **Database State**
   - **MongoDB**: Stores assignments and user progress
   - **PostgreSQL**: Stores sample data in isolated schemas per assignment

## Security Checkpoints

1. ✅ Input validation (express-validator)
2. ✅ Query sanitization (blocks dangerous SQL)
3. ✅ Schema isolation (each assignment in separate PostgreSQL schema)
4. ✅ Read-only operations (only SELECT/WITH allowed)
5. ✅ Error handling at each step

## Error Handling Flow

```
Any Error Occurs
        │
        ▼
┌───────────────────────────────────────┐
│  Try-Catch Block                      │
│  - Logs error to console              │
│  - Sets error state                   │
└───────────────────────────────────────┘
        │
        ▼
┌───────────────────────────────────────┐
│  Error Display                        │
│  - Shows error message to user        │
│  - Allows retry or navigation         │
└───────────────────────────────────────┘
```







