# OAuth 2.0 Infrastructure - Quick Start Guide

## Prerequisites
Before running the application, ensure you have:
- [ ] PostgreSQL installed and running
- [ ] Redis installed and running
- [ ] Node.js 20+ installed

## Step-by-Step Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example env file:
```bash
cp .env.example .env
```

Generate required secrets:

```bash
# Generate TOKEN_ENCRYPTION_KEY (32 bytes = 64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET (64+ chars)
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Update `.env` with:
- Your PostgreSQL connection string
- Your Redis connection string
- Generated secrets
- Platform OAuth credentials (at least one platform to test)

### 3. Set Up Database

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:3000`

### 5. Test Health Check

```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "uptime": 123.456,
  "timestamp": "2024-01-15T12:00:00.000Z"
}
```

## Setting Up Platform OAuth Credentials

### Instagram (Meta)
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app
3. Add Instagram Basic Display product
4. Get App ID and App Secret
5. Add redirect URI: `http://localhost:3000/oauth/instagram/callback`

### LinkedIn
1. Go to [LinkedIn Developers](https://developer.linkedin.com/)
2. Create an app
3. Get Client ID and Client Secret
4. Add redirect URI: `http://localhost:3000/oauth/linkedin/callback`

### X/Twitter
1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a project and app
3. Enable OAuth 2.0
4. Get Client ID and Client Secret
5. Add redirect URI: `http://localhost:3000/oauth/twitter/callback`
6. Enable PKCE in app settings

### TikTok
1. Go to [TikTok for Developers](https://developers.tiktok.com/)
2. Create an app
3. Get Client Key and Client Secret
4. Add redirect URI: `http://localhost:3000/oauth/tiktok/callback`

### YouTube (Google)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable YouTube Data API v3
4. Create OAuth 2.0 credentials
5. Get Client ID and Client Secret
6. Add redirect URI: `http://localhost:3000/oauth/youtube/callback`

## Testing the OAuth Flow

### 1. Create a Test User Session

You'll need to implement user authentication or use a simple test endpoint. For testing, you can create a session manually:

```typescript
// Add this temporarily to src/app.ts before app.listen()
app.get('/test/login', (req, res) => {
  req.session.userId = 'test-user-id';
  res.json({ message: 'Logged in as test user' });
});
```

### 2. Initiate OAuth Connection

```bash
curl -X POST http://localhost:3000/oauth/instagram/connect \
  -H "Cookie: connect.sid=<your-session-id>" \
  -H "Content-Type: application/json"
```

### 3. Follow the Auth URL

The response will contain an `authUrl`. Open it in your browser and authorize the app.

### 4. Handle Callback

After authorization, you'll be redirected to the callback URL with `code` and `state` parameters. The system will automatically:
- Validate the state token
- Exchange the code for tokens
- Encrypt and store tokens
- Return the connected account info

## Production Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Use strong, unique `TOKEN_ENCRYPTION_KEY` and `SESSION_SECRET`
- [ ] Configure production DATABASE_URL and REDIS_URL
- [ ] Add all platform credentials
- [ ] Set `FRONTEND_URL` to your production frontend URL
- [ ] Run `npm run build`
- [ ] Deploy with process manager (PM2, systemd, etc.)
- [ ] Set up monitoring and alerting
- [ ] Configure HTTPS/SSL
- [ ] Set up database backups

## Troubleshooting

### Prisma Client Not Generated
```bash
npm run db:generate
```

### Database Migration Issues
```bash
# Reset database (development only!)
npx prisma migrate reset

# Or create a new migration
npx prisma migrate dev
```

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check REDIS_URL in .env

### PostgreSQL Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify database exists

### TypeScript Errors
```bash
# Rebuild
npm run build

# Check for errors
npx tsc --noEmit
```

## Next Steps

1. Implement user authentication (login/signup)
2. Add frontend dashboard
3. Implement social media posting features
4. Add analytics and reporting
5. Set up CI/CD pipeline

## Support

For issues or questions:
- Check the main README.md
- Review the API documentation
- Open a GitHub issue
