# ⚡ Newdone MCP Server — Master Agent Guide & Application Capabilities

This guide provides AI assistants (Claude, Antigravity, Cursor, Hermes, etc.) with a complete understanding of the **Newdone Social Media Automation Application**, its campaign engines, prompt structures, and tools.

---

## 1. Understanding the Application Architecture

SocialSched / Newdone has **two core AI content creation engines**:

1. **Reel Creator Engine (`reels-creator`)**:
   - **Route**: [`https://socialsched.vibeship.in/dashboard/reels-creator`](https://socialsched.vibeship.in/dashboard/reels-creator)
   - **Purpose**: Generates automated short-form video reels (Instagram Reels, YouTube Shorts, TikToks).
   - **What it does**: Scrapes e-commerce sites, extracts product photos, animates static images into video motion using AI motion synthesis, generates high-converting narration scripts, and synthesizes natural AI voiceovers (`Aoede`, `Puck`, `Fenrir`, `Kore`, `Charon`).
   - **MCP Tool**: `newdone_create_reel_campaign`

2. **Post Carousel Creator Engine (`post-creator`)**:
   - **Route**: [`https://socialsched.vibeship.in/dashboard/post-creator`](https://socialsched.vibeship.in/dashboard/post-creator)
   - **Purpose**: Generates cohesive 4-slide Instagram Carousel & Image Post Ad campaigns with a **locked design system**.
   - **What it does**:
     - **Slide 1 (Cover / Hook)**: Scroll-stopping hero graphic + buying-trigger headline.
     - **Slide 2 (Aspirational Lifestyle)**: Authentic model in-action shot demonstrating real-life wear/use.
     - **Slide 3 (Spotlight Angle & Detail)**: Focuses on back view, fabric texture, intricate embroidery, or secondary angle.
     - **Slide 4 (High-Conversion End-Card)**: Limited batch offer, trust badges, and bold "Tap link in bio to shop" action callout.
   - **MCP Tool**: `newdone_create_post_campaign`

---

## 2. Master Agent Prompting & Field Matrix

When creating post campaigns, AI agents can populate specific parameters to guide visual style, model poses, camera angles, and negative constraints:

| Field Name | Description | Example Agent Inputs | Best Result Outcome |
| :--- | :--- | :--- | :--- |
| `websiteUrl` / `url` | Shop or Product Page Link | `"https://shop.com/products/silk-suit"` | Automatically scrapes all high-res product photos and specs. |
| `specialInstructions` / `aiGuidance` | **Special Pose & AI Guidance** | `"Diwali festive golden lighting. Don't include text overlays on images. Model in traditional posture."` | Enforces festival themes, negative constraints ("don't include..."), and prompt rules. |
| `specialPose` | **Model Pose & Stance** | `"Standing 3/4 turn model pose holding dupatta at chest level"` | Directs character positioning and body stance in AI image generation. |
| `cameraGuide` | **Camera Composition** | `"45-degree elevated product zoom with shallow depth of field"` | Controls lens angle, zoom level, and framing style. |
| `styleGuide` | **Lighting & Art Style** | `"Cinematic softbox studio lighting, warm film grain"` | Controls set lighting quality, shadow depth, and color grade. |
| `mood` | **Visual Atmosphere** | `"Festive"`, `"Diwali"`, `"Luxury Studio"`, `"High Energy"`, `"Minimalist"` | Sets global visual tone across all 4 carousel slides. |
| `usp` | **Unique Selling Proposition** | `"100% Pure Chanderi Silk with Handcrafted Zari Embroidery"` | Drives on-image headlines and slide 3 detail focus. |
| `platform` | **Target Format** | `"INSTAGRAM"`, `"INSTAGRAM_STORY"`, `"FACEBOOK"`, `"THREADS"` | Formats aspect ratios (4:5 feed, 9:16 story). |

---

## 3. High-Result Agent Usage Examples

### 🎬 Example 1: Creating a Reel Video Campaign (`reels-creator`)
> *"Create a daily AI Reel Video campaign for https://mybrand.com targeting fashion enthusiasts on Instagram and YouTube Shorts in English with voice Aoede."*

**JSON Tool Call:**
```json
{
  "name": "newdone_create_reel_campaign",
  "arguments": {
    "websiteUrl": "https://mybrand.com",
    "socialChannels": ["INSTAGRAM", "YOUTUBE"],
    "campaignSchedule": "daily",
    "language": "English",
    "voiceId": "Aoede",
    "voicePrompt": "High-energy fast-paced hook highlighting product benefits with upbeat enthusiasm",
    "ingredientsToVideo": true,
    "imageToVideo": true,
    "animateImageCount": 3
  }
}
```

---

### 📸 Example 2: Creating a 4-Slide Festive Carousel Campaign (`post-creator`)
> *"Create a 4-slide Instagram Carousel post campaign for 'Silk Anarkali Suit' with a Festive Diwali mood. Don't include text overlays on images. Model in traditional standing pose."*

**JSON Tool Call:**
```json
{
  "name": "newdone_create_post_campaign",
  "arguments": {
    "productName": "Silk Anarkali Suit",
    "description": "Hand-embroidered pure Chanderi silk Anarkali suit with zari dupatta",
    "websiteUrl": "https://mybrand.com/products/anarkali-suit",
    "platform": "INSTAGRAM",
    "mood": "Festive Diwali",
    "usp": "100% Handcrafted Zari Embroidery",
    "specialInstructions": "Diwali festival golden warm lighting. Don't include text overlay on images.",
    "specialPose": "Standing 3/4 turn model pose showcasing zari embroidery on dupatta",
    "cameraGuide": "45-degree elevated product zoom with shallow depth of field",
    "styleGuide": "Cinematic softbox studio lighting, warm festive color grading"
  }
}
```

---

### 📅 Example 3: Scheduling a Post with Delay Countdown
> *"Schedule a post to Instagram and Facebook for tomorrow at 10:00 AM UTC with caption: 'Diwali collection live now! ✨ Shop link in bio.'"*

**JSON Tool Call:**
```json
{
  "name": "newdone_schedule_post",
  "arguments": {
    "content": "Diwali collection live now! ✨ Shop link in bio.",
    "platforms": ["INSTAGRAM", "FACEBOOK"],
    "scheduledAt": "2026-08-24T10:00:00Z",
    "timezone": "UTC"
  }
}
```

---

## 4. Execution Metrics & Status Reporting

Every tool call returns detailed timing and delay metrics so AI agents understand execution speed and scheduling countdowns:

```json
{
  "success": true,
  "action": "post_scheduled",
  "status": "QUEUED",
  "scheduledAt": "2026-08-24T10:00:00.000Z",
  "delaySeconds": 60540,
  "delayFormatted": "16h 49m 0s from now (2026-08-24T10:00:00.000Z)",
  "executionDuration": {
    "ms": 1420,
    "formatted": "1.42s"
  },
  "message": "Post scheduled successfully for INSTAGRAM, FACEBOOK. 16h 49m 0s from now (2026-08-24T10:00:00.000Z)"
}
```

---

## 5. Quick Tool Summary

| Tool | Action | Key Inputs |
| :--- | :--- | :--- |
| `newdone_status` | System health check | None |
| `newdone_create_reel_campaign` | Automated Video Reel Campaign | `websiteUrl`, `socialChannels`, `campaignSchedule`, `voiceId`, `voicePrompt` |
| `newdone_create_post_campaign` | 4-Slide Carousel Post Campaign | `productName`, `description`, `websiteUrl`, `mood`, `specialInstructions`, `specialPose`, `cameraGuide`, `styleGuide` |
| `newdone_create_campaign` | General campaign creator | `campaignType` (`"reel"` or `"post"`), `websiteUrl`, `productName` |
| `newdone_schedule_post` | Schedule social post | `content`, `platforms`, `scheduledAt`, `timezone` |
| `newdone_bulk_schedule` | Schedule multiple posts | `posts: [{ content, platforms, scheduledAt }]` |
| `newdone_list_accounts` | Connected accounts | None |
| `newdone_list_campaigns` | Campaign history | `isActive` |
| `newdone_get_analytics` | Engagement metrics | `days` |
