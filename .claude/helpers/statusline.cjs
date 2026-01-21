#!/usr/bin/env node
// Claude Flow V3 Statusline Helper
// Provides fast, cached statusline output for Claude Code

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
};

// Cache file for statusline data
const cacheFile = path.join(__dirname, '../../.claude-flow/statusline-cache.json');
const cacheMaxAge = 3000; // 3 seconds

function getCachedData() {
  try {
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      const age = Date.now() - stat.mtimeMs;
      if (age < cacheMaxAge) {
        return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      }
    }
  } catch (e) {
    // Ignore cache errors
  }
  return null;
}

function saveCachedData(data) {
  try {
    const dir = path.dirname(cacheFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(cacheFile, JSON.stringify(data));
  } catch (e) {
    // Ignore cache errors
  }
}

function getFlowData() {
  // Try cache first
  const cached = getCachedData();
  if (cached) return cached;

  // Fetch fresh data
  try {
    const output = execSync('claude-flow hooks statusline --json 2>/dev/null', {
      timeout: 2000,
      encoding: 'utf8',
    });
    const data = JSON.parse(output);
    saveCachedData(data);
    return data;
  } catch (e) {
    return null;
  }
}

function formatStatusline(data) {
  if (!data) {
    return `${colors.blue}▊${colors.reset} ${colors.dim}Claude Flow V3${colors.reset}`;
  }

  const parts = [];

  // User/Branch info
  if (data.user) {
    parts.push(`${colors.cyan}${data.user.modelName || 'Claude'}${colors.reset}`);
    if (data.user.gitBranch) {
      parts.push(`${colors.dim}${data.user.gitBranch}${colors.reset}`);
    }
  }

  // Context usage
  if (data.system && data.system.contextPct !== undefined) {
    const pct = data.system.contextPct;
    const color = pct > 80 ? colors.red : pct > 60 ? colors.yellow : colors.green;
    parts.push(`${colors.dim}ctx:${colors.reset}${color}${pct}%${colors.reset}`);
  }

  // Swarm status
  if (data.swarm) {
    const agents = data.swarm.activeAgents || 0;
    const maxAgents = data.swarm.maxAgents || 15;
    if (agents > 0) {
      parts.push(`${colors.green}⚡${agents}/${maxAgents}${colors.reset}`);
    }
  }

  // V3 Progress
  if (data.v3Progress) {
    const learned = data.v3Progress.patternsLearned || 0;
    if (learned > 0) {
      parts.push(`${colors.magenta}◈${learned}${colors.reset}`);
    }
  }

  // Security status
  if (data.security && data.security.totalCves > 0) {
    const fixed = data.security.cvesFixed || 0;
    const total = data.security.totalCves;
    const color = fixed < total ? colors.yellow : colors.green;
    parts.push(`${color}CVE:${fixed}/${total}${colors.reset}`);
  }

  // Daemon indicator
  parts.push(`${colors.blue}▊${colors.reset}`);

  return parts.join(' ');
}

// Main
const data = getFlowData();
console.log(formatStatusline(data));
