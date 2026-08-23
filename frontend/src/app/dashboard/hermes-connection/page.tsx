'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import {
  Bot,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Key,
  ExternalLink,
  Shield,
  Zap,
  AlertTriangle,
  Download,
  Terminal,
  Sparkles,
  Code2,
  Layers,
  Send,
  Check,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';

function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect width="24" height="24" rx="7" fill="#D97757" />
      <path
        d="M12 5.5v13M7.2 9.4c2.1 1.2 4.2 2.4 6.3 3.6M16.8 9.4c-2.1 1.2-4.2 2.4-6.3 3.6"
        stroke="#fff"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function HermesConnectionPage() {
  const { user } = useAuthStore();
  const [connected, setConnected] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [maskedKey, setMaskedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedMcp, setCopiedMcp] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const [activeTab, setActiveTab] = useState<'prompt' | 'mcp' | 'terminal' | 'api'>('prompt');
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConnectionStatus();
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const data = await api.hermes.getConnection();
      if (data.success) {
        setConnected(data.connected);
        setMaskedKey(data.maskedKey);
        setApiKey(data.apiKey);
      }
    } catch (err) {
      console.error('Failed to fetch connection status:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateKey = async () => {
    setActionLoading(true);
    try {
      const data = await api.hermes.generateConnectionKey();
      if (data.success) {
        setConnected(true);
        setApiKey(data.apiKey);
        setMaskedKey(`${data.apiKey.substring(0, 8)}...${data.apiKey.substring(data.apiKey.length - 4)}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to generate key');
    } finally {
      setActionLoading(false);
    }
  };

  const revokeKey = async () => {
    if (!confirm('Are you sure you want to revoke your API key? Your AI agents will lose access immediately.')) {
      return;
    }
    setActionLoading(true);
    try {
      const data = await api.hermes.revokeConnectionKey();
      if (data.success) {
        setConnected(false);
        setApiKey(null);
        setMaskedKey(null);
        setTestResult(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key');
    } finally {
      setActionLoading(false);
    }
  };

  const copyText = (text: string, setter: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const data = await api.hermes.getConnection();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const getOrigin = () => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return 'https://socialsched.vibeship.in';
  };

  // 1-Click AI Prompt for setup
  const autoSetupPrompt = `Connect to my account using Model Context Protocol (MCP).
Create or update .mcp.json in my workspace with:

{
  "mcpServers": {
    "newdone": {
      "command": "node",
      "args": ["mcp/dist/hermes-mcp-server.mjs"],
      "env": {
        "HERMES_BASE_URL": "${getOrigin()}",
        "HERMES_API_KEY": "${apiKey || 'YOUR_NEWDONE_API_KEY'}"
      }
    }
  }
}

Once configured, call the newdone_status or newdone_list_accounts tool to confirm connection! You can create Reel Campaigns (reels-creator) using newdone_create_reel_campaign and Post Campaigns (post-creator) using newdone_create_post_campaign.`;

  // Standard MCP JSON
  const mcpConfigJson = JSON.stringify(
    {
      mcpServers: {
        newdone: {
          command: 'node',
          args: ['mcp/dist/hermes-mcp-server.mjs'],
          env: {
            HERMES_BASE_URL: getOrigin(),
            HERMES_API_KEY: apiKey || 'YOUR_NEWDONE_API_KEY'
          }
        }
      }
    },
    null,
    2
  );

  // Terminal cURL command
  const curlCommand = `curl -X POST "${getOrigin()}/api/hermes-external/execute" \\
  -H "Content-Type: application/json" \\
  -H "X-Hermes-API-Key: ${apiKey || 'YOUR_NEWDONE_API_KEY'}" \\
  -d '{"action": "list_accounts", "payload": {}}'`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-[#D27D50]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#2F281F] to-[#1E1913] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#D27D50]/10 rounded-full filter blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#D27D50]/20 border border-[#D27D50]/30 flex items-center justify-center shrink-0">
              <Bot className="w-8 h-8 text-[#D27D50]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight">Newdone AI Agent & MCP Control</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D27D50]/20 text-[#E89A72] border border-[#D27D50]/30">
                  Live MCP Active
                </span>
              </div>
              <p className="text-stone-400 text-sm mt-1">
                Your autonomous social media co-pilot — connect Claude, Antigravity, or any AI assistant to generate Reel Campaigns & Post Campaigns automatically.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {connected ? (
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Connected & Ready
              </div>
            ) : (
              <Button
                onClick={generateKey}
                disabled={actionLoading}
                className="bg-[#D27D50] hover:bg-[#C26032] text-white font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Connect Hermes AI Assistant
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* STEP 1: API Key Management */}
      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-700 text-sm">
              1
            </div>
            <div>
              <h3 className="font-bold text-[#2F281F]">Your Hermes API Key</h3>
              <p className="text-xs text-stone-500">Authentication key for your AI agents and MCP servers</p>
            </div>
          </div>

          {connected && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={generateKey}
                disabled={actionLoading}
                className="text-xs"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", actionLoading && "animate-spin")} />
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={revokeKey}
                disabled={actionLoading}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" />
                Revoke
              </Button>
            </div>
          )}
        </div>

        {connected && apiKey ? (
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-3.5 py-2.5 rounded-lg text-sm font-mono border border-stone-200 text-stone-800 break-all select-all font-semibold">
                {apiKey}
              </code>
              <Button
                onClick={() => copyText(apiKey, setCopiedKey)}
                className="shrink-0 bg-[#2F281F] hover:bg-black text-white px-4"
              >
                {copiedKey ? (
                  <>
                    <Check className="w-4 h-4 mr-1 text-emerald-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1" />
                    Copy Key
                  </>
                )}
              </Button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200/60">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span>Keep your API key private. It grants access to control your connected social media channels.</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50/50">
            <Key className="w-8 h-8 text-stone-400 mx-auto mb-2" />
            <p className="text-stone-700 font-semibold text-sm">No Active API Key</p>
            <p className="text-stone-500 text-xs mb-4">Generate an API key to enable MCP and agent control.</p>
            <Button
              onClick={generateKey}
              disabled={actionLoading}
              className="bg-[#D27D50] hover:bg-[#C26032] text-white font-bold"
            >
              <Zap className="w-4 h-4 mr-2" />
              Generate Hermes API Key
            </Button>
          </div>
        )}
      </div>

      {/* STEP 2: Choose Connection Method */}
      {connected && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-700 text-sm">
              2
            </div>
            <div>
              <h3 className="font-bold text-[#2F281F]">Connect Your AI Assistant</h3>
              <p className="text-xs text-stone-500">Select how you want to connect your AI agent or desktop app</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-3">
            <button
              onClick={() => setActiveTab('prompt')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'prompt'
                  ? "bg-[#D27D50] text-white shadow-md"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              1-Click AI Prompt (Easiest)
            </button>
            <button
              onClick={() => setActiveTab('mcp')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'mcp'
                  ? "bg-[#D27D50] text-white shadow-md"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              <ClaudeIcon className="w-3.5 h-3.5" />
              Claude Desktop / MCP Config
            </button>
            <button
              onClick={() => setActiveTab('terminal')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'terminal'
                  ? "bg-[#D27D50] text-white shadow-md"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              <Terminal className="w-3.5 h-3.5" />
              CLI / Terminal Command
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'api'
                  ? "bg-[#D27D50] text-white shadow-md"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              )}
            >
              <Code2 className="w-3.5 h-3.5" />
              REST API / Custom Scripts
            </button>
          </div>

          {/* TAB 1: AI PROMPT */}
          {activeTab === 'prompt' && (
            <div className="space-y-4">
              <div className="bg-[#FBF3EE] border border-[#D27D50]/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D27D50]" />
                    <h4 className="text-xs font-bold text-[#2F281F]">Paste this into your AI Chat</h4>
                  </div>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-[#D27D50]/20 text-[#D27D50]">
                    Auto-Configures Everything
                  </span>
                </div>
                <p className="text-xs text-stone-600 mb-3">
                  Copy the prompt below and paste it directly into <strong>Claude, Antigravity, ChatGPT, or Cursor</strong>. Your AI assistant will write `.mcp.json` and start controlling your accounts immediately!
                </p>
                <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto relative">
                  <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                    {autoSetupPrompt}
                  </pre>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    onClick={() => copyText(autoSetupPrompt, setCopiedPrompt)}
                    className="bg-[#D27D50] hover:bg-[#C26032] text-white text-xs font-bold px-4"
                  >
                    {copiedPrompt ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1" />
                        Prompt Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copy Setup Prompt
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MCP JSON */}
          {activeTab === 'mcp' && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#2F281F]">Paste into .mcp.json or claude_desktop_config.json</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(mcpConfigJson, setCopiedMcp)}
                    className="text-xs"
                  >
                    {copiedMcp ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedMcp ? 'Copied' : 'Copy Config'}
                  </Button>
                </div>
                <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-xs font-mono text-blue-300 whitespace-pre-wrap">
                    {mcpConfigJson}
                  </pre>
                </div>
                <p className="text-[11px] text-stone-500 mt-2">
                  Location: Save to <code>.mcp.json</code> in your project root or in Claude Desktop settings.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: CLI */}
          {activeTab === 'terminal' && (
            <div className="space-y-4">
              <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-stone-300">Run Hermes MCP Test CLI</span>
                  </div>
                </div>
                <pre className="bg-black/60 p-3 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto">
                  npm run test:mcp
                </pre>
                <p className="text-xs text-stone-400 mt-3">
                  Or launch the interactive web inspector:
                </p>
                <pre className="bg-black/60 p-3 rounded-lg text-xs font-mono text-amber-400 overflow-x-auto mt-1">
                  npx @modelcontextprotocol/inspector npx tsx ./mcp/hermes-mcp-server.ts
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: REST API */}
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-[#2F281F]">Direct REST API Request (cURL)</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(curlCommand, setCopiedCurl)}
                    className="text-xs"
                  >
                    {copiedCurl ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                    {copiedCurl ? 'Copied' : 'Copy cURL'}
                  </Button>
                </div>
                <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto">
                  <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                    {curlCommand}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Live Connection Health Check */}
      {connected && (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-700 text-sm">
                3
              </div>
              <div>
                <h3 className="font-bold text-[#2F281F]">Test Your Live Connection</h3>
                <p className="text-xs text-stone-500">Verify that Hermes Agent can communicate with SocialSched</p>
              </div>
            </div>

            <Button
              onClick={handleTestConnection}
              disabled={testing}
              className="bg-[#2F281F] hover:bg-black text-white text-xs font-bold px-4"
            >
              {testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
              Test Connection Now
            </Button>
          </div>

          {testResult && (
            <div className={cn(
              "p-4 rounded-xl border text-xs font-mono overflow-x-auto space-y-2",
              testResult.success ? "bg-emerald-50 border-emerald-200 text-emerald-900" : "bg-red-50 border-red-200 text-red-900"
            )}>
              <div className="flex items-center gap-2 font-bold font-sans text-sm">
                {testResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Connection Active & Healthy!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span>Connection Test Failed</span>
                  </>
                )}
              </div>
              <pre className="text-[11px] whitespace-pre-wrap">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
