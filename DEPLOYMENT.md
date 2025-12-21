# Deployment Guide

This guide covers deploying the Automated Social Engagement application.

## Environment Configuration

### Required Environment Variables

Set these environment variables for deployment:

```bash
DATABASE_URL=postgresql://username:password@host:port/database
SESSION_SECRET=your-secure-session-secret-change-this
REPL_ID=80d49ad1-dd5b-4aac-ab8f-9526cffd4904
```

### Optional Environment Variables

```bash
# OpenAI Integration (for AI-powered comments)
OPENAI_API_KEY=sk-your-openai-api-key

# Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
NOTIFICATION_EMAIL=notifications@yourdomain.com

# Additional OAuth (if needed)
OIDC_CLIENT_ID=your-client-id-here
```

## Deployment Methods

### 1. Docker Deployment (Recommended)

```bash
# Build the image
docker build -t automated-social-engagement .

# Run with environment variables
docker run -d \
  --name social-app \
  -p 5000:5000 \
  -e DATABASE_URL="your-database-url" \
  -e SESSION_SECRET="your-session-secret" \
  -e REPL_ID="80d49ad1-dd5b-4aac-ab8f-9526cffd4904" \
  automated-social-engagement
```

### 2. Digital Ocean Deployment

1. **Environment Setup:**
   ```bash
   # Create .env file on your server
   DATABASE_URL=your-database-url
   SESSION_SECRET=your-session-secret
   REPL_ID=80d49ad1-dd5b-4aac-ab8f-9526cffd4904
   ```

2. **Direct Deployment:**
   ```bash
   npm install
   npm run build
   npm start
   ```

### 3. Replit Deployment

Your REPL_ID is already configured: `80d49ad1-dd5b-4aac-ab8f-9526cffd4904`

1. Set environment variables in Replit Secrets:
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `REPL_ID` (already set to your value)

2. The app will automatically use these for OAuth authentication.

## Pre-Deployment Checks

Run environment validation:
```bash
npm run check-env
```

This will verify all required variables are set.

## Database Setup

Initialize the database:
```bash
npm run db:push
```

Or run migrations:
```bash
npm run db:generate
npm run db:migrate
```

## Troubleshooting

### Common Issues:

1. **Database Migration Failed**
   - Ensure DATABASE_URL is correctly set
   - Run `npm run db:push` to sync schema

2. **OAuth Client ID Error**
   - REPL_ID is set to: `80d49ad1-dd5b-4aac-ab8f-9526cffd4904`
   - This should resolve OAuth authentication issues

3. **Session Issues**
   - Set a strong SESSION_SECRET
   - Use a random string generator for production

### Health Check

After deployment, verify the app is running:
```bash
curl http://localhost:5000/api/health
```

## Security Notes

- Change SESSION_SECRET to a strong, random value
- Use environment-specific DATABASE_URL
- Enable HTTPS in production
- Rotate secrets regularly

## Support

Your REPL_ID: `80d49ad1-dd5b-4aac-ab8f-9526cffd4904`

If you encounter issues, check:
1. Environment variables are set correctly
2. Database is accessible
3. OAuth configuration matches your Replit setup