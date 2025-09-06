# 🎯 DMHCA CRM - Complete Business Management System

## 🌟 **Overview**
A comprehensive CRM system built with React/TypeScript frontend, Express.js backend, and Supabase PostgreSQL database. Features real-time lead management, student tracking, multi-channel communications, and automated workflows.

## 🏗️ **Architecture**
```
Frontend (React/TS) → Vercel
     ↓ API calls
Backend (Express.js) → Railway  
     ↓ Database queries
Database (PostgreSQL) → Supabase
```

## 📁 **Project Structure**
```
project/
├── frontend/          # React/TypeScript app (Deploy to Vercel)
├── backend/           # Express.js API (Deploy to Railway)
├── database/          # PostgreSQL schema (Setup in Supabase)
├── DEPLOYMENT_STEPS.md    # Complete deployment guide
└── README.md          # This file
```

## 🚀 **Quick Start - Development**

### **1. Database Setup**
```bash
# Run in Supabase SQL Editor
# Copy content from: database/database-setup-complete.sql
```

### **2. Backend Setup**
```bash
cd backend
npm install
npm run dev  # Starts on http://localhost:3001
```

### **3. Frontend Setup**
```bash
cd frontend
npm install
npm run dev  # Starts on http://localhost:5173
```

### **4. Login**
- Email: `admin@dmhca.com`
- Password: `YourSecurePassword123!`

## 🌐 **Production Deployment**

### **Quick Deploy (30 minutes):**
1. **Database**: Upload `database/database-setup-complete.sql` to Supabase
2. **Backend**: Deploy `backend/` folder to Railway
3. **Frontend**: Deploy `frontend/` folder to Vercel

**👉 See [DEPLOYMENT_STEPS.md](DEPLOYMENT_STEPS.md) for detailed instructions**

## ✨ **Features**
- 👥 **Lead Management**: Full pipeline tracking
- 🎓 **Student Management**: Course tracking & progress
- 💬 **Multi-Channel Communications**: Email, SMS, WhatsApp
- 📊 **Real-time Analytics**: Live dashboards
- 🔐 **Role-based Access**: 5-tier permission system
- 🔄 **Auto Workflows**: Intelligent automation
- 📱 **Mobile Responsive**: Works on all devices

## 🛠️ **Tech Stack**
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Express.js, Node.js
- **Database**: Supabase (PostgreSQL)
- **Hosting**: Vercel (Frontend) + Railway (Backend)
- **Real-time**: Supabase Realtime
- **Authentication**: Supabase Auth

## 📋 **Environment Variables**

### **Frontend (.env)**
```env
VITE_SUPABASE_URL=https://cyzbdpsfquetmftlaswk.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=https://your-app.railway.app
```

### **Backend (.env)**
```env
SUPABASE_URL=https://cyzbdpsfquetmftlaswk.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_key
NODE_ENV=production
PORT=$PORT
```

## 🎉 **Live Demo**
- **Frontend**: https://your-crm.vercel.app
- **Backend**: https://your-app.railway.app
- **Database**: Supabase Dashboard

## 📞 **Support**
- 📧 Email: admin@dmhca.com
- 🔗 GitHub: [Repository Link]
- 📖 Docs: See `DEPLOYMENT_STEPS.md`

## 🔄 **Updates**
- **Auto-deploy**: Push to GitHub for automatic updates
- **Database**: Manual updates via Supabase SQL Editor
- **Monitoring**: Built-in health checks

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Update**: August 2025