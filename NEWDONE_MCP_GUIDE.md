# 🚀 Newdone MCP Server — Agent Quickstart Guide

The **Newdone Model Context Protocol (MCP) Server** enables AI assistants (Claude, Antigravity, Cursor, ChatGPT, etc.) to automate social media campaigns, schedule posts, manage accounts, and fetch analytics directly from your workspace.

---

## 1. Quick Setup (`.mcp.json`)

Add the following to your project's `.mcp.json` or your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "newdone": {
      "command": "node",
      "args": [
        "mcp/dist/hermes-mcp-server.mjs"
      ],
      "env": {
        "HERMES_BASE_URL": "https://socialsched.vibeship.in",
        "HERMES_API_KEY": "YOUR_NEWDONE_API_KEY"
      }
    }
  }
}
```

> 🔑 Get your API key from the **Newdone AI Co-Pilot** settings page: `https://socialsched.vibeship.in/dashboard/hermes-connection`

---

## 2. Core MCP Tools

| Tool Name | Purpose | Key Parameters | Target Dashboard Route |
| :--- | :--- | :--- | :--- |
| `newdone_status` | Check agent status & task stats | None | Overview |
| `newdone_create_reel_campaign` | Create automated AI Video Reel Campaign | `websiteUrl`, `socialChannels`, `schedule`, `voiceId` | [`/dashboard/reels-creator`](https://socialsched.vibeship.in/dashboard/reels-creator) |
| `newdone_create_post_campaign` | Create multi-slide Instagram Carousel/Post Campaign | `productName`, `description`, `platform`, `mood`, `usp` | [`/dashboard/post-creator`](https://socialsched.vibeship.in/dashboard/post-creator) |
| `newdone_create_campaign` | Unified creator wrapper | `campaignType` (`"reel"` or `"post"`), `websiteUrl`, `productName` | Multi-creator |
| `newdone_schedule_post` | Schedule a single social post | `content`, `platforms`, `scheduledAt`, `timezone` | [`/dashboard/calendar`](https://socialsched.vibeship.in/dashboard/calendar) |
| `newdone_bulk_schedule` | Schedule multiple posts at once | `posts: [{ content, platforms, scheduledAt }]` | [`/dashboard/calendar`](https://socialsched.vibeship.in/dashboard/calendar) |
| `newdone_list_accounts` | List connected social channels | None | [`/dashboard/social-accounts`](https://socialsched.vibeship.in/dashboard/social-accounts) |
| `newdone_list_campaigns` | List active/archived campaigns | `isActive` | Campaign Archive |
| `newdone_get_analytics` | Fetch engagement metrics | `days` (default `7`) | [`/dashboard/analytics`](https://socialsched.vibeship.in/dashboard/analytics) |

---

## 3. Example AI Prompts

### 🎬 Create a Reel Campaign (`reels-creator`)
> "Connect to Newdone MCP and create an automated daily Reel video campaign for my website https://mybrand.com on Instagram and YouTube Shorts."

**MCP Tool Call:**
```json
{
  "name": "newdone_create_reel_campaign",
  "arguments": {
    "websiteUrl": "https://mybrand.com",
    "socialChannels": ["INSTAGRAM", "YOUTUBE"],
    "campaignSchedule": "daily",
    "language": "English",
    "voiceId": "Aoede"
  }
}
```

---

### 📸 Create a Post Carousel Campaign (`post-creator`)
> "Create a 4-slide Instagram Carousel post campaign for 'Silk Anarkali Suit' with a Festive & Luxury Studio mood highlighting handcrafted zari embroidery."

**MCP Tool Call:**
```json
{
  "name": "newdone_create_post_campaign",
  "arguments": {
    "productName": "Silk Anarkali Suit",
    "description": "Hand-embroidered pure Chanderi silk Anarkali suit with zari dupatta",
    "platform": "INSTAGRAM",
    "mood": "Festive Luxury Studio",
    "usp": "100% Handcrafted Zari Embroidery"
  }
}
```

---

### 📅 Schedule a Social Post
> "Schedule a post to Instagram and Facebook for tomorrow at 10:00 AM UTC with caption: 'Exciting news dropping soon! ✨ #launch'"

**MCP Tool Call:**
```json
{
  "name": "newdone_schedule_post",
  "arguments": {
    "content": "Exciting news dropping soon! ✨ #launch",
    "platforms": ["INSTAGRAM", "FACEBOOK"],
    "scheduledAt": "2026-08-24T10:00:00Z",
    "timezone": "UTC"
  }
}
```

---

## 4. Testing Your MCP Connection

Run the built-in CLI test script to verify your setup:

```bash
npm run test:mcp
```
