import { Router, Request, Response } from 'express';
import { prisma } from '../db/prisma.js';
import { jwtAuth } from '../middleware/jwt-auth.js';
import crypto from 'crypto';

const router = Router();

router.use(jwtAuth);

/**
 * GET /api/hermes/connection
 * Get current user's Hermes connection status and key
 */
router.get('/connection', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        hermesApiKey: true
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const hasKey = !!user.hermesApiKey;
    const maskedKey = user.hermesApiKey 
      ? `${user.hermesApiKey.substring(0, 8)}...${user.hermesApiKey.substring(user.hermesApiKey.length - 4)}`
      : null;

    res.json({
      success: true,
      connected: hasKey,
      maskedKey,
      apiKey: user.hermesApiKey // Only shown once on generation
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Error:', error);
    res.status(500).json({ error: error.message || 'Failed to get connection status' });
  }
});

/**
 * POST /api/hermes/connection/generate
 * Generate a new Hermes API key for the current user
 */
router.post('/connection/generate', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Generate a secure random key
    const apiKey = `hermes_${crypto.randomBytes(32).toString('hex')}`;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { hermesApiKey: apiKey },
      select: {
        id: true,
        email: true,
        name: true,
        hermesApiKey: true
      }
    });

    res.json({
      success: true,
      message: 'Hermes API key generated successfully',
      apiKey: user.hermesApiKey,
      connectionUrl: `${process.env.BASE_URL}/api/hermes-external/execute`
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Generate error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate API key' });
  }
});

/**
 * POST /api/hermes/connection/revoke
 * Revoke the current user's Hermes API key
 */
router.post('/connection/revoke', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await prisma.user.update({
      where: { id: userId },
      data: { hermesApiKey: null }
    });

    res.json({
      success: true,
      message: 'Hermes API key revoked successfully'
    });
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Revoke error:', error);
    res.status(500).json({ error: error.message || 'Failed to revoke API key' });
  }
});

/**
 * GET /api/hermes/connection/setup-guide
 * Get personalized Hermes agent setup guide with user's API key
 */
router.get('/connection/setup-guide', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { hermesApiKey: true }
    });

    if (!user?.hermesApiKey) {
      res.status(400).json({ error: 'No Hermes API key generated. Generate one first.' });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const apiKey = user.hermesApiKey;

    const guide = `# Hermes Agent — Auto-Setup Instructions for SocialSched

## Configuration

Set these two values before running any code:

\`\`\`python
SOCIALSCHED_BASE_URL = "${baseUrl}"
HERMES_API_KEY = "${apiKey}"
\`\`\`

## Authentication

Every request sends this header automatically:
\`\`\`
X-Hermes-API-Key: ${apiKey}
\`\`\`

## Endpoint

\`\`\`
${baseUrl}/api/hermes-external/execute
\`\`\`

## Verify Connection

\`\`\`bash
curl -X POST ${baseUrl}/api/hermes-external/execute \\
  -H "X-Hermes-API-Key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{"action":"get_status"}'
\`\`\`

## Agent Client

### Python

\`\`\`python
import requests
import json
import sys

SOCIALSCHED_BASE_URL = "${baseUrl}"
HERMES_API_KEY = "${apiKey}"

BASE_URL = f"{SOCIALSCHED_BASE_URL.rstrip('/')}/api/hermes-external"
HEADERS = {
    "X-Hermes-API-Key": HERMES_API_KEY,
    "Content-Type": "application/json"
}

class HermesAgent:
    def execute(self, action, payload=None):
        payload = payload or {}
        response = requests.post(
            f"{BASE_URL}/execute",
            headers=HEADERS,
            json={"action": action, "payload": payload},
            timeout=60
        )
        data = response.json()
        if not data.get("success"):
            raise Exception(data.get("error", "Unknown error"))
        return data

    def get_status(self):
        response = requests.get(f"{BASE_URL}/status", headers=HEADERS, timeout=30)
        return response.json()

    # Scheduling
    def schedule_post(self, content, platforms, scheduled_at, timezone="UTC", title=None, post_type="FEED", platform_options=None):
        return self.execute("schedule_post", {
            "content": content,
            "platforms": platforms,
            "scheduledAt": scheduled_at,
            "timezone": timezone,
            "title": title,
            "postType": post_type,
            "platformOptions": platform_options or {}
        })

    def bulk_schedule(self, posts, platforms=None, timezone="UTC"):
        return self.execute("bulk_schedule", {
            "posts": posts,
            "platforms": platforms,
            "timezone": timezone
        })

    def list_posts(self, status=None, platform=None, limit=50):
        payload = {}
        if status: payload["status"] = status
        if platform: payload["platform"] = platform
        payload["limit"] = limit
        return self.execute("list_posts", payload)

    def get_post(self, post_id):
        return self.execute("get_post", {"postId": post_id})

    def delete_post(self, post_id):
        return self.execute("delete_post", {"postId": post_id})

    def cancel_scheduled_post(self, post_id):
        return self.execute("cancel_scheduled_post", {"postId": post_id})

    # Content
    def generate_content(self, prompt):
        return self.execute("generate_content", {"prompt": prompt})

    # Campaigns
    def create_campaign(self, website_url, social_channels, campaign_schedule="daily", **kwargs):
        return self.execute("create_campaign", {
            "websiteUrl": website_url,
            "socialChannels": social_channels,
            "campaignSchedule": campaign_schedule,
            **kwargs
        })

    def list_campaigns(self, is_active=None):
        payload = {}
        if is_active is not None:
            payload["isActive"] = is_active
        return self.execute("list_campaigns", payload)

    def update_campaign(self, campaign_id, **updates):
        return self.execute("update_campaign", {"campaignId": campaign_id, **updates})

    def delete_campaign(self, campaign_id):
        return self.execute("delete_campaign", {"campaignId": campaign_id})

    # Users
    def list_users(self):
        return self.execute("list_users")

    def create_user(self, email, password, name=None, role="user"):
        return self.execute("create_user", {
            "email": email,
            "password": password,
            "name": name,
            "role": role
        })

    def update_user(self, target_user_id, **updates):
        return self.execute("update_user", {"targetUserId": target_user_id, **updates})

    def delete_user(self, target_user_id):
        return self.execute("delete_user", {"targetUserId": target_user_id})

    def change_user_role(self, target_user_id, role):
        return self.execute("change_user_role", {"targetUserId": target_user_id, "role": role})

    # Accounts
    def list_accounts(self):
        return self.execute("list_accounts")

    def disconnect_account(self, account_id):
        return self.execute("disconnect_account", {"accountId": account_id})

    def refresh_account(self, account_id):
        return self.execute("refresh_account", {"accountId": account_id})

    # Health
    def monitor_health(self):
        return self.execute("monitor_health")

    def analyze_accounts(self):
        return self.execute("analyze_accounts")

    # Custom
    def custom(self, prompt):
        return self.execute("custom", {"prompt": prompt})


if __name__ == "__main__":
    agent = HermesAgent()
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        print(json.dumps(agent.get_status(), indent=2))
        sys.exit(0)
    print(json.dumps(agent.get_status(), indent=2))
\`\`\`

### Node.js

\`\`\`javascript
const axios = require('axios');

const SOCIALSCHED_BASE_URL = "${baseUrl}";
const HERMES_API_KEY = "${apiKey}";

const BASE_URL = \`\${SOCIALSCHED_BASE_URL.replace(/\\/\$/, '')}/api/hermes-external\`;
const HEADERS = {
  "X-Hermes-API-Key": HERMES_API_KEY,
  "Content-Type": "application/json"
};

class HermesAgent {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: HEADERS,
      timeout: 60000
    });
  }

  async execute(action, payload = {}) {
    const response = await this.client.post('/execute', { action, payload });
    const data = response.data;
    if (!data.success) throw new Error(data.error || 'Unknown error');
    return data;
  }

  async getStatus() {
    const response = await this.client.get('/status');
    return response.data;
  }

  async schedulePost(options) {
    return this.execute('schedule_post', options);
  }

  async bulkSchedule(options) {
    return this.execute('bulk_schedule', options);
  }

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

  async generateContent(prompt) {
    return this.execute('generate_content', { prompt });
  }

  async createCampaign(options) {
    return this.execute('create_campaign', options);
  }

  async listCampaigns(filters = {}) {
    return this.execute('list_campaigns', filters);
  }

  async updateCampaign(campaignId, updates) {
    return this.execute('update_campaign', { campaignId, ...updates });
  }

  async deleteCampaign(campaignId) {
    return this.execute('delete_campaign', { campaignId });
  }

  async listUsers() {
    return this.execute('list_users');
  }

  async createUser(userData) {
    return this.execute('create_user', userData);
  }

  async updateUser(targetUserId, updates) {
    return this.execute('update_user', { targetUserId, ...updates });
  }

  async deleteUser(targetUserId) {
    return this.execute('delete_user', { targetUserId });
  }

  async changeUserRole(targetUserId, role) {
    return this.execute('change_user_role', { targetUserId, role });
  }

  async listAccounts() {
    return this.execute('list_accounts');
  }

  async disconnectAccount(accountId) {
    return this.execute('disconnect_account', { accountId });
  }

  async refreshAccount(accountId) {
    return this.execute('refresh_account', { accountId });
  }

  async listReels(filters = {}) {
    return this.execute('list_reels', filters);
  }

  async deleteReel(reelId) {
    return this.execute('delete_reel', { reelId });
  }

  async getAnalytics(days = 7) {
    return this.execute('get_analytics', { days });
  }

  async listNotifications(filters = {}) {
    return this.execute('list_notifications', filters);
  }

  async getSettings() {
    return this.execute('get_settings');
  }

  async updateSettings(settings) {
    return this.execute('update_settings', { settings });
  }

  async monitorHealth() {
    return this.execute('monitor_health');
  }

  async analyzeAccounts() {
    return this.execute('analyze_accounts');
  }

  async custom(prompt) {
    return this.execute('custom', { prompt });
  }
}

module.exports = HermesAgent;
\`\`\`

## Ready-to-Run Scripts

### Python Test

\`\`\`python
from hermes_agent import HermesAgent
import json

agent = HermesAgent()

print("=== Connection Status ===")
status = agent.get_status()
print(json.dumps(status, indent=2))

print("\\n=== Schedule Post ===")
result = agent.schedule_post(
    content="Hello from Hermes Agent!",
    platforms=["INSTAGRAM"],
    scheduled_at="2025-08-22T10:00:00Z",
    timezone="UTC"
)
print(json.dumps(result, indent=2))

print("\\n=== List Posts ===")
posts = agent.list_posts()
print(json.dumps(posts, indent=2))
\`\`\`

Run:
\`\`\`bash
python test-agent.py
\`\`\`

### Node.js Test

\`\`\`javascript
const HermesAgent = require('./hermes-agent');
const agent = new HermesAgent();

(async () => {
  try {
    console.log("=== Connection Status ===");
    const status = await agent.getStatus();
    console.log(JSON.stringify(status, null, 2));

    console.log("\\n=== Schedule Post ===");
    const post = await agent.schedulePost({
      content: "Hello from Hermes Agent!",
      platforms: ["INSTAGRAM"],
      scheduledAt: "2025-08-22T10:00:00Z",
      timezone: "UTC"
    });
    console.log(JSON.stringify(post, null, 2));

    console.log("\\n=== List Posts ===");
    const posts = await agent.listPosts();
    console.log(JSON.stringify(posts, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
\`\`\`

Run:
\`\`\`bash
node test-agent.js
\`\`\`

## Complete Scheduling Workflows

### Single Post

\`\`\`python
agent.schedule_post(
    content="Your post text here",
    platforms=["INSTAGRAM", "FACEBOOK"],
    scheduled_at="2025-08-22T10:00:00Z",
    timezone="UTC",
    title="Optional Title",
    post_type="FEED"
)
\`\`\`

### Bulk Schedule (Content Calendar)

\`\`\`python
from datetime import datetime, timedelta

base_date = datetime.now() + timedelta(days=1)
posts = []

for i in range(7):
    post_date = base_date + timedelta(days=i)
    posts.append({
        "content": f"Daily tip #{i+1}: Stay consistent!",
        "platforms": ["INSTAGRAM", "TWITTER"],
        "scheduledAt": post_date.replace(hour=10, minute=0).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "timezone": "UTC"
    })

agent.bulk_schedule(posts, platforms=["INSTAGRAM", "TWITTER"], timezone="UTC")
\`\`\`

### List and Audit Scheduled Posts

\`\`\`python
queued = agent.list_posts(status="QUEUED")
for post in queued["result"]["posts"]:
    print(f"- {post['id']}: {post['rawContent'][:50]}...")
    print(f"  Scheduled: {post['scheduledAt']}")
    print(f"  Platforms: {post['platforms']}")

drafts = agent.list_posts(status="DRAFT")
print(f"\\nDrafts: {len(drafts['result']['posts'])}")
\`\`\`

### Cancel a Scheduled Post

\`\`\`python
agent.cancel_scheduled_post("post-uuid-here")
\`\`\`

### Generate Content with AI

\`\`\`python
result = agent.generate_content("Write a catchy Instagram caption about coffee")
print(result["result"]["text"])
\`\`\`

## Available Actions Reference

| Action | Description | Key Payload Fields |
|--------|-------------|-------------------|
| \`schedule_post\` | Schedule one post | \`content\`, \`platforms[]\`, \`scheduledAt\`, \`timezone\` |
| \`bulk_schedule\` | Schedule many posts | \`posts[]\`, \`platforms[]\`, \`timezone\` |
| \`list_posts\` | List posts | \`status?\`, \`platform?\`, \`limit?\` |
| \`get_post\` | Get post details | \`postId\` |
| \`delete_post\` | Delete post | \`postId\` |
| \`cancel_scheduled_post\` | Cancel queued post | \`postId\` |
| \`generate_content\` | AI text generation | \`prompt\` |
| \`create_campaign\` | Create campaign | \`websiteUrl\`, \`socialChannels[]\` |
| \`list_campaigns\` | List campaigns | \`isActive?\` |
| \`update_campaign\` | Update campaign | \`campaignId\`, fields |
| \`delete_campaign\` | Delete campaign | \`campaignId\` |
| \`list_users\` | List all users | - |
| \`create_user\` | Create user | \`email\`, \`password\`, \`name?\`, \`role?\` |
| \`update_user\` | Update user | \`targetUserId\`, fields |
| \`delete_user\` | Delete user | \`targetUserId\` |
| \`change_user_role\` | Change role | \`targetUserId\`, \`role\` |
| \`list_accounts\` | List social accounts | - |
| \`disconnect_account\` | Remove account | \`accountId\` |
| \`refresh_account\` | Refresh token | \`accountId\` |
| \`list_reels\` | List reels | \`status?\` |
| \`delete_reel\` | Delete reel | \`reelId\` |
| \`get_analytics\` | Get analytics | \`days?\` |
| \`list_notifications\` | List notifications | \`isRead?\` |
| \`get_settings\` | Get settings | - |
| \`update_settings\` | Update settings | \`settings{}\` |
| \`monitor_health\` | System health | - |
| \`analyze_accounts\` | Account health | - |
| \`custom\` | AI command | \`prompt\` |

## Response Format

All responses return:
\`\`\`json
{
  "success": true,
  "action": "schedule_post",
  "taskId": "task-uuid",
  "result": { /* action-specific data */ },
  "duration": 1234
}
\`\`\`

On error:
\`\`\`json
{
  "success": false,
  "error": "Error message"
}
\`\`\`

## Error Handling

\`\`\`python
try:
    result = agent.schedule_post(...)
except Exception as e:
    if "Unauthorized" in str(e):
        print("Invalid API key - regenerate from /dashboard/hermes-connection")
    elif "required" in str(e):
        print("Missing required field:", str(e))
    else:
        print("Error:", str(e))
\`\`\`

## Platform Names

Use exact names:
- \`INSTAGRAM\`
- \`FACEBOOK\`
- \`TWITTER\`
- \`LINKEDIN\`
- \`YOUTUBE\`
- \`THREADS\`
- \`PINTEREST\`
- \`SNAPCHAT\`

## Post Types

- \`FEED\` — Standard post
- \`REEL\` — Instagram/Facebook Reel
- \`STORY\` — Instagram/Facebook Story

## Timezone Format

Use IANA timezone names:
- \`UTC\`
- \`America/New_York\`
- \`Europe/London\`
- \`Asia/Kolkata\`

## Scheduled Time Format

ISO 8601 only:
\`\`\`
2025-08-22T10:00:00Z
2025-08-22T10:00:00+05:30
\`\`\`

## Quick Reference

| Task | Command |
|------|---------|
| Test connection | \`agent.get_status()\` |
| Schedule post | \`agent.schedule_post(content, platforms, scheduled_at)\` |
| Bulk schedule | \`agent.bulk_schedule(posts, platforms)\` |
| List posts | \`agent.list_posts(status="QUEUED")\` |
| Cancel post | \`agent.cancel_scheduled_post(post_id)\` |
| Delete post | \`agent.delete_post(post_id)\` |
| Generate content | \`agent.generate_content(prompt)\` |
| Create campaign | \`agent.create_campaign(website_url, social_channels)\` |
| List users | \`agent.list_users()\` |
| Create user | \`agent.create_user(email, password, name, role)\` |
| Health check | \`agent.monitor_health()\` |
| Custom AI | \`agent.custom(prompt)\` |
`;

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="hermes-agent-setup.md"');
    res.send(guide);
  } catch (error: any) {
    console.error('[HERMES CONNECTION] Setup guide error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate setup guide' });
  }
});

export const hermesConnectionRoutes = router;
