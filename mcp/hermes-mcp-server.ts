import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";

// Load a local .env if present without external dependencies
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || "").trim().replace(/^['"]|['"]$/g, "");
      }
    }
  }
} catch (_) {}

const BASE_URL = (process.env.HERMES_BASE_URL || "https://socialsched.vibeship.in").replace(/\/$/, "");
const API_KEY = process.env.HERMES_API_KEY || "";

if (!API_KEY) {
  console.error("[hermes-mcp] Missing HERMES_API_KEY. Set it in the env or a .env file next to this server.");
}

type ToolDef = {
  name: string;
  description: string;
  action?: string;            // if omitted, treated as a status call
  method?: "execute" | "status";
  schema: z.ZodRawShape;
};

async function hermesExecute(action: string, payload: unknown, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`${BASE_URL}/api/hermes-external/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hermes-API-Key": API_KEY,
        },
        body: JSON.stringify({ action, payload }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const text = await res.text();
      try {
        const json = JSON.parse(text);
        if (!res.ok) {
          return { success: false, error: json.error || `HTTP ${res.status}: ${res.statusText}`, details: json };
        }
        return json;
      } catch (parseErr) {
        return { success: false, error: `Invalid response from server (HTTP ${res.status})`, raw: text.slice(0, 300) };
      }
    } catch (err: any) {
      if (i === retries) {
        return {
          success: false,
          error: `Network error connecting to ${BASE_URL}: ${err.message || 'Connection timeout/unreachable'}`,
          action,
        };
      }
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  return { success: false, error: "Request failed after retries" };
}

async function hermesStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${BASE_URL}/api/hermes-external/status`, {
      headers: { "X-Hermes-API-Key": API_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { success: false, error: `Invalid server response (HTTP ${res.status})` };
    }
  } catch (err: any) {
    return { success: false, error: `Server unreachable: ${err.message}` };
  }
}

async function runTool(def: ToolDef, args: Record<string, unknown>) {
  const startTime = Date.now();
  try {
    const data =
      def.method === "status" || !def.action
        ? await hermesStatus()
        : await hermesExecute(def.action, args);

    const durationMs = Date.now() - startTime;
    const durationFormatted = `${(durationMs / 1000).toFixed(2)}s`;

    if (data && typeof data === 'object') {
      data.executionDuration = {
        ms: durationMs,
        formatted: durationFormatted
      };
    }

    const text = JSON.stringify(data, null, 2);
    const ok = data && data.success !== false;

    return {
      content: [{ type: "text" as const, text }],
      isError: !ok,
    };
  } catch (err: any) {
    const durationMs = Date.now() - startTime;
    const text = JSON.stringify({
      success: false,
      error: err.message || 'Tool execution error',
      executionDuration: { ms: durationMs, formatted: `${(durationMs / 1000).toFixed(2)}s` }
    }, null, 2);
    return {
      content: [{ type: "text" as const, text }],
      isError: true,
    };
  }
}

// ---------------------------------------------------------------------------
// Tool catalog — Newdone MCP actions for SocialSched
// Supports both Reel Campaigns (reels-creator) and Post Campaigns (post-creator)
// ---------------------------------------------------------------------------
const BASE_TOOLS: ToolDef[] = [
  {
    name: "newdone_status",
    description: "Get the Newdone agent status (uptime + task stats).",
    method: "status",
    schema: {},
  },
  {
    name: "newdone_schedule_post",
    description: "Schedule a single social post. Requires content and a list of platforms.",
    action: "schedule_post",
    schema: {
      content: z.string().describe("Post caption / text"),
      platforms: z.array(z.string()).describe("e.g. ['INSTAGRAM','FACEBOOK']"),
      scheduledAt: z.string().optional().describe("ISO 8601 time, e.g. 2025-08-22T10:00:00Z"),
      timezone: z.string().optional().default("UTC").describe("IANA timezone"),
      title: z.string().optional(),
      postType: z.enum(["FEED", "REEL", "STORY"]).optional(),
      platformOptions: z.record(z.any()).optional(),
    },
  },
  {
    name: "newdone_bulk_schedule",
    description: "Schedule many posts at once from a list of post objects.",
    action: "bulk_schedule",
    schema: {
      posts: z
        .array(
          z.object({
            content: z.string(),
            platforms: z.array(z.string()).optional(),
            scheduledAt: z.string().optional(),
            timezone: z.string().optional(),
          })
        )
        .describe("Array of posts to schedule"),
      platforms: z.array(z.string()).optional(),
      timezone: z.string().optional().default("UTC"),
    },
  },
  {
    name: "newdone_list_posts",
    description: "List posts, optionally filtered by status/platform.",
    action: "list_posts",
    schema: {
      status: z.string().optional().describe("e.g. QUEUED, DRAFT, PUBLISHED"),
      platform: z.string().optional(),
      limit: z.number().optional().default(50),
    },
  },
  {
    name: "newdone_get_post",
    description: "Get a single post by ID.",
    action: "get_post",
    schema: { postId: z.string() },
  },
  {
    name: "newdone_delete_post",
    description: "Delete a post by ID.",
    action: "delete_post",
    schema: { postId: z.string() },
  },
  {
    name: "newdone_cancel_scheduled_post",
    description: "Cancel a queued/scheduled post by ID.",
    action: "cancel_scheduled_post",
    schema: { postId: z.string() },
  },
  {
    name: "newdone_generate_content",
    description: "Generate AI content (caption/copy) from a prompt.",
    action: "generate_content",
    schema: { prompt: z.string() },
  },
  // Campaign Creator Type 1: Reel Campaign (reels-creator - https://socialsched.vibeship.in/dashboard/reels-creator)
  {
    name: "newdone_create_reel_campaign",
    description: "Create an automated AI Video Reel Campaign (reels-creator) from a website URL or product link. Automatically scrapes products, animates images, generates scripts, and schedules video reels.",
    action: "create_reel_campaign",
    schema: {
      websiteUrl: z.string().describe("Source e-commerce website or product link to scrape product photos and details from"),
      socialChannels: z.array(z.string()).optional().describe("Target social media channels e.g. ['INSTAGRAM', 'YOUTUBE', 'TIKTOK', 'FACEBOOK']"),
      campaignSchedule: z.enum(["daily", "weekly", "custom"]).optional().default("daily").describe("Publishing frequency: 'daily' (1 video reel/day) or 'weekly' (1 video reel/week)"),
      language: z.string().optional().default("English").describe("Voiceover narration language e.g. 'English', 'Hindi', 'Spanish', 'French'"),
      voiceId: z.string().optional().default("Aoede").describe("AI voice narrator ID: 'Aoede' (enthusiastic female), 'Puck' (energetic male), 'Fenrir' (authoritative male), 'Kore' (warm female), 'Charon' (calm male)"),
      niche: z.string().optional().describe("Brand category or market niche e.g. 'Fashion & Apparel', 'Tech & Electronics', 'Beauty & Skincare'"),
      targetRegion: z.string().optional().describe("Geographic target region e.g. 'Global', 'India', 'North America', 'Europe'"),
      voicePrompt: z.string().optional().describe("Narration style & hook instructions e.g. 'High-energy fast-paced hook emphasizing luxury craft and instant buy triggers'"),
      ingredientsToVideo: z.boolean().optional().default(true).describe("Extract key product features/ingredients into visual motion video callouts"),
      imageToVideo: z.boolean().optional().default(true).describe("Animate static product photos into motion videos using AI motion synthesis"),
      animateImageCount: z.number().optional().default(3).describe("Number of static product photos to animate per reel video (1 to 3)"),
    },
  },
  // Campaign Creator Type 2: Post Campaign (post-creator - https://socialsched.vibeship.in/dashboard/post-creator)
  {
    name: "newdone_create_post_campaign",
    description: "Create a 4-slide Instagram Carousel post / ad creative campaign (post-creator) with a locked design system. Automatically scrapes product images if websiteUrl is provided.",
    action: "create_post_campaign",
    schema: {
      productName: z.string().optional().describe("Product or offer name (e.g., 'Silk Anarkali Suit', 'Luxury Chronograph Watch')"),
      description: z.string().optional().describe("Product description, key features, or value proposition"),
      websiteUrl: z.string().optional().describe("Product page or shop URL. When provided, the tool automatically scrapes high-res product photos, title, and specs"),
      url: z.string().optional().describe("Alias for websiteUrl"),
      platform: z.string().optional().default("INSTAGRAM").describe("Target platform e.g., INSTAGRAM, INSTAGRAM_STORY, FACEBOOK, THREADS, LINKEDIN"),
      usp: z.string().optional().describe("Unique Selling Proposition (USP) e.g., '100% Pure Chanderi Silk with Handcrafted Zari Embroidery'"),
      personality: z.string().optional().describe("Brand personality / tone e.g., 'Luxury & Regal', 'Minimalist Modern', 'High-energy & Trendy'"),
      audience: z.string().optional().describe("Target demographic e.g., 'Festive fashion buyers', 'Gen Z streetwear enthusiasts'"),
      mood: z.string().optional().describe("Visual mood & theme e.g., 'Festive', 'Diwali', 'Luxury Studio', 'High Energy', 'Minimalist E-Commerce'"),
      specialInstructions: z.string().optional().describe("Special Pose / AI Guidance & prompt constraints. Include negative prompts or theme rules here! e.g., 'Diwali festival golden lighting', 'don't include text overlays on images', 'all festivals theme', 'model in traditional stance'"),
      aiGuidance: z.string().optional().describe("Alias for specialInstructions. Specify any AI prompt constraints or negative guidelines"),
      specialPose: z.string().optional().describe("Model posing directives, character positioning, or body angle instructions (e.g., 'standing 3/4 turn model pose with product held at chest level')"),
      cameraGuide: z.string().optional().describe("Camera composition & angle directives e.g., '45-degree elevated product zoom', 'top-down flatlay', 'macro detail closeup'"),
      styleGuide: z.string().optional().describe("Visual art style directives e.g., 'cinematic studio softbox lighting', 'warm film grain', 'photorealistic 8K render'"),
      textStyleGuide: z.string().optional().describe("Typography & caption style guidance e.g., 'elegant serif font', 'clean bold sans-serif'"),
      mediaUrls: z.array(z.string()).optional().describe("Array of product photo URLs or reference images to use in the carousel slides"),
    },
  },
  // Unified / General Create Campaign Tool
  {
    name: "newdone_create_campaign",
    description: "Create an automated campaign. Supports both 'reel' (reels-creator) and 'post' (post-creator) campaign types.",
    action: "create_campaign",
    schema: {
      campaignType: z.enum(["reel", "post"]).optional().default("reel").describe("Campaign type: 'reel' for automated video reel campaign or 'post' for 4-slide carousel image post campaign"),
      websiteUrl: z.string().optional().describe("Source website or product URL"),
      productName: z.string().optional().describe("Product name (for post campaigns)"),
      description: z.string().optional().describe("Product description"),
      socialChannels: z.array(z.string()).optional().describe("Target social media accounts"),
      campaignSchedule: z.enum(["daily", "weekly", "custom"]).optional().default("daily"),
      language: z.string().optional(),
      voiceId: z.string().optional(),
      niche: z.string().optional(),
      targetRegion: z.string().optional(),
      voicePrompt: z.string().optional(),
      specialInstructions: z.string().optional().describe("Special Pose / AI Guidance directives"),
      specialPose: z.string().optional(),
      cameraGuide: z.string().optional(),
      styleGuide: z.string().optional(),
      mood: z.string().optional(),
      usp: z.string().optional(),
    },
  },
  {
    name: "newdone_list_campaigns",
    description: "List campaigns, optionally filtered by active state.",
    action: "list_campaigns",
    schema: { isActive: z.boolean().optional() },
  },
  {
    name: "newdone_update_campaign",
    description: "Update an existing campaign.",
    action: "update_campaign",
    schema: {
      campaignId: z.string(),
      websiteUrl: z.string().optional(),
      campaignSchedule: z.string().optional(),
      status: z.string().optional(),
    },
  },
  {
    name: "newdone_delete_campaign",
    description: "Delete a campaign by ID.",
    action: "delete_campaign",
    schema: { campaignId: z.string() },
  },
  {
    name: "newdone_list_users",
    description: "List all users (admin).",
    action: "list_users",
    schema: {},
  },
  {
    name: "newdone_create_user",
    description: "Create a new user (admin).",
    action: "create_user",
    schema: {
      email: z.string().email(),
      password: z.string(),
      name: z.string().optional(),
      role: z.string().optional().default("user"),
    },
  },
  {
    name: "newdone_update_user",
    description: "Update a user by ID (admin).",
    action: "update_user",
    schema: {
      targetUserId: z.string(),
      name: z.string().optional(),
      email: z.string().email().optional(),
    },
  },
  {
    name: "newdone_delete_user",
    description: "Delete a user by ID (admin).",
    action: "delete_user",
    schema: { targetUserId: z.string() },
  },
  {
    name: "newdone_change_user_role",
    description: "Change a user's role (admin).",
    action: "change_user_role",
    schema: { targetUserId: z.string(), role: z.string() },
  },
  {
    name: "newdone_list_accounts",
    description: "List connected social accounts.",
    action: "list_accounts",
    schema: {},
  },
  {
    name: "newdone_disconnect_account",
    description: "Disconnect a social account by ID.",
    action: "disconnect_account",
    schema: { accountId: z.string() },
  },
  {
    name: "newdone_refresh_account",
    description: "Refresh a social account's OAuth token by ID.",
    action: "refresh_account",
    schema: { accountId: z.string() },
  },
  {
    name: "newdone_list_reels",
    description: "List reels, optionally filtered by status.",
    action: "list_reels",
    schema: { status: z.string().optional() },
  },
  {
    name: "newdone_delete_reel",
    description: "Delete a reel by ID.",
    action: "delete_reel",
    schema: { reelId: z.string() },
  },
  {
    name: "newdone_get_analytics",
    description: "Get analytics for the last N days.",
    action: "get_analytics",
    schema: { days: z.number().optional().default(7) },
  },
  {
    name: "newdone_list_notifications",
    description: "List notifications, optionally filtered by read state.",
    action: "list_notifications",
    schema: { isRead: z.boolean().optional() },
  },
  {
    name: "newdone_get_settings",
    description: "Get current agent/system settings.",
    action: "get_settings",
    schema: {},
  },
  {
    name: "newdone_update_settings",
    description: "Update settings (pass a settings object).",
    action: "update_settings",
    schema: { settings: z.record(z.any()) },
  },
  {
    name: "newdone_monitor_health",
    description: "Run a system/health check.",
    action: "monitor_health",
    schema: {},
  },
  {
    name: "newdone_analyze_accounts",
    description: "Analyze connected accounts for issues/opportunities.",
    action: "analyze_accounts",
    schema: {},
  },
  {
    name: "newdone_custom",
    description: "Run a custom autonomous-agent command from a free-form prompt.",
    action: "custom",
    schema: { prompt: z.string() },
  },
];

const TOOLS: ToolDef[] = BASE_TOOLS;

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------
const server = new McpServer({
  name: "newdone",
  version: "1.0.0",
});

for (const def of TOOLS) {
  server.tool(
    def.name,
    def.description,
    def.schema,
    async (args: Record<string, unknown>) => runTool(def, args)
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);

console.error(`[newdone-mcp] Connected to ${BASE_URL} (${TOOLS.length} Newdone tools active)`);

