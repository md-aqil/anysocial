# 🚀 Newdone MCP Server — Agent Quickstart Guide

The **Newdone Model Context Protocol (MCP) Server** enables AI assistants (Claude, Antigravity, Cursor, ChatGPT, etc.) to create social media campaigns, schedule posts, manage accounts, and fetch analytics directly from your workspace.

---

## 1. Installation & Configuration

Add this configuration to `.mcp.json` in your workspace root (or in `claude_desktop_config.json`):

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

> 🔑 **Get your API key**: Open [`https://socialsched.vibeship.in/dashboard/hermes-connection`](https://socialsched.vibeship.in/dashboard/hermes-connection) and click **"Generate API Key"**.

---

## 2. How to Use It (Step-by-Step Agent Guide)

Once installed, simply chat with your AI Assistant using natural language prompts. The AI will invoke the appropriate `newdone_*` tool automatically.

### Step 1: Verify Your Connection
Tell your AI:
> *"Check my Newdone connection status and list my connected social media channels."*

The AI calls: `newdone_status` and `newdone_list_accounts`.

---

### Step 2: Create Campaigns

Newdone supports **two distinct campaign creators**:

#### A. Create a Reel Campaign (`reels-creator`)
Use this for automated video reel series generated from website links or product URLs.

**Prompt to AI:**
> *"Create a daily AI Reel Video campaign for https://mybrand.com on Instagram and TikTok."*

**Tool Executed:** `newdone_create_reel_campaign`
- **Dashboard View:** Appears in **Reel Creator Archive** (`https://socialsched.vibeship.in/dashboard/reels-creator`) with an **`⚡ MCP`** badge.

---

#### B. Create a Post / Carousel Campaign (`post-creator`)
Use this for multi-slide Instagram image carousels or post ad creatives with locked design systems.

**Prompt to AI:**
> *"Create a 4-slide Instagram Carousel post campaign for 'Silk Anarkali Suit' with a Festive & Luxury Studio mood highlighting handcrafted zari embroidery."*

**Tool Executed:** `newdone_create_post_campaign`
- **Dashboard View:** Appears instantly in **Campaign Archive** (`https://socialsched.vibeship.in/dashboard/post-creator`) with live progress and an **`⚡ MCP`** badge.

---

### Step 3: Schedule Posts to Social Media

**Prompt to AI:**
> *"Schedule a post to Instagram and Facebook for tomorrow at 10:00 AM UTC with caption: 'Exciting new collection launching today! ✨ Shop link in bio.'"*

**Tool Executed:** `newdone_schedule_post`
- **Dashboard View:** Appears on the calendar (`https://socialsched.vibeship.in/dashboard/calendar`).

---

### Step 4: Track Analytics & Campaign History

**Prompt to AI:**
> *"Show me my active campaigns and engagement analytics for the last 7 days."*

**Tools Executed:** `newdone_list_campaigns` and `newdone_get_analytics`.

---

## 3. Complete MCP Tool Reference

| Tool | Purpose | Key Inputs |
| :--- | :--- | :--- |
| `newdone_status` | Check system & connection health | None |
| `newdone_create_reel_campaign` | Create automated video Reel campaign | `websiteUrl`, `socialChannels`, `campaignSchedule`, `voiceId` |
| `newdone_create_post_campaign` | Create multi-slide Instagram Carousel campaign | `productName`, `description`, `platform`, `mood`, `usp` |
| `newdone_create_campaign` | General campaign wrapper | `campaignType` (`"reel"` or `"post"`), `websiteUrl`, `productName` |
| `newdone_schedule_post` | Schedule a single post | `content`, `platforms`, `scheduledAt`, `timezone` |
| `newdone_bulk_schedule` | Schedule multiple posts at once | `posts: [{ content, platforms, scheduledAt }]` |
| `newdone_list_accounts` | List connected social channels | None |
| `newdone_list_campaigns` | List active/archived campaigns | `isActive` |
| `newdone_get_analytics` | Get analytics metrics | `days` (default `7`) |

---

## 4. Testing Your MCP Setup

To test the MCP server directly from your terminal:

```bash
npm run test:mcp
```
