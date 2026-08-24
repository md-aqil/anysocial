# Hermes + Claude Code Integration Guide

## Overview
Use Hermes (this chat) and Claude Code together for maximum productivity.

## When to Use Each

### Use Claude Code for:
- Deep coding tasks (refactoring, feature implementation)
- Code reviews and debugging
- Large codebase exploration
- Git operations with detailed context
- When you want interactive back-and-forth

### Use Hermes (this chat) for:
- Multi-step automation workflows
- Browser automation (Pinterest, Facebook, etc.)
- File operations across multiple projects
- Cron jobs and scheduled tasks
- Orchestration between multiple tools
- When you need parallel tasks via delegation

---

## Quick Start Commands

### 1. Interactive Claude Code Session
```bash
# Start Claude Code in your project
cd /Users/mdaqil/Documents/anysocial
claude
```

### 2. Non-Interactive (Print Output)
```bash
# Run a single prompt and get output
claude -p "What are the main routes in this project?"

# With custom model
claude -p "Review this code for security issues" --model sonnet
```

### 3. Background Agent
```bash
# Run in background, manage with `claude agents`
claude --bg "Build the authentication flow for the dashboard"
```

---

## Combined Workflow Example

### Step 1: Use Claude Code for Deep Coding
```bash
# In your terminal
cd /Users/mdaqil/Documents/anysocial/frontend
claude "Add user profile page with settings"
```

### Step 2: Use Hermes for Automation
While Claude Code works, I can:
- Monitor progress
- Run tests
- Handle browser tasks
- Manage deployments

### Step 3: Delegate to Subagents
```python
# I can spawn parallel Claude Code instances
delegate_task(goal="Build API endpoint for X", workdir="/path/to/project")
```

---

## MCP Integration

### View Claude Code MCP Servers
```bash
claude mcp list
```

### Add MCP Server to Claude Code
```bash
claude mcp add newdone --url http://localhost:3001/mcp
```

### Use MCP Tools in Claude Code
Claude Code will auto-discover and use available MCP tools.

---

## Plugins Available

```
~/.claude/skills/
├── agent-reach
├── composio-cli
├── design-md
├── ego-browser
├── enhance-prompt
├── graphify
├── react-components
├── remotion
├── shadcn-ui
└── stitch-design
```

### Use a Plugin
```bash
# In Claude Code session
/skill shadcn-ui

# Or with command
claude -p "Create a shadcn card component" --skills shadcn-ui
```

---

## Project-Specific Configuration

### Create CLAUDE.md in Project Root
```bash
cd /Users/mdaqil/Documents/anysocial
cat > CLAUDE.md << 'EOF'
# anysocial Project

## Tech Stack
- Backend: TypeScript + Express + Prisma
- Frontend: Next.js 14 + Tailwind + Shadcn UI
- Database: PostgreSQL
- Cache: Redis

## Conventions
- Use existing patterns in src/modules/
- Run migrations with: npm run db:migrate
- Build frontend: cd frontend && npm run build

## Important Files
- prisma/schema.prisma - Database schema
- src/app.ts - Main entry point
- frontend/src/app/ - Next.js pages
EOF
```

---

## Antigravity IDE Integration

### Open Project in Antigravity with Claude
```bash
# Start Antigravity with project
open -a "Antigravity IDE" /Users/mdaqil/Documents/anysocial

# Then use Claude Code extension inside Antigravity
```

### Cline in Antigravity
Cline is installed in Antigravity. Use it for:
- AI-assisted coding inside the IDE
- Chat with codebase context
- Automated workflows

---

## Best Practices

### 1. Context Sharing
- Put project notes in `CLAUDE.md` or `AGENTS.md`
- Use memory tool to save facts across sessions
- Create skills for recurring tasks

### 2. Parallel Work
```bash
# I can run multiple Claude Code instances
claude --bg "Feature A" &
claude --bg "Feature B" &
```

### 3. CI/CD Integration
```bash
# Use Claude Code in scripts
claude -p "Review this PR" --print > review.md
```

---

## Troubleshooting

### Claude Code Not Found
```bash
# Install
brew install tapcli/tap/claude
# Or use npm
npm install -g @anthropic-ai/claude-code
```

### AWS Bedrock Issues
```bash
# Check credentials
aws sts get-caller-identity
# Or switch to API key
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Memory Full
```bash
# Check disk space
df -h /
# Clean up
rm -rf ~/Library/Application\ Support/Claude-3p/vm_bundles/claudevm.bundle
```

---

## Quick Reference

| Task | Tool | Command |
|------|------|---------|
| Interactive coding | Claude Code | `claude` |
| One-shot prompt | Claude Code | `claude -p "prompt"` |
| Background agent | Claude Code | `claude --bg "prompt"` |
| File editing | Hermes | `write_file`, `patch` |
| Browser automation | Hermes | `browser_exec`, `drive_preview` |
| Multi-agent tasks | Hermes | `delegate_task` |
| Scheduled jobs | Hermes | `cronjob` |
