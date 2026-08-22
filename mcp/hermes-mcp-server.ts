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
  console.error("[newdone-mcp] Missing HERMES_API_KEY. Set it in the env or a .env file next to this server.");
}

type ToolDef = {
  name: string;
  description: string;
  action?: string;            // if omitted, treated as a status call
  method?: "execute" | "status";
  schema: z.ZodRawShape;
};

async function hermesExecute(action: string, payload: unknown) {
  const res = await fetch(`${BASE_URL}/api/hermes-external/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hermes-API-Key": API_KEY,
    },
    body: JSON.stringify({ action, payload }),
  });
  return res.json();
}

async function hermesStatus() {
  const res = await fetch(`${BASE_URL}/api/hermes-external/status`, {
    headers: { "X-Hermes-API-Key": API_KEY },
  });
  return res.json();
}

async function runTool(def: ToolDef, args: Record<string, unknown>) {
  const data =
    def.method === "status" || !def.action
      ? await hermesStatus()
      : await hermesExecute(def.action, args);

  const text = JSON.stringify(data, null, 2);
  const ok = data && data.success !== false;

  return {
    content: [{ type: "text" as const, text }],
    isError: !ok,
  };
}

// ---------------------------------------------------------------------------
// Tool catalog — Newdone MCP actions for SocialSched
// ---------------------------------------------------------------------------
const TOOLS: ToolDef[] = [
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
  {
    name: "newdone_create_campaign",
    description: "Create an automated campaign from a website URL.",
    action: "create_campaign",
    schema: {
      websiteUrl: z.string().describe("Source website for the campaign"),
      socialChannels: z.array(z.string()).optional(),
      campaignSchedule: z.enum(["daily", "weekly", "custom"]).optional().default("daily"),
      language: z.string().optional(),
      voiceId: z.string().optional(),
      niche: z.string().optional(),
      targetRegion: z.string().optional(),
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
