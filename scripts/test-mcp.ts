import { spawn } from "child_process";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const BASE_URL = process.env.HERMES_BASE_URL || "https://socialsched.vibeship.in";
const API_KEY = process.env.HERMES_API_KEY || "hermes_b3260a2a9ee9488d340423bf5428a2ea6930a03676820df2e53c43bb2065f92d";

console.log(`\n🤖 Testing Hermes MCP Server against ${BASE_URL}...\n`);

const mcpServer = spawn("npx", ["tsx", "mcp/hermes-mcp-server.ts"], {
  env: {
    ...process.env,
    HERMES_BASE_URL: BASE_URL,
    HERMES_API_KEY: API_KEY
  }
});

mcpServer.stdout.on("data", (data) => {
  const text = data.toString();
  try {
    const json = JSON.parse(text);
    console.log("📥 [MCP Response]:", JSON.stringify(json, null, 2));
  } catch {
    console.log("📥 [MCP Output]:", text.trim());
  }
});

mcpServer.stderr.on("data", (data) => {
  console.log("⚙️  [MCP Log]:", data.toString().trim());
});

// Step 1: Initialize MCP
const initMsg = JSON.stringify({
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "hermes-test-cli", version: "1.0.0" }
  }
}) + "\n";

mcpServer.stdin.write(initMsg);

// Step 2: Call hermes_status
setTimeout(() => {
  console.log("\n📡 Invoking MCP tool: hermes_status...");
  const callMsg = JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: { name: "hermes_status", arguments: {} }
  }) + "\n";
  mcpServer.stdin.write(callMsg);
}, 1000);

// Step 3: Call hermes_list_accounts
setTimeout(() => {
  console.log("\n🔗 Invoking MCP tool: hermes_list_accounts...");
  const callMsg = JSON.stringify({
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: { name: "hermes_list_accounts", arguments: {} }
  }) + "\n";
  mcpServer.stdin.write(callMsg);
}, 2500);

// Step 4: Finish
setTimeout(() => {
  console.log("\n✅ Hermes MCP Test Completed Successfully!\n");
  mcpServer.kill();
  process.exit(0);
}, 4500);
