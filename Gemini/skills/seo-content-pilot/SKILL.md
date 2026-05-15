---
name: seo-content-pilot
description: Use when someone says "write today's social posts", "plan this week's social content", "generate captions for [client]", or asks to create social media copy, engagement-driven posts, or platform-specific content for a business.
argument-hint: [client-name, e.g. dharmartha]
disable-model-invocation: false
---

# Social Media Content Pilot v2.0

## What This Skill Does

Autonomously plans and writes premium social media copy based on a client's business goals and content pillars. It generates platform-specific variations (Instagram, LinkedIn, Facebook, etc.) with high-impact hooks, emotional triggers, and calls-to-action designed for maximum engagement.

---

## Step 1 — Load Client Context

Read the following two files. Replace `[client]` with `$ARGUMENTS` (the client slug passed by the user, e.g. `dharmartha`).

1. **`clients/[client]/business_brief.md`** — Understand:
   - The business niche and sub-topics
   - Target audience (geography, demographics, intent)
   - Brand voice (e.g. casual, professional, provocative)
   - Core Content Pillars (the 3-5 main themes the brand talks about)

2. **`clients/[client]/used_keywords.md`** — Load the list of topics/angles already covered. Ensure today's post offers a fresh perspective or continues a high-performing thread.

---

## Step 2 — Decide Today's Content Angle

Using the business brief and used topics, select a **Content Pillar** and a **Specific Angle** for today's social posts.

1. **Pillar Rotation** — Ensure all core themes are being balanced throughout the week.
2. **Engagement Type** — Decide the primary goal: Edutainment, Inspiration, Hard Sell, or Community Building.
3. **Freshness Check** — Don't repeat the exact same angle within a 14-day window.

**Output to user:**
```
🎯 Today's Pillar: [Pillar Name]
🔥 Angle: [Brief description of the specific angle/story]
💡 Engagement Goal: [Inspiration / Education / Sales / Conversation]
📝 Rationale: [Why this is timely or relevant]
```

---

## Step 3 — The Hook Analysis (Critical)

For social media, the first sentence is everything. Propose **3 distinct hooks** for the user to choose from:

1. **The Question** — Sparks immediate mental participation.
2. **The Bold Claim** — Stops the scroll with conviction or surprise.
3. **The Relatable Pain/Relief** — Anchors to a specific problem the audience has right now.

---

## Step 4 — Write Platform-Specific Variations

Once the angle and hook are selected, write the copy for the top 3 platforms (or whichever the user specified in the brief):

### 📸 Instagram / Facebook (Visual Storytelling)
- **Structure**: Hook → Story/Value → CTA → Hashtags.
- **Tone**: Human, emotive, formatted with white space for readability.
- **Emoji Strategy**: Use 3-5 relevant emojis to guide the eye.
- **CTA**: Engagement-focused (e.g., "Tell me below", "Share with a friend").

### 💼 LinkedIn (Professional Authority)
- **Structure**: Paradox/Point → Detailed Insight/Framework → Professional Takeaway → CTA.
- **Tone**: Authoritative yet accessible. Lead with "I" or "We" to build personal brand.
- **Formatting**: Short crisp lines. Use bullet points for lists.
- **Hashtags**: 3 specific professional tags.

### 🐦 Twitter/X (Punchy & Viral)
- **Structure**: Hook → 2-3 supporting lines → "Read more" style CTA or Thread-start.
- **Character Count**: Max 280 characters.
- **Tone**: Direct, witty, or polarizing.

### 🎥 YouTube (Search-Optimized Video)
- **Title**: High-CTR title with the primary keyword positioned in the first 40 characters.
- **Description**: 
  - **The Search Hook**: First 2-3 lines must include the core keywords for search preview.
  - **The Value Body**: Detailed breakdown of the video content.
  - **Chapters/Timestamps**: Suggest 3-5 timestamps for key moments.
  - **Meta Data**: Include 3-5 relevant hashtags at the bottom.
- **SEO Tags**: Provide 10-12 comma-separated tags based on competitor search volume and client niche.

---

## Step 5 — Visual Direction Suggestion

For each post, suggest a **Visual Concept** that would complement the copy (e.g. "Minimalist graphic with big text", "BTS video of the team", "Dramatic product shot").

---

## Step 6 — Self-Audit: Engagement Checklist

Instead of SEO rules, audit the copy against these **Engagement Standards**:

- [ ] **First 5 words stop the scroll?**
- [ ] **Call-to-Action is clear and single-focused?**
- [ ] **Formatting avoids "The Wall of Text"?**
- [ ] **Tone matches the Brand Voice in business_brief.md?**
- [ ] **Value is provided before the "Ask"?**
- [ ] **Platform-specific constraints (char count, hashtag limits) respected?**

---

## Step 7 — Save and Update Log

1. Save the social package to:
   ```
   clients/[client]/social-posts/YYYY-MM-DD-[angle-slug].md
   ```

2. Update `clients/[client]/used_keywords.md`:
   ```
   YYYY-MM-DD | Social: [Angle Title] | [Pillar] | [Engagement Goal]
   ```

---

## Notes & Guardrails

- **NEVER** write generic "Happy Monday" style posts. Every post must provide value or drive a goal.
- **NEVER** use the same hook twice in a row.
- **ALWAYS** check the brand voice. If the brand is "Premium Minimalist," don't use 20 emojis.
- **ALWAYS** provide hashtags that are a mix of broad and niche.
