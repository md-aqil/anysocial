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
  Download
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
  const [copied, setCopied] = useState(false);
  const [setupCopied, setSetupCopied] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);
  const [claudeCopied, setClaudeCopied] = useState(false);
  const [instructionsCopied, setInstructionsCopied] = useState(false);

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
    if (!confirm('Are you sure you want to revoke your Hermes API key? Your Hermes Desktop will stop working immediately.')) {
      return;
    }
    setActionLoading(true);
    try {
      const data = await api.hermes.revokeConnectionKey();
      if (data.success) {
        setConnected(false);
        setApiKey(null);
        setMaskedKey(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key');
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSetupGuide = async () => {
    setSetupLoading(true);
    try {
      const guide = await api.hermes.getSetupGuide();
      const blob = new Blob([guide], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hermes-agent-setup.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download setup guide: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  const copySetupGuide = async () => {
    setSetupLoading(true);
    try {
      const guide = await api.hermes.getSetupGuide();
      await navigator.clipboard.writeText(guide);
      setSetupCopied(true);
      setTimeout(() => setSetupCopied(false), 2000);
    } catch (err: any) {
      alert('Failed to copy setup guide: ' + err.message);
    } finally {
      setSetupLoading(false);
    }
  };

  // Build a paste-ready prompt for Claude Code to set up the MCP server itself.
  const buildClaudeSetup = () => {
    const baseUrl =
      typeof window !== 'undefined' ? window.location.origin : 'https://socialsched.vibeship.in';
    const serverPath = '/Users/mdaqil/Documents/anysocial/mcp/hermes-mcp-server.ts';
    return `Please set up a Model Context Protocol (MCP) server for me named "hermes-socialsched" by writing a .mcp.json in this project (Claude Code auto-discovers it). Use these exact details:

- Type: stdio
- Command: npx
- Args: ["-y", "tsx", "${serverPath}"]
- Environment variables:
  - HERMES_BASE_URL: ${baseUrl}
  - HERMES_API_KEY: ${apiKey || 'YOUR_API_KEY'}

After registering it, confirm the hermes_* tools (hermes_status, hermes_schedule_post, hermes_list_accounts, etc.) are available so I can control my SocialSched account just by chatting.`;
  };

  const copyClaudeSetup = async () => {
    try {
      await navigator.clipboard.writeText(buildClaudeSetup());
      setClaudeCopied(true);
      setTimeout(() => setClaudeCopied(false), 2000);
    } catch (err: any) {
      alert('Failed to copy Claude setup: ' + err.message);
    }
  };

  const downloadClaudeSetup = () => {
    const blob = new Blob([buildClaudeSetup()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'claude-mcp-setup.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Build usage instructions the user pastes into Claude so it knows the tools.
  const buildClaudeInstructions = () => {
    return `You have access to the Hermes SocialSched MCP server. Its tools are prefixed \`hermes_*\` and let you manage the user's social media on SocialSched. Auth is handled by the server (API key already configured) — just call the tools.

## Tools
- hermes_status — agent status, uptime, task stats.
- hermes_schedule_post — schedule one post. Args: content (string, required), platforms (array, e.g. ["INSTAGRAM","FACEBOOK"], required), scheduledAt (ISO 8601, optional), timezone (IANA, default UTC), title (optional), postType (FEED|REEL|STORY, optional), platformOptions (optional).
- hermes_bulk_schedule — schedule many posts. Args: posts (array of {content, platforms?, scheduledAt?, timezone?}), platforms? (fallback), timezone?.
- hermes_list_posts — list posts. Args: status? (QUEUED|DRAFT|PUBLISHED..), platform?, limit? (default 50).
- hermes_get_post / hermes_delete_post / hermes_cancel_scheduled_post — by postId.
- hermes_generate_content — AI caption from a prompt.
- hermes_create_campaign / hermes_list_campaigns / hermes_update_campaign / hermes_delete_campaign — campaign automation (websiteUrl, socialChannels, campaignSchedule).
- hermes_list_accounts — list the user's connected social accounts (use to get real accountId).
- hermes_disconnect_account / hermes_refresh_account — by accountId.
- hermes_list_users / hermes_create_user / hermes_update_user / hermes_delete_user / hermes_change_user_role — admin user management.
- hermes_list_reels / hermes_delete_reel.
- hermes_get_analytics (days?, default 7) / hermes_list_notifications (isRead?).
- hermes_get_settings / hermes_update_settings.
- hermes_monitor_health / hermes_analyze_accounts.
- hermes_custom — free-form autonomous-agent command (prompt).

## How to help the user
- For "post/schedule/share", confirm platforms + time if missing, then call the matching hermes_* tool.
- Call hermes_list_accounts first when you need a real accountId.
- Platform names: INSTAGRAM, FACEBOOK, TWITTER, LINKEDIN, YOUTUBE, THREADS, PINTEREST, SNAPCHAT.
- Times: ISO 8601 (e.g. 2025-08-22T10:00:00Z) with IANA timezones (e.g. America/New_York).
- Always report the tool result clearly; on failure, surface the error message.`;
  };

  const copyClaudeInstructions = async () => {
    try {
      await navigator.clipboard.writeText(buildClaudeInstructions());
      setInstructionsCopied(true);
      setTimeout(() => setInstructionsCopied(false), 2000);
    } catch (err: any) {
      alert('Failed to copy instructions: ' + err.message);
    }
  };

  const downloadClaudeInstructions = () => {
    const blob = new Blob([buildClaudeInstructions()], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CLAUDE.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-stone-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#D27D50]/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-[#D27D50]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#2F281F]">Hermes Connection</h1>
            <p className="text-sm text-stone-500">Connect your Hermes Desktop app to control SocialSched</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className={cn(
          "flex items-center gap-3 p-4 rounded-xl border",
          connected 
            ? "bg-emerald-50 border-emerald-200" 
            : "bg-amber-50 border-amber-200"
        )}>
          {connected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          )}
          <div>
            <p className={cn(
              "text-sm font-bold",
              connected ? "text-emerald-700" : "text-amber-700"
            )}>
              {connected ? 'Connected' : 'Not Connected'}
            </p>
            <p className={cn(
              "text-xs",
              connected ? "text-emerald-600" : "text-amber-600"
            )}>
              {connected 
                ? 'Your Hermes Desktop is connected and ready to control your account' 
                : 'Generate an API key to connect your Hermes Desktop'}
            </p>
          </div>
        </div>
      </div>

      {/* API Key Section */}
      <div className="bg-white rounded-2xl border border-stone-100 p-6">
        <h3 className="font-bold text-[#2F281F] mb-4 flex items-center gap-2">
          <Key className="w-5 h-5" />
          API Key
        </h3>

        {connected && apiKey ? (
          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-xs text-stone-500 font-medium mb-2">Your Hermes API Key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded-lg text-sm font-mono border border-stone-200 break-all">
                  {apiKey}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(apiKey)}
                  className="shrink-0"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Save this key now — it won't be shown again for security
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={generateKey}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Regenerate Key
              </Button>
              <Button
                variant="destructive"
                onClick={revokeKey}
                disabled={actionLoading}
                className="flex-1"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Revoke Key
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-stone-400" />
            </div>
            <p className="text-stone-600 font-medium mb-2">No API key generated</p>
            <p className="text-sm text-stone-500 mb-4">
              Generate an API key to connect your Hermes Desktop app
            </p>
            <Button
              onClick={generateKey}
              disabled={actionLoading}
              className="bg-[#D27D50] hover:bg-[#C26032] text-white"
            >
              {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
              Generate API Key
            </Button>
          </div>
        )}
      </div>

      {/* Connection Instructions */}
      {connected && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-[#2F281F] mb-4 flex items-center gap-2">
            <ExternalLink className="w-5 h-5" />
            Connect Hermes Desktop
          </h3>

          <div className="space-y-4">
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
              <p className="text-xs text-stone-500 font-medium mb-2">1. Copy your API key above</p>
              <p className="text-xs text-stone-500 font-medium mb-2">2. Open Hermes Desktop app</p>
              <p className="text-xs text-stone-500 font-medium mb-2">3. Go to Settings → Integrations → Add SocialSched</p>
              <p className="text-xs text-stone-500 font-medium mb-2">4. Paste these values:</p>
              
              <div className="mt-3 space-y-2">
                <div>
                  <p className="text-xs text-stone-400">API URL</p>
                  <code className="block bg-white px-3 py-2 rounded-lg text-sm font-mono border border-stone-200">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/hermes-external/execute
                  </code>
                </div>
                <div>
                  <p className="text-xs text-stone-400">API Key</p>
                  <code className="block bg-white px-3 py-2 rounded-lg text-sm font-mono border border-stone-200 break-all">
                    {apiKey || 'your-api-key-here'}
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-700 font-medium mb-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Security Note
              </p>
              <p className="text-xs text-blue-600">
                Your API key gives full control over your SocialSched account. Never share it publicly. 
                You can revoke it anytime from this page.
              </p>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-xs text-emerald-700 font-medium mb-2 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                Agent Auto-Setup
              </p>
              <p className="text-xs text-emerald-600 mb-3">
                Download or copy the personalized agent setup guide. Paste it directly into your AI agent 
                (Claude, ChatGPT, etc.) and it will auto-configure with your API key.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={copySetupGuide}
                  disabled={setupLoading}
                  className="flex-1"
                >
                  {setupCopied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {setupCopied ? 'Copied!' : 'Copy Agent Guide'}
                </Button>
                <Button
                  variant="outline"
                  onClick={downloadSetupGuide}
                  disabled={setupLoading}
                  className="flex-1"
                >
                  {setupLoading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
                  Download .md
                </Button>
              </div>
            </div>

            {/* Claude Code MCP */}
            <div className="bg-[#FBF3EE] rounded-xl p-4 border border-[#D27D50]/30">
              <div className="flex items-center gap-2 mb-2">
                <ClaudeIcon className="w-5 h-5" />
                <p className="text-xs text-[#A8562F] font-bold">Set up in Claude Code</p>
              </div>
              <p className="text-xs text-[#A8562F] mb-3">
                Copy the prompt below and paste it into{' '}
                <span className="font-semibold">Claude Code</span>. Claude will configure the Hermes
                MCP server for you automatically. Your key is embedded — keep it safe.
              </p>
              <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto mb-3">
                <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre-wrap">
                  {buildClaudeSetup()}
                </pre>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={copyClaudeSetup} className="flex-1">
                  {claudeCopied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {claudeCopied ? 'Copied!' : 'Copy Prompt'}
                </Button>
                <Button variant="outline" onClick={downloadClaudeSetup} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download .md
                </Button>
              </div>
            </div>

            {/* Claude usage instructions */}
            <div className="bg-white rounded-xl p-4 border border-stone-200">
              <div className="flex items-center gap-2 mb-2">
                <ClaudeIcon className="w-5 h-5" />
                <p className="text-xs text-stone-700 font-bold">Instructions for Claude</p>
              </div>
              <p className="text-xs text-stone-500 mb-3">
                Paste this into Claude Code (or save as{' '}
                <code className="font-mono">CLAUDE.md</code>) so Claude knows what the Hermes tools
                do and how to use them.
              </p>
              <div className="bg-stone-900 rounded-lg p-3 overflow-x-auto mb-3">
                <pre className="text-[11px] text-emerald-300 font-mono whitespace-pre-wrap">
                  {buildClaudeInstructions()}
                </pre>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={copyClaudeInstructions} className="flex-1">
                  {instructionsCopied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {instructionsCopied ? 'Copied!' : 'Copy Instructions'}
                </Button>
                <Button variant="outline" onClick={downloadClaudeInstructions} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Save CLAUDE.md
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Connection */}
      {connected && (
        <div className="bg-white rounded-2xl border border-stone-100 p-6">
          <h3 className="font-bold text-[#2F281F] mb-4">Test Connection</h3>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const data = await api.hermes.getConnection();
                alert(JSON.stringify(data, null, 2));
              } catch (err: any) {
                alert('Test failed: ' + err.message);
              }
            }}
            className="w-full"
          >
            <Bot className="w-4 h-4 mr-2" />
            Test Hermes Connection
          </Button>
        </div>
      )}
    </div>
  );
}
