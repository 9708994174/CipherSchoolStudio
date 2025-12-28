# CipherSQLStudio

A browser-based SQL learning platform where students can practice SQL queries against pre-configured assignments with real-time execution and intelligent hints.

## Features

- **Assignment Listing**: Browse and select from available SQL assignments
- **SQL Editor**: Write and execute SQL queries using Monaco Editor
- **Real-time Execution**: Execute queries against PostgreSQL and see results instantly
- **Sample Data Viewer**: View table schemas and sample data for each assignment
- **Intelligent Hints**: Get helpful hints from integrated LLM (OpenAI) without revealing solutions
- **Progress Tracking**: Save your query attempts and progress (optional)
- **Mobile-First Design**: Fully responsive design optimized for all devices

## Technology Stack

### Frontend
- **React.js**: UI framework
- **React Router**: Client-side routing
- **Monaco Editor**: SQL code editor
- **SCSS**: Styling with mobile-first responsive design
- **Axios**: HTTP client

### Backend
- **Node.js / Express.js**: Server runtime and framework
- **MongoDB**: Database for assignments and user progress
- **PostgreSQL**: Sandbox database for query execution
- **OpenAI API**: LLM integration for hint generation

## Project Structure

```
CipherSQLStudio/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── config/            # Database configurations
│   ├── models/            # MongoDB models
│   ├── routes/            # API routes
│   ├── index.js           # Server entry point
│   └── package.json
├── package.json            # Root package.json
└── README.md
```

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v12 or higher)
- **MongoDB** (local or MongoDB Atlas account)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CipherSchool
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```
   Or install separately:
   ```bash
   npm install
   cd server && npm install
   cd ../client && npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the `server` directory:
   ```env
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ciphersqlstudio?retryWrites=true&w=majority
   
   # PostgreSQL Configuration
   PG_HOST=localhost
   PG_PORT=5432
   PG_USER=postgres
   PG_PASSWORD=your_password
   PG_DATABASE=ciphersqlstudio_app
   
   # LLM API Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # CORS Configuration
   CLIENT_URL=http://localhost:3000
   ```

   Create a `.env` file in the `client` directory (optional):
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. **Set up PostgreSQL**

   Create a database:
   ```sql
   CREATE DATABASE ciphersqlstudio_app;
   ```

   The application will automatically create schemas for each assignment when they are initialized.

5. **Set up MongoDB**

   - Use MongoDB Atlas (recommended) or local MongoDB
   - Update `MONGODB_URI` in `.env` file

6. **Initialize sample assignments**

   You'll need to create assignments in MongoDB. See the "Database Setup" section below.

## Running the Application

### Development Mode

Run both frontend and backend concurrently:
```bash
npm run dev
```

Or run separately:

**Backend:**
```bash
cd server
npm run dev
```

**Frontend:**
```bash
cd client
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

### Production Build

**Build frontend:**
```bash
cd client
npm run build
```

**Start backend:**
```bash
cd server
npm start
```

## Database Setup

### MongoDB - Creating Assignments

Assignments need to be pre-populated in MongoDB. Here's an example assignment document:

```javascript
{
  "title": "Find All Users",
  "description": "Retrieve all users from the users table",
  "difficulty": "Easy",
  "question": "Write a SQL query to select all columns from the users table.",
  "sampleTables": [
    {
      "tableName": "users",
      "columns": [
        { "columnName": "id", "dataType": "INTEGER" },
        { "columnName": "name", "dataType": "TEXT" },
        { "columnName": "email", "dataType": "TEXT" }
      ],
      "rows": [
        { "id": 1, "name": "John Doe", "email": "john@example.com" },
        { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
      ]
    }
  ],
  "expectedOutput": {
    "type": "table",
    "value": [
      { "id": 1, "name": "John Doe", "email": "john@example.com" },
      { "id": 2, "name": "Jane Smith", "email": "jane@example.com" }
    ]
  },
  "schemaName": "assignment_1"
}
```

### PostgreSQL - Schema Isolation

The application uses PostgreSQL schemas to isolate each assignment's data:

- Each assignment has a unique `schemaName` (e.g., `assignment_1`, `assignment_2`)
- Tables are created within the assignment's schema
- User queries are executed within the assignment's schema context
- This ensures data isolation and security

## API Endpoints

### Assignments
- `GET /api/assignments` - Get all assignments
- `GET /api/assignments/:id` - Get a specific assignment
- `GET /api/assignments/:id/progress` - Get user progress for an assignment
- `POST /api/assignments/:id/progress` - Save user progress

### Query Execution
- `POST /api/query/execute` - Execute a SQL query
  ```json
  {
    "assignmentId": "assignment_id",
    "query": "SELECT * FROM users;"
  }
  ```

### Hints
- `POST /api/hints` - Get a hint for an assignment
  ```json
  {
    "assignmentId": "assignment_id",
    "query": "SELECT * FROM users" // optional
  }
  ```

## Security Features

- **Query Sanitization**: Only SELECT and WITH (CTE) statements are allowed
- **SQL Injection Prevention**: Dangerous keywords (DROP, DELETE, ALTER, etc.) are blocked
- **Schema Isolation**: Each assignment runs in its own PostgreSQL schema
- **Input Validation**: All inputs are validated using express-validator

## Styling Approach

- **Mobile-First**: Styles are written for mobile (320px) first, then enhanced for larger screens
- **Breakpoints**: 320px, 641px, 1024px, 1281px
- **SCSS Features**: Variables, mixins, nesting, and partials
- **BEM Naming**: Block-Element-Modifier naming convention
- **Touch-Friendly**: Minimum 44px touch targets for mobile devices

## LLM Integration

The application uses OpenAI's GPT-3.5-turbo model to generate hints. The prompt engineering ensures:

- Hints guide students without revealing complete solutions
- Focus on concepts and approaches rather than code
- Concise responses (2-3 sentences)
- No actual SQL code in hints

To use a different LLM provider, modify `server/routes/hints.js`.

## Troubleshooting

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running
- Verify credentials in `.env` file
- Check if database exists: `CREATE DATABASE ciphersqlstudio_app;`

### MongoDB Connection Issues
- Verify MongoDB URI in `.env` file
- Check network connectivity for MongoDB Atlas
- Ensure IP whitelist includes your IP (for Atlas)

### LLM API Issues
- Verify `OPENAI_API_KEY` is set correctly
- Check API quota/limits
- Ensure sufficient API credits

## Future Enhancements

- User authentication and authorization
- Assignment creation interface for administrators
- Query history and comparison
- Performance metrics and analytics
- Multiple LLM provider support

## License

This project is built for educational purposes.

## Contributing

This is an assignment project. For questions or issues, please refer to the assignment guidelines.






