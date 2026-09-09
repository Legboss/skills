#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function mcpServerNames(dir) {
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
    return Object.keys(cfg.mcpServers || {});
  } catch {
    return [];
  }
}

// Servers with a tool_use as the last transcript entry (no tool_result yet) are mid-call.
function activeMcpServers(transcriptPath) {
  if (!transcriptPath) return new Set();
  try {
    const stat = fs.statSync(transcriptPath);
    const tailBytes = Math.min(stat.size, 65536);
    const fd = fs.openSync(transcriptPath, 'r');
    const buf = Buffer.alloc(tailBytes);
    fs.readSync(fd, buf, 0, tailBytes, stat.size - tailBytes);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    if (stat.size > tailBytes) lines.shift();

    for (let i = lines.length - 1; i >= 0; i--) {
      let entry;
      try { entry = JSON.parse(lines[i]); } catch { continue; }
      if (entry.type !== 'assistant' && entry.type !== 'user') continue;
      if (entry.type !== 'assistant') return new Set();
      const blocks = entry.message?.content;
      if (!Array.isArray(blocks)) return new Set();
      const servers = new Set();
      for (const b of blocks) {
        if (b.type === 'tool_use' && typeof b.name === 'string' && b.name.startsWith('mcp__')) {
          servers.add(b.name.split('__')[1]);
        }
      }
      return servers;
    }
  } catch {}
  return new Set();
}

const GREEN = '\x1b[32m', GRAY = '\x1b[90m', RESET = '\x1b[0m';

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const data = JSON.parse(input);
  const model = data.model?.display_name || '';
  const cw = data.context_window;
  const projectDir = data.workspace?.project_dir || data.workspace?.current_dir || data.cwd;
  const mcpNames = projectDir ? mcpServerNames(projectDir) : [];
  const active = mcpNames.length ? activeMcpServers(data.transcript_path) : new Set();
  const mcpSuffix = mcpNames.length
    ? ' | ' + mcpNames.map(n => (active.has(n) ? GREEN : GRAY) + n + RESET).join(' | ')
    : '';

  if (!cw || cw.context_window_size == null) {
    console.log(`Model: ${model}${mcpSuffix}`);
    return;
  }

  const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'm' : (n / 1e3).toFixed(1) + 'k';
  const used = cw.total_input_tokens || 0;
  const total = cw.context_window_size;
  const pct = Math.round(cw.used_percentage || 0);

  let line = `Model: ${model} | Tokens: ${fmt(used)} / ${fmt(total)} (${pct}%)`;

  const fiveHour = data.rate_limits?.five_hour;
  if (fiveHour?.used_percentage != null) {
    const remaining = Math.round(100 - fiveHour.used_percentage);
    let resetStr = '';
    if (fiveHour.resets_at != null) {
      const minsLeft = Math.max(0, Math.round((fiveHour.resets_at * 1000 - Date.now()) / 60000));
      const h = Math.floor(minsLeft / 60);
      const m = minsLeft % 60;
      resetStr = `, reset in ${h > 0 ? h + 'h ' : ''}${m}m`;
    }
    line += ` | Left ${remaining}%${resetStr}`;
  }

  line += mcpSuffix;

  console.log(line);
});
