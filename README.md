# OAuth 2.0 Infrastructure & Token Management System

Production-ready OAuth 2.0 infrastructure for multi-platform social media management with secure token storage, automatic refresh, and centralized platform configuration.

## Features

- **Multi-Platform Support**: Instagram (Meta Graph API), LinkedIn, X/Twitter (API v2), TikTok, YouTube Data API v3
- **Secure Token Storage**: AES-256-GCM encryption for all tokens at rest
- **Automatic Token Refresh**: Redis-backed scheduler with exponential backoff retry strategy
- **PKCE Support**: Built-in PKCE flow for platforms requiring it (Twitter, TikTok)
- **CSRF Protection**: Cryptographically secure state tokens with expiry
- **Rate Limiting**: Redis-backed sliding window rate limiter
- **Structured Logging**: Pino with zero secret leakage
- **Type Safety**: Full TypeScript support with strict mode

## Tech Stack

- **Runtime**: Node.js 20+ with TypeScript (ESM, strict mode)
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache/Queue**: Redis (ioredis)
- **Encryption**: Native `crypto` module (AES-256-GCM)
- **Validation**: Zod
- **Logging**: Pino (structured JSON)

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 6+

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd oauth-service
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```

   Generate required secrets:
   ```bash
   # Generate encryption key (32 bytes = 64 hex chars)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Generate session secret (64+ chars)
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Update `.env` with your values:
   - `DATABASE_URL` - PostgreSQL connection string
   - `REDIS_URL` - Redis connection string
   - `TOKEN_ENCRYPTION_KEY` - 64-character hex string
   - `SESSION_SECRET` - 64+ character random string
   - Platform credentials (Instagram, LinkedIn, Twitter, TikTok, YouTube)

4. **Set up database**:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

## Development

```bash
# Start development server (with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Open Prisma Studio (database GUI)
npm run db:studio
```

## API Endpoints

### Health Check
```
GET /health
```

### OAuth Flow

#### 1. Initiate OAuth Connection
```
POST /oauth/:platform/connect
```

**Response**:
```json
{
  "authUrl": "https://...",
  "state": "..."
}
```

Redirect user to `authUrl` to authorize.

#### 2. Handle OAuth Callback
```
GET /oauth/:platform/callback?code=...&state=...
```

**Response**:
```json
{
  "success": true,
  "account": {
    "id": "...",
    "platform": "INSTAGRAM",
    "externalAccountId": "...",
    "status": "CONNECTED",
    ...
  }
}
```

#### 3. List Connected Accounts
```
GET /oauth/accounts
```

**Response**:
```json
{
  "accounts": [
    {
      "id": "...",
      "platform": "INSTAGRAM",
      "status": "CONNECTED",
      "scopes": ["instagram_basic", ...],
      "createdAt": "...",
      ...
    }
  ]
}
```

#### 4. Get Account Status
```
GET /oauth/:platform/:id/status
```

#### 5. Manual Token Refresh
```
POST /oauth/:platform/refresh/:id
```

**Response**:
```json
{
  "success": true,
  "message": "Token refreshed"
}
```

#### 6. Revoke Account
```
DELETE /oauth/:platform/:id
```

**Response**:
```json
{
  "success": true,
  "message": "Account revoked"
}
```

## Platform Support

### Instagram (Meta Graph API)
- **Auth URL**: `https://www.facebook.com/v18.0/dialog/oauth`
- **Scopes**: `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`
- **Token Expiry**: 60 days (long-lived)
- **PKCE**: No
- **Refresh**: Manual re-auth required after expiry

### LinkedIn
- **Auth URL**: `https://www.linkedin.com/oauth/v2/authorization`
- **Scopes**: `openid`, `profile`, `email`, `w_member_social`, `r_basicprofile`
- **Token Expiry**: 60 days
- **PKCE**: No
- **Refresh**: Automatic via refresh_token

### X/Twitter (API v2)
- **Auth URL**: `https://twitter.com/i/oauth2/authorize`
- **Scopes**: `tweet.read`, `tweet.write`, `users.read`, `offline.access`
- **Token Expiry**: 2 hours (access), 365 days (refresh)
- **PKCE**: Yes (required)
- **Refresh**: Automatic via refresh_token

### TikTok
- **Auth URL**: `https://www.tiktok.com/v2/auth/authorize/`
- **Scopes**: `user.info.basic`, `video.upload`, `video.list`
- **Token Expiry**: 24 hours (access), 365 days (refresh)
- **PKCE**: Yes (required)
- **Refresh**: Automatic via refresh_token

### YouTube (Google OAuth 2.0)
- **Auth URL**: `https://accounts.google.com/o/oauth2/v2/auth`
- **Scopes**: `youtube.upload`, `youtube.force-ssl`, `userinfo.profile`
- **Token Expiry**: 1 hour (access), indefinite (refresh)
- **PKCE**: No
- **Refresh**: Automatic via refresh_token

## Security Features

- **AES-256-GCM Encryption**: All tokens encrypted at rest with authenticated encryption
- **PKCE**: Proof Key for Code Exchange for public clients
- **State Tokens**: Cryptographically secure, one-time use, 10-minute expiry
- **Rate Limiting**: 100 req/15min (general), 20 req/5min (OAuth endpoints)
- **Session Management**: Redis-backed sessions with secure cookies
- **Helmet**: Security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Zero Secret Leakage**: Structured logging with redaction of sensitive fields
- **CORS**: Configured with credentials support
- **Input Validation**: Zod schemas for environment and request validation

## Architecture

```
src/
├── config/               # Environment validation, platform configs
├── crypto/               # Token encryption service
├── db/                   # Prisma client, Redis client
├── errors/               # Custom error classes
├── logger/               # Pino logger configuration
├── middleware/           # Error handler, rate limiter, session validation
├── modules/
│   ├── oauth/           # OAuth service, controller, router
│   │   └── platforms/   # Platform-specific handlers
│   ├── tokens/          # Token service, refresh scheduler
│   └── users/           # User service, repository
├── routes/              # Route aggregation
├── utils/               # Helper functions
└── app.ts               # Express app entry point
```

## Database Schema

### Models
- **User**: User accounts
- **SocialAccount**: Connected social media accounts with encrypted tokens
- **OAuthState**: State tokens for CSRF protection

See `prisma/schema.prisma` for full schema.

## Token Refresh Strategy

The system uses a Redis-backed scheduler that:
1. Runs every 60 seconds
2. Checks for tokens due for refresh (5 minutes before expiry)
3. Attempts refresh with exponential backoff on failure:
   - Retry 1: 1 minute
   - Retry 2: 2 minutes
   - Retry 3: 4 minutes
   - Retry 4: 8 minutes
   - Retry 5: 16 minutes
4. Marks account as `ERROR` after 5 failed attempts

## Error Handling

All errors are structured and logged:
- **DecryptionError**: Token decryption failure (500)
- **OAuthError**: OAuth-specific errors (400-500)
- Generic errors return generic messages in production

## Logging

Structured JSON logs with redaction:
```json
{
  "level": 30,
  "time": 1705329600000,
  "pid": 12345,
  "hostname": "localhost",
  "event": "token_exchanged",
  "platform": "INSTAGRAM",
  "userId": "...",
  "hasRefreshToken": true
}
```

Redacted fields: `accessToken`, `refreshToken`, `client_secret`, `code_verifier`, `authorization`

## Testing

Manual testing flow:

1. Start the server:
   ```bash
   npm run dev
   ```

2. Create a user session (implement your own auth or use a test endpoint)

3. Initiate OAuth flow:
   ```bash
   curl -X POST http://localhost:3000/oauth/instagram/connect \
     -H "Cookie: connect.sid=<session-id>" \
     -H "Content-Type: application/json"
   ```

4. Redirect to `authUrl` and authorize

5. Handle callback at `/oauth/instagram/callback`

## Production Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Set environment variables** for production:
   - `NODE_ENV=production`
   - Secure DATABASE_URL, REDIS_URL
   - Generate new TOKEN_ENCRYPTION_KEY and SESSION_SECRET
   - Add all platform credentials

3. **Run migrations**:
   ```bash
   npx prisma migrate deploy
   ```

4. **Start server**:
   ```bash
   npm start
   ```

5. **Use process manager** (PM2, systemd, etc.)

## License

MIT

## Support

For issues or questions, please open a GitHub issue.
# anysocial
