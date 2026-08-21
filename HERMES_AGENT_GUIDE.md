# Hermes Agent — SocialSched Scheduling & Posting Guide

## Setup

### 1. Environment Variables
```env
SOCIALSCHED_API_URL=https://your-domain.com
HERMES_API_KEY=hermes_a1b2c3d4e5f6...
```

### 2. Install
```bash
pip install requests python-dotenv
# OR
npm install axios dotenv
```

## Core Actions

### Check Connection
```python
# Python
bot = HermesBot()
status = bot.get_status()
print(f"Status: {status['status']}")

# Node.js
const bot = new HermesBot();
const status = await bot.getStatus();
```

### Schedule a Post
```python
result = bot.schedule_post({
    'content': 'Your post text here',
    'platforms': ['INSTAGRAM', 'FACEBOOK', 'TWITTER'],
    'scheduledAt': '2025-01-15T10:00:00Z',
    'timezone': 'UTC',
    'title': 'Optional Title',
    'postType': 'FEED'  # FEED, REEL, or STORY
})
print(f"Post ID: {result['result']['postId']}")
```

### Bulk Schedule Posts
```python
result = bot.bulk_schedule({
    'platforms': ['INSTAGRAM', 'FACEBOOK'],
    'timezone': 'UTC',
    'posts': [
        {
            'content': 'Post 1 content',
            'title': 'Post 1 Title',
            'scheduledAt': '2025-01-15T10:00:00Z'
        },
        {
            'content': 'Post 2 content',
            'scheduledAt': '2025-01-15T14:00:00Z'
        }
    ]
})
print(f"Scheduled: {result['result']['success']}/{result['result']['total']}")
```

### List Posts
```python
# List all posts
posts = bot.list_posts()

# Filter by status
draft_posts = bot.list_posts({'status': 'DRAFT'})
scheduled_posts = bot.list_posts({'status': 'QUEUED'})
published_posts = bot.list_posts({'status': 'PUBLISHED'})

# Filter by platform
ig_posts = bot.list_posts({'platform': 'INSTAGRAM'})
```

### Get Post Details
```python
post = bot.get_post('post-uuid-here')
print(f"Status: {post['result']['post']['status']}")
print(f"Platforms: {post['result']['post']['platforms']}")
```

### Cancel Scheduled Post
```python
bot.cancel_scheduled_post('post-uuid-here')
```

### Delete Post
```python
bot.delete_post('post-uuid-here')
```

## Minimal Bot Client

### Python (bot.py)
```python
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class HermesBot:
    def __init__(self):
        self.base_url = os.getenv('SOCIALSCHED_API_URL', '').rstrip('/')
        self.api_key = os.getenv('HERMES_API_KEY')
        self.session = requests.Session()
        self.session.headers.update({
            'X-Hermes-API-Key': self.api_key,
            'Content-Type': 'application/json'
        })
        self.base_url = f"{self.base_url}/api/hermes-external"

    def execute(self, action, payload=None):
        payload = payload or {}
        response = self.session.post(
            f"{self.base_url}/execute",
            json={'action': action, 'payload': payload},
            timeout=30
        )
        response.raise_for_status()
        return response.json()

    def get_status(self):
        response = self.session.get(f"{self.base_url}/status", timeout=30)
        response.raise_for_status()
        return response.json()

    def schedule_post(self, options):
        return self.execute('schedule_post', options)

    def bulk_schedule(self, options):
        return self.execute('bulk_schedule', options)

    def list_posts(self, filters=None):
        return self.execute('list_posts', filters or {})

    def get_post(self, post_id):
        return self.execute('get_post', {'postId': post_id})

    def delete_post(self, post_id):
        return self.execute('delete_post', {'postId': post_id})

    def cancel_scheduled_post(self, post_id):
        return self.execute('cancel_scheduled_post', {'postId': post_id})
```

### Node.js (bot.js)
```javascript
const axios = require('axios');
require('dotenv').config();

class HermesBot {
  constructor() {
    this.baseURL = process.env.SOCIALSCHED_API_URL.replace(/\/$/, '');
    this.apiKey = process.env.HERMES_API_KEY;
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
    const response = await this.client.post('/execute', { action, payload });
    return response.data;
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
}

module.exports = HermesBot;
```

## Example Usage

### Schedule a Single Post
```python
from bot import HermesBot

bot = HermesBot()

# Schedule post for tomorrow at 10 AM UTC
result = bot.schedule_post({
    'content': 'Check out our latest update!',
    'platforms': ['INSTAGRAM', 'FACEBOOK'],
    'scheduledAt': '2025-01-15T10:00:00Z',
    'timezone': 'UTC'
})

print(f"Post scheduled: {result['result']['postId']}")
print(f"Status: {result['result']['status']}")
```

### Bulk Schedule Weekly Content
```python
from bot import HermesBot
from datetime import datetime, timedelta

bot = HermesBot()

base_date = datetime.now() + timedelta(days=1)

posts = []
for i in range(7):
    post_date = base_date + timedelta(days=i)
    posts.append({
        'content': f'Daily tip #{i+1}: Stay consistent!',
        'platforms': ['INSTAGRAM', 'TWITTER'],
        'scheduledAt': post_date.replace(hour=10, minute=0).isoformat() + 'Z',
        'timezone': 'UTC'
    })

result = bot.bulk_schedule({
    'platforms': ['INSTAGRAM', 'TWITTER'],
    'timezone': 'UTC',
    'posts': posts
})

print(f"Scheduled {result['result']['success']} posts")
```

### Check What's Scheduled
```python
from bot import HermesBot

bot = HermesBot()

# Get all scheduled posts
scheduled = bot.list_posts({'status': 'QUEUED'})
for post in scheduled['result']['posts']:
    print(f"- {post['id']}: {post['rawContent'][:50]}...")
    print(f"  Scheduled: {post['scheduledAt']}")
    print(f"  Platforms: {post['platforms']}")

# Get all drafts
drafts = bot.list_posts({'status': 'DRAFT'})
print(f"\nDrafts: {len(drafts['result']['posts'])}")
```

### Cancel a Scheduled Post
```python
bot.cancel_scheduled_post('post-uuid-here')
```

## Important Notes

### Post Types
- `FEED` — Standard post (default)
- `REEL` — Instagram/Facebook Reel
- `STORY` — Instagram/Facebook Story

### Platform Names
Use exact platform names:
- `INSTAGRAM`
- `FACEBOOK`
- `TWITTER`
- `LINKEDIN`
- `YOUTUBE`
- `THREADS`
- `PINTEREST`
- `SNAPCHAT`

### Timezone
Always use IANA timezone names:
- `UTC`
- `America/New_York`
- `Europe/London`
- `Asia/Kolkata`

### Scheduled Time Format
Use ISO 8601 format:
```python
# Good
'2025-01-15T10:00:00Z'
'2025-01-15T10:00:00+05:30'

# Bad
'Jan 15, 2025 10:00 AM'
'15/01/2025 10:00'
```

## Error Handling

```python
from bot import HermesBot

bot = HermesBot()

try:
    result = bot.schedule_post({
        'content': 'Hello',
        'platforms': ['INSTAGRAM']
    })
except Exception as e:
    if 'Unauthorized' in str(e):
        print("Invalid API key")
    elif 'required' in str(e):
        print("Missing required field")
    else:
        print(f"Error: {e}")
```

## Response Format

All responses follow this structure:
```python
{
    'success': True/False,
    'action': 'schedule_post',
    'taskId': 'task-uuid',
    'result': {
        # Action-specific data
        'postId': 'post-uuid',
        'jobIds': ['job-1', 'job-2'],
        'status': 'QUEUED'
    },
    'duration': 1234  # milliseconds
}
```

## Rate Limits

- Max 100 requests per minute per API key
- Scheduling is async — posts are queued and processed by workers
- Media uploads may take longer (30-60s timeout)
