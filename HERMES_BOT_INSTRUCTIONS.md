# Hermes Bot - SocialSched Integration Guide

## Overview

Hermes Bot connects to SocialSched via the `/api/hermes-external/execute` endpoint using an API key. It can control the entire platform: schedule posts, manage users, create campaigns, analyze accounts, and more.

## Prerequisites

- Python 3.9+ or Node.js 18+
- A SocialSched account
- Hermes Connection API key (generated from `/dashboard/hermes-connection`)
- Network access to your SocialSched instance

## Quick Start

### 1. Get Your API Key

1. Log into SocialSched
2. Go to `/dashboard/hermes-connection`
3. Click **"Generate API Key"**
4. Copy the key (shown only once)

### 2. Install Dependencies

```bash
# Create bot directory
mkdir hermes-bot && cd hermes-bot

# Node.js
npm init -y
npm install axios dotenv

# OR Python
pip install requests python-dotenv
```

### 3. Configure Environment

Create `.env` file:
```env
SOCIALSCHED_API_URL=https://your-domain.com
HERMES_API_KEY=hermes_a1b2c3d4e5f6...
```

### 4. Create Bot Client

See `bot-client.js` (Node.js) or `bot-client.py` (Python) below.

### 5. Run Test

```bash
node test-bot.js
# OR
python test-bot.py
```

## Bot Client Implementation

### Node.js: `bot-client.js`

```javascript
require('dotenv').config();
const axios = require('axios');

class HermesBot {
  constructor() {
    this.baseURL = process.env.SOCIALSCHED_API_URL.replace(/\/$/, '');
    this.apiKey = process.env.HERMES_API_KEY;
    
    if (!this.baseURL || !this.apiKey) {
      throw new Error('SOCIALSCHED_API_URL and HERMES_API_KEY are required in .env');
    }

    this.client = axios.create({
      baseURL: `${this.baseURL}/api/hermes-external`,
      headers: {
        'X-Hermes-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async execute(action, payload = {}) {
    try {
      const response = await this.client.post('/execute', { action, payload });
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error(`[HermesBot] Error executing ${action}:`, message);
      throw new Error(message);
    }
  }

  async getStatus() {
    try {
      const response = await this.client.get('/status');
      return response.data;
    } catch (error) {
      const message = error.response?.data?.error || error.message;
      console.error('[HermesBot] Error getting status:', message);
      throw new Error(message);
    }
  }

  // ==================== CONTENT & PUBLISHING ====================

  async schedulePost(options) {
    return this.execute('schedule_post', options);
  }

  async bulkSchedule(options) {
    return this.execute('bulk_schedule', options);
  }

  async generateContent(prompt) {
    return this.execute('generate_content', { prompt });
  }

  // ==================== CAMPAIGNS ====================

  async createCampaign(options) {
    return this.execute('create_campaign', options);
  }

  async listCampaigns(filters = {}) {
    return this.execute('list_campaigns', filters);
  }

  async updateCampaign(options) {
    return this.execute('update_campaign', options);
  }

  async deleteCampaign(campaignId) {
    return this.execute('delete_campaign', { campaignId });
  }

  // ==================== USER MANAGEMENT ====================

  async listUsers(filters = {}) {
    return this.execute('list_users', filters);
  }

  async createUser(userData) {
    return this.execute('create_user', userData);
  }

  async updateUser(options) {
    return this.execute('update_user', options);
  }

  async deleteUser(targetUserId) {
    return this.execute('delete_user', { targetUserId });
  }

  async changeUserRole(targetUserId, role) {
    return this.execute('change_user_role', { targetUserId, role });
  }

  // ==================== ACCOUNT MANAGEMENT ====================

  async listAccounts(filters = {}) {
    return this.execute('list_accounts', filters);
  }

  async disconnectAccount(accountId) {
    return this.execute('disconnect_account', { accountId });
  }

  async refreshAccount(accountId) {
    return this.execute('refresh_account', { accountId });
  }

  // ==================== POST MANAGEMENT ====================

  async listPosts(filters = {}) {
    return this.execute('list_posts', filters);
  }

  async getPost(postId) {
    return this.execute('get_post', { postId });
  }

  async deletePost(postId) {
    return this.execute('delete_post', { postId });
  }

  async cancelScheduledPost(postId) {
    return this.execute('cancel_scheduled_post', { postId });
  }

  // ==================== REEL MANAGEMENT ====================

  async listReels(filters = {}) {
    return this.execute('list_reels', filters);
  }

  async deleteReel(reelId) {
    return this.execute('delete_reel', { reelId });
  }

  // ==================== ANALYTICS ====================

  async getAnalytics(days = 7) {
    return this.execute('get_analytics', { days });
  }

  async listNotifications(filters = {}) {
    return this.execute('list_notifications', filters);
  }

  // ==================== SETTINGS ====================

  async getSettings() {
    return this.execute('get_settings');
  }

  async updateSettings(settings) {
    return this.execute('update_settings', { settings });
  }

  // ==================== ANALYSIS ====================

  async analyzeAccounts() {
    return this.execute('analyze_accounts');
  }

  async monitorHealth() {
    return this.execute('monitor_health');
  }

  // ==================== CUSTOM ====================

  async custom(prompt) {
    return this.execute('custom', { prompt });
  }
}

module.exports = HermesBot;
```

### Python: `bot-client.py`

```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class HermesBot:
    def __init__(self):
        self.base_url = os.getenv('SOCIALSCHED_API_URL', '').rstrip('/')
        self.api_key = os.getenv('HERMES_API_KEY')
        
        if not self.base_url or not self.api_key:
            raise ValueError('SOCIALSCHED_API_URL and HERMES_API_KEY are required in .env')
        
        self.session = requests.Session()
        self.session.headers.update({
            'X-Hermes-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })
        self.base_url = f"{self.base_url}/api/hermes-external"

    def execute(self, action, payload=None):
        if payload is None:
            payload = {}
        try:
            response = self.session.post(
                f"{self.base_url}/execute",
                json={'action': action, 'payload': payload},
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            message = error.response.json().get('error', str(error)) if error.response else str(error)
            print(f"[HermesBot] Error executing {action}: {message}")
            raise Exception(message)

    def get_status(self):
        try:
            response = self.session.get(f"{self.base_url}/status", timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as error:
            message = error.response.json().get('error', str(error)) if error.response else str(error)
            print(f"[HermesBot] Error getting status: {message}")
            raise Exception(message)

    # ==================== CONTENT & PUBLISHING ====================

    def schedule_post(self, options):
        return self.execute('schedule_post', options)

    def bulk_schedule(self, options):
        return self.execute('bulk_schedule', options)

    def generate_content(self, prompt):
        return self.execute('generate_content', {'prompt': prompt})

    # ==================== CAMPAIGNS ====================

    def create_campaign(self, options):
        return self.execute('create_campaign', options)

    def list_campaigns(self, filters=None):
        return self.execute('list_campaigns', filters or {})

    def update_campaign(self, options):
        return self.execute('update_campaign', options)

    def delete_campaign(self, campaign_id):
        return self.execute('delete_campaign', {'campaignId': campaign_id})

    # ==================== USER MANAGEMENT ====================

    def list_users(self, filters=None):
        return self.execute('list_users', filters or {})

    def create_user(self, user_data):
        return self.execute('create_user', user_data)

    def update_user(self, options):
        return self.execute('update_user', options)

    def delete_user(self, target_user_id):
        return self.execute('delete_user', {'targetUserId': target_user_id})

    def change_user_role(self, target_user_id, role):
        return self.execute('change_user_role', {'targetUserId': target_user_id, 'role': role})

    # ==================== ACCOUNT MANAGEMENT ====================

    def list_accounts(self, filters=None):
        return self.execute('list_accounts', filters or {})

    def disconnect_account(self, account_id):
        return self.execute('disconnect_account', {'accountId': account_id})

    def refresh_account(self, account_id):
        return self.execute('refresh_account', {'accountId': account_id})

    # ==================== POST MANAGEMENT ====================

    def list_posts(self, filters=None):
        return self.execute('list_posts', filters or {})

    def get_post(self, post_id):
        return self.execute('get_post', {'postId': post_id})

    def delete_post(self, post_id):
        return self.execute('delete_post', {'postId': post_id})

    def cancel_scheduled_post(self, post_id):
        return self.execute('cancel_scheduled_post', {'postId': post_id})

    # ==================== REEL MANAGEMENT ====================

    def list_reels(self, filters=None):
        return self.execute('list_reels', filters or {})

    def delete_reel(self, reel_id):
        return self.execute('delete_reel', {'reelId': reel_id})

    # ==================== ANALYTICS ====================

    def get_analytics(self, days=7):
        return self.execute('get_analytics', {'days': days})

    def list_notifications(self, filters=None):
        return self.execute('list_notifications', filters or {})

    # ==================== SETTINGS ====================

    def get_settings(self):
        return self.execute('get_settings')

    def update_settings(self, settings):
        return self.execute('update_settings', {'settings': settings})

    # ==================== ANALYSIS ====================

    def analyze_accounts(self):
        return self.execute('analyze_accounts')

    def monitor_health(self):
        return self.execute('monitor_health')

    # ==================== CUSTOM ====================

    def custom(self, prompt):
        return self.execute('custom', {'prompt': prompt})
```

## Test Scripts

### Node.js: `test-bot.js`

```javascript
const HermesBot = require('./bot-client');

async function testBot() {
  const bot = new HermesBot();

  try {
    // Test 1: Connection
    console.log('1. Testing connection...');
    const status = await bot.getStatus();
    console.log('   Agent status:', status.status);
    console.log('   Stats:', status.stats);

    // Test 2: Monitor Health
    console.log('\n2. Monitoring health...');
    const health = await bot.monitorHealth();
    console.log('   Health:', health.result.postsStats);

    // Test 3: Analyze Accounts
    console.log('\n3. Analyzing accounts...');
    const accounts = await bot.analyzeAccounts();
    console.log('   Total accounts:', accounts.result.totalAccounts);
    console.log('   Healthy:', accounts.result.healthy);
    console.log('   Need refresh:', accounts.result.needsRefresh);

    // Test 4: List Users
    console.log('\n4. Listing users...');
    const users = await bot.listUsers();
    console.log(`   Total users: ${users.result.total}`);

    // Test 5: Schedule a post (dry run - will fail without connected accounts)
    console.log('\n5. Testing schedule post...');
    try {
      const post = await bot.schedulePost({
        content: 'Hello from Hermes Bot!',
        platforms: ['INSTAGRAM'],
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        timezone: 'UTC'
      });
      console.log('   Post scheduled:', post.result.postId);
    } catch (error) {
      console.log('   Expected error (no connected accounts):', error.message);
    }

    console.log('\n✅ All tests completed!');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

testBot();
```

### Python: `test-bot.py`

```python
from bot_client import HermesBot

def test_bot():
    bot = HermesBot()

    try:
        # Test 1: Connection
        print('1. Testing connection...')
        status = bot.get_status()
        print(f"   Agent status: {status['status']}")
        print(f"   Stats: {status['stats']}")

        # Test 2: Monitor Health
        print('\n2. Monitoring health...')
        health = bot.monitor_health()
        print(f"   Health: {health['result']['postsStats']}")

        # Test 3: Analyze Accounts
        print('\n3. Analyzing accounts...')
        accounts = bot.analyze_accounts()
        print(f"   Total accounts: {accounts['result']['totalAccounts']}")
        print(f"   Healthy: {accounts['result']['healthy']}")
        print(f"   Need refresh: {accounts['result']['needsRefresh']}")

        # Test 4: List Users
        print('\n4. Listing users...')
        users = bot.list_users()
        print(f"   Total users: {users['result']['total']}")

        # Test 5: Schedule a post
        print('\n5. Testing schedule post...')
        try:
            post = bot.schedule_post({
                'content': 'Hello from Hermes Bot!',
                'platforms': ['INSTAGRAM'],
                'scheduledAt': '2025-01-15T10:00:00Z',
                'timezone': 'UTC'
            })
            print(f"   Post scheduled: {post['result']['postId']}")
        except Exception as error:
            print(f"   Expected error (no connected accounts): {error}")

        print('\n✅ All tests completed!')
    except Exception as error:
        print(f'\n❌ Test failed: {error}')
        exit(1)

if __name__ == '__main__':
    test_bot()
```

## Example Bot Workflows

### Auto-Poster Bot

```javascript
const HermesBot = require('./bot-client');
const bot = new HermesBot();

async function autoPost() {
  const posts = [
    { content: 'Post 1', platforms: ['INSTAGRAM'], scheduledAt: '2025-01-15T10:00:00Z' },
    { content: 'Post 2', platforms: ['INSTAGRAM'], scheduledAt: '2025-01-15T14:00:00Z' },
    { content: 'Post 3', platforms: ['INSTAGRAM'], scheduledAt: '2025-01-15T18:00:00Z' }
  ];

  for (const post of posts) {
    await bot.schedulePost(post);
    console.log(`Scheduled: ${post.content}`);
  }
}

autoPost();
```

### Health Monitor Bot

```javascript
const HermesBot = require('./bot-client');
const bot = new HermesBot();

async function healthCheck() {
  const health = await bot.monitorHealth();
  console.log('Health status:', health);

  const accounts = await bot.analyzeAccounts();
  console.log('Account analysis:', accounts);
}

// Run every hour
setInterval(healthCheck, 3600000);
healthCheck();
```

### User Manager Bot

```javascript
const HermesBot = require('./bot-client');
const bot = new HermesBot();

async function manageUsers() {
  // List all users
  const users = await bot.listUsers();
  console.log(`Total users: ${users.result.total}`);

  // Create a new user
  const newUser = await bot.createUser({
    email: 'newuser@example.com',
    password: 'SecurePass123',
    name: 'New User',
    role: 'user'
  });
  console.log('Created user:', newUser);

  // Promote to admin
  await bot.changeUserRole(newUser.result.userId, 'admin');
  console.log('Promoted user to admin');
}

manageUsers();
```

## Available Actions Reference

| Action | Description | Required Payload |
|--------|-------------|------------------|
| `schedule_post` | Schedule a post | `content`, `platforms`, `scheduledAt`, `timezone` |
| `bulk_schedule` | Schedule multiple posts | `posts[]`, `platforms`, `timezone` |
| `generate_content` | Generate AI content | `prompt` |
| `create_campaign` | Create campaign | `websiteUrl`, `socialChannels[]`, `campaignSchedule` |
| `list_campaigns` | List campaigns | - |
| `update_campaign` | Update campaign | `campaignId`, fields to update |
| `delete_campaign` | Delete campaign | `campaignId` |
| `list_users` | List all users | - |
| `create_user` | Create user | `email`, `password`, `name`, `role` |
| `update_user` | Update user | `targetUserId`, fields to update |
| `delete_user` | Delete user | `targetUserId` |
| `change_user_role` | Change role | `targetUserId`, `role` |
| `list_accounts` | List social accounts | - |
| `disconnect_account` | Remove account | `accountId` |
| `refresh_account` | Refresh token | `accountId` |
| `list_posts` | List posts | `status?`, `platform?`, `limit?` |
| `get_post` | Get post details | `postId` |
| `delete_post` | Delete post | `postId` |
| `cancel_scheduled_post` | Cancel scheduled post | `postId` |
| `list_reels` | List reels | `status?` |
| `delete_reel` | Delete reel | `reelId` |
| `get_analytics` | Get analytics | `days?` |
| `list_notifications` | List notifications | `isRead?` |
| `get_settings` | Get app settings | - |
| `update_settings` | Update settings | `settings{}` |
| `analyze_accounts` | Analyze accounts | - |
| `monitor_health` | Monitor health | - |
| `custom` | Custom AI command | `prompt` |

## Error Handling

```javascript
try {
  const result = await bot.schedulePost({
    content: 'Hello',
    platforms: ['INSTAGRAM']
  });
  console.log('Success:', result);
} catch (error) {
  console.error('Failed:', error.message);
  // Common errors:
  // - "Content and platforms are required"
  // - "Account not found"
  // - "Unauthorized: Invalid Hermes API key"
}
```

## Security Best Practices

1. **Never commit** `.env` to version control
2. **Rotate keys** periodically via `/dashboard/hermes-connection`
3. **Use HTTPS** in production
4. **Restrict IPs** if possible (use firewall rules)
5. **Revoke immediately** if key is compromised
6. **Use environment variables** or a secrets manager (AWS Secrets Manager, HashiCorp Vault)

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `401 Unauthorized` | Check API key is correct and not revoked |
| `400 Bad Request` | Check payload matches action requirements |
| `500 Server Error` | Check SocialSched logs, ensure database is running |
| `Timeout` | Increase timeout in bot client (default 30s) |
| `CORS error` | Ensure `BASE_URL` in SocialSched `.env` matches your domain |

## Running as a Service

### Using PM2 (Node.js)

```bash
npm install -g pm2
pm2 start test-bot.js --name hermes-bot
pm2 save
pm2 startup
```

### Using systemd (Linux)

Create `/etc/systemd/system/hermes-bot.service`:
```ini
[Unit]
Description=Hermes Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/hermes-bot
ExecStart=/usr/bin/node test-bot.js
Restart=always
RestartSec=10
Environment="SOCIALSCHED_API_URL=https://your-domain.com"
Environment="HERMES_API_KEY=hermes_..."

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable hermes-bot
sudo systemctl start hermes-bot
```

## Support

For issues or questions:
1. Check SocialSched logs: `scratch/backend-debug.log`
2. Verify API key in `/dashboard/hermes-connection`
3. Test connection using the "Test Hermes Connection" button
4. Check network connectivity to SocialSched API
