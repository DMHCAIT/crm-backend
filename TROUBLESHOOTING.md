# 🔧 CRM Backend Issues & Solutions

## ❌ Current Issues Identified

### 1. **Environment Configuration**
- **Problem**: `.env` file created but contains placeholder values
- **Status**: ⚠️ NEEDS CONFIGURATION
- **Solution**: Update `.env` with your actual Supabase credentials

### 2. **Supabase Connection**  
- **Problem**: Connection failing due to invalid/placeholder credentials
- **Status**: ❌ FAILED
- **Solution**: Get real Supabase URL and Service Key from your dashboard

### 3. **Database Tables**
- **Problem**: Required tables (`users`, `leads`) may not exist
- **Status**: ❓ UNKNOWN (can't check due to connection issues)
- **Solution**: Create tables after fixing connection

## 🛠️ Step-by-Step Fix Instructions

### Step 1: Get Supabase Credentials
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project (or create one if needed)
3. Go to **Settings** → **API**
4. Copy the **Project URL** and **service_role secret**

### Step 2: Update Environment Variables
Edit your `.env` file and replace:
```env
SUPABASE_URL=your_actual_project_url_here
SUPABASE_SERVICE_KEY=your_actual_service_role_key_here
JWT_SECRET=a_secure_random_string_here
```

### Step 3: Create Database Tables
After fixing connection, run the SQL commands in Supabase SQL Editor:

#### Users Table:
```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  username TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('super_admin', 'admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Leads Table:
```sql  
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  "fullName" TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  country TEXT,
  branch TEXT,
  qualification TEXT,
  source TEXT DEFAULT 'manual',
  course TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  "assignedTo" TEXT,
  "followUp" TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  tags TEXT[],
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Step 4: Test the Setup
Run these commands after configuration:
```bash
# Test database connection
node setup-database.js

# Start the server
npm start

# Test endpoints
# Login: POST http://localhost:3001/api/auth/login
# Leads: GET http://localhost:3001/api/leads
# Users: GET http://localhost:3001/api/users
```

## 🐛 Common Login Issues & Fixes

### Issue: "Invalid email or password"
- **Cause**: No users in database or wrong password format
- **Fix**: Create a super admin using `create-super-admin.js`

### Issue: "Database table does not exist"
- **Cause**: Missing users/leads tables
- **Fix**: Run the SQL commands above in Supabase

### Issue: "Supabase connection failed"
- **Cause**: Wrong credentials or network issues
- **Fix**: Verify SUPABASE_URL and SUPABASE_SERVICE_KEY in .env

## 🔐 Authentication Flow Issues

The system uses a **dual authentication** approach:
1. **Direct Database Users**: Admin users with bcrypt password hashes
2. **Supabase Auth Users**: Regular users through Supabase authentication

**Problem**: If Supabase connection fails, both authentication methods break.

## 📊 Leads Management Issues

**Problem Areas**:
- Missing `leads` table columns
- Column name mismatches (camelCase vs snake_case)
- No error fallbacks for database failures

**Quick Fix**: The leads.js already has fallback mechanisms, but they require proper database connection.

## 👥 User Management Issues

**Problem Areas**:
- Admin role verification requires JWT tokens
- User CRUD operations depend on existing users table
- Password hashing/verification issues

## ⚡ Quick Start Commands

```bash
# 1. Update .env with real credentials
# 2. Create database tables (SQL commands above)
# 3. Test setup
node setup-database.js

# 4. Create super admin (after tables exist)
node create-super-admin.js

# 5. Start server
npm start
```

## 🔍 Debugging Commands

```bash
# Check if server starts
npm start

# Test specific endpoints
curl -X GET http://localhost:3001/api/health
curl -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"password"}'

# Check environment variables
node -e "require('dotenv').config(); console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);"
```

---

**Next Steps**: Update your `.env` file with real Supabase credentials, then run `node setup-database.js` again.