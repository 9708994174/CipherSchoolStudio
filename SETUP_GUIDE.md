# Quick Setup Guide - CipherSQLStudio

## MongoDB Connection String (Example)
mongodb+srv://kumar799024_db_user:QciQqSD0klP3nIKQ@cipherschool.sxjgvai.mongodb.net/ciphersqlstudio?retryWrites=true&w=majority

**Note:** Make sure to include the database name (e.g., `ciphersqlstudio`) before the `?` in the connection string.

## Prerequisites Checklist

- [ ] Node.js (v14+) installed
- [ ] PostgreSQL (v12+) installed and running
- [ ] MongoDB Atlas account OR local MongoDB installed
- [ ] OpenAI API key (for hint generation)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

Or use the convenience script:
```bash
npm run install-all
```

### 2. Configure Environment Variables

Create `server/.env` file:

```env
PORT=5000
NODE_ENV=development

# MongoDB - Replace with your MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ciphersqlstudio?retryWrites=true&w=majority

# PostgreSQL - Update with your credentials
PG_HOST=localhost
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=ciphersqlstudio_app

# OpenAI API Key
OPENAI_API_KEY=sk-your-api-key-here

# CORS
CLIENT_URL=http://localhost:3000
```

### 3. Set Up PostgreSQL Database

```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE ciphersqlstudio_app;

-- Exit psql
\q
```

### 4. Initialize Sample Assignments

```bash
cd server
node scripts/init-sample-assignments.js
```

This script will:
- Create sample assignments in MongoDB
- Initialize PostgreSQL schemas and tables for each assignment
- Insert sample data

### 5. Start the Application

**Option 1: Run both together (recommended for development)**
```bash
# From root directory
npm run dev
```

**Option 2: Run separately**

Terminal 1 - Backend:
```bash
cd server
npm run dev
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

### 6. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health Check: http://localhost:5000/api/health

## Troubleshooting

### PostgreSQL Connection Error
- Verify PostgreSQL is running: `pg_isready`
- Check credentials in `.env` file
- Ensure database exists: `psql -U postgres -l` (should list `ciphersqlstudio_app`)

### MongoDB Connection Error
- For MongoDB Atlas: Check IP whitelist and connection string
- For local MongoDB: Ensure service is running
- Verify connection string format in `.env`

### OpenAI API Error
- Verify API key is correct
- Check API quota/credits
- Ensure key has proper permissions

### Port Already in Use
- Change `PORT` in `server/.env`
- Or kill process using port: `npx kill-port 5000` or `npx kill-port 3000`

## Next Steps

1. ✅ Verify assignments load on homepage
2. ✅ Select an assignment and verify sample data displays
3. ✅ Write a SQL query and execute it
4. ✅ Test hint generation
5. ✅ Test on mobile device (responsive design)

## Creating Custom Assignments

See `server/scripts/init-sample-assignments.js` for the assignment structure. You can:

1. Add assignments directly to MongoDB using MongoDB Compass or CLI
2. Modify the init script to include your assignments
3. Use the MongoDB schema from `server/models/Assignment.js`

## Project Structure Reference

```
CipherSQLStudio/
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── *.scss       # Styles
│   └── package.json
├── server/              # Express backend
│   ├── config/          # Database configs
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── scripts/         # Utility scripts
│   └── package.json
└── README.md            # Full documentation
```

## Support

Refer to `README.md` for detailed documentation and `DATA_FLOW_DIAGRAM.md` for understanding the application flow.

