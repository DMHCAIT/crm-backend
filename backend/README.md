# DMHCA CRM Backend

A comprehensive CRM backend API built with Node.js, Express, and integrated with Supabase, WhatsApp Business API, and Facebook API.

## Features

- **Lead Management**: Complete CRUD operations for leads with real-time updates
- **Student Management**: Manage student data and academic information
- **User Management**: Authentication and user role management
- **WhatsApp Integration**: Send messages and manage WhatsApp Business API
- **Facebook Integration**: Manage Facebook leads and communications
- **Analytics**: Comprehensive analytics and reporting
- **Document Management**: File upload and document handling
- **Payment Processing**: Payment tracking and management
- **Real-time Communications**: WebSocket support for real-time updates

## Tech Stack

- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase Real-time subscriptions

## API Endpoints

### Core APIs
- `/api/health` - Health check endpoint
- `/api/leads` - Lead management
- `/api/students` - Student management
- `/api/users` - User management
- `/api/analytics` - Analytics and reporting
- `/api/dashboard` - Dashboard data
- `/api/documents` - Document management
- `/api/payments` - Payment processing
- `/api/communications` - Communication hub
- `/api/integrations` - External integrations

### Integration APIs
- `/api/whatsapp` - WhatsApp Business API integration
- `/api/facebook` - Facebook API integration

## Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# WhatsApp Business API
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=your_verify_token

# Facebook API
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id

# Frontend URLs (for CORS)
FRONTEND_URL=https://your-frontend-domain.com
```

## Installation

1. Clone the repository
```bash
git clone https://github.com/DMHCAIT/crm-backend.git
cd crm-backend
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Start the server
```bash
# Development
npm run dev

# Production
npm start
```

## Deployment

### Railway Deployment

This project is configured for Railway deployment with `railway.json`:

1. Connect your GitHub repository to Railway
2. Set up environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Manual Deployment

1. Build and start:
```bash
npm install
npm start
```

## API Documentation

### Health Check
```
GET /api/health
```

### Lead Management
```
GET /api/leads - Get all leads
POST /api/leads - Create new lead
PUT /api/leads/:id - Update lead
DELETE /api/leads/:id - Delete lead
```

### Student Management
```
GET /api/students - Get all students
POST /api/students - Create new student
PUT /api/students/:id - Update student
DELETE /api/students/:id - Delete student
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support, email support@dmhca.com or create an issue in the GitHub repository.
