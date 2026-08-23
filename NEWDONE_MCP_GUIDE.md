# ⚡ Newdone MCP Server — Agent Usage Guide

This guide details how to interact with the **Newdone MCP Server** to automate social media campaigns, schedule posts, manage accounts, and monitor analytics.

---

## 1. Overview & Workflow

Once your MCP connection is active, you can instruct your AI assistant (Claude, Antigravity, Cursor, etc.) using natural language prompts. The assistant will invoke the corresponding `newdone_*` tools automatically.

---

## 2. Agent Usage Workflows & Prompts

### 🎬 Workflow 1: Create a Video Reel Campaign (`reels-creator`)
Creates an automated AI video reel series from a website link or product specs.

- **Target Route**: [`https://socialsched.vibeship.in/dashboard/reels-creator`](https://socialsched.vibeship.in/dashboard/reels-creator)
- **Tool Executed**: `newdone_create_reel_campaign`
- **Dashboard Label**: Displays with an **`⚡ MCP`** badge in the Reel Creator Archive.

**Prompt Example:**
> *"Create a daily AI Reel Video campaign for https://mybrand.com on Instagram and TikTok with voice Aoede."*

**JSON Payload Sent by AI:**
```json
{
  "name": "newdone_create_reel_campaign",
  "arguments": {
    "websiteUrl": "https://mybrand.com",
    "socialChannels": ["INSTAGRAM", "TIKTOK"],
    "campaignSchedule": "daily",
    "language": "English",
    "voiceId": "Aoede"
  }
}
```

---

### 📸 Workflow 2: Create a Post Carousel Campaign (`post-creator`)
Creates a multi-slide Instagram image carousel campaign with locked design systems and slide storyboards.

- **Target Route**: [`https://socialsched.vibeship.in/dashboard/post-creator`](https://socialsched.vibeship.in/dashboard/post-creator)
- **Tool Executed**: `newdone_create_post_campaign`
- **Dashboard Label**: Displays instantly in the **Campaign Archive** with an **`⚡ MCP`** badge.

**Prompt Example:**
> *"Create a 4-slide Instagram Carousel post campaign for 'Silk Anarkali Suit' with a Festive & Luxury Studio mood highlighting handcrafted zari embroidery."*

**JSON Payload Sent by AI:**
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

### 📅 Workflow 3: Schedule Posts to Social Channels

#### Single Post:
> *"Schedule a post to Instagram and Facebook for tomorrow at 10:00 AM UTC with caption: 'Exciting new collection launching today! ✨ Shop link in bio.'"*

**Tool Executed**: `newdone_schedule_post`

#### Bulk Schedule:
> *"Schedule 3 posts across this week for Twitter and LinkedIn introducing our new AI features."*

**Tool Executed**: `newdone_bulk_schedule`

---

### 📊 Workflow 4: Manage Accounts & Check Analytics

#### Check Status & Connected Channels:
> *"List all my connected social media accounts and check Newdone system status."*

**Tools Executed**: `newdone_status` and `newdone_list_accounts`

#### Fetch Analytics:
> *"Show me my social media analytics and engagement performance for the last 7 days."*

**Tool Executed**: `newdone_get_analytics`

---

## 3. Tool Quick Reference

| Tool Name | Action / Purpose | Key Inputs |
| :--- | :--- | :--- |
| `newdone_status` | Check system & agent health | None |
| `newdone_create_reel_campaign` | Create automated video Reel campaign | `websiteUrl`, `socialChannels`, `campaignSchedule`, `voiceId` |
| `newdone_create_post_campaign` | Create multi-slide Instagram Carousel campaign | `productName`, `description`, `platform`, `mood`, `usp` |
| `newdone_create_campaign` | Unified campaign creator wrapper | `campaignType` (`"reel"` or `"post"`), `websiteUrl`, `productName` |
| `newdone_schedule_post` | Schedule a single post | `content`, `platforms`, `scheduledAt`, `timezone` |
| `newdone_bulk_schedule` | Schedule multiple posts at once | `posts: [{ content, platforms, scheduledAt }]` |
| `newdone_list_accounts` | List connected social accounts | None |
| `newdone_list_campaigns` | List active/archived campaigns | `isActive` |
| `newdone_get_analytics` | Fetch engagement analytics | `days` (default `7`) |
| `newdone_custom` | Execute free-form autonomous agent instructions | `prompt` |
