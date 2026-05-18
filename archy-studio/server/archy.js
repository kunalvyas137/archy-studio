import { spawn } from 'node:child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import yaml from 'js-yaml';

// Write a temporary options YAML file for ARCHY, return its path
function writeTempOptions(profile, extra = {}) {
  const dir = tmpdir();
  const file = join(dir, `archy-opts-${randomUUID()}.yaml`);
  const opts = {
    clientId: profile.clientId,
    clientSecret: profile.clientSecret,
    environment: profile.region || 'mypurecloud.com',
  };
  if (profile.substitutions && Object.keys(profile.substitutions).length > 0) {
    opts.substitutions = profile.substitutions;
  }
  if (extra.substitutions) {
    opts.substitutions = { ...opts.substitutions, ...extra.substitutions };
  }
  writeFileSync(file, yaml.dump(opts), { mode: 0o600 });
  return file;
}

// SSE helper — write a structured event line to res
export function sseEvent(res, type, data) {
  res.write(`data: ${JSON.stringify({ type, ...data, ts: Date.now() })}\n\n`);
}

// Generic ARCHY command runner — streams stdout/stderr via SSE, then sends done/error
export function runArchy(res, args, profile, extraOpts = {}) {
  let optFile = null;
  try {
    optFile = writeTempOptions(profile, extraOpts);
  } catch (e) {
    sseEvent(res, 'error', { line: `Failed to write options file: ${e.message}` });
    sseEvent(res, 'done', { exitCode: 1 });
    res.end();
    return;
  }

  const allArgs = [...args, '--optionsFile', optFile];
  sseEvent(res, 'cmd', { line: `$ archy ${allArgs.filter(a => !a.includes(optFile)).join(' ')} --optionsFile <secured>` });

  const proc = spawn('archy', allArgs, { shell: true });

  proc.stdout.on('data', d => {
    d.toString().split('\n').filter(Boolean).forEach(line => sseEvent(res, 'stdout', { line }));
  });
  proc.stderr.on('data', d => {
    d.toString().split('\n').filter(Boolean).forEach(line => sseEvent(res, 'stderr', { line }));
  });
  proc.on('close', code => {
    if (optFile && existsSync(optFile)) {
      try { unlinkSync(optFile); } catch {}
    }
    sseEvent(res, 'done', { exitCode: code });
    res.end();
  });
  proc.on('error', err => {
    sseEvent(res, 'error', { line: `Failed to spawn archy: ${err.message}. Is archy installed? Run: npm install -g @genesys-dev-tools/archy` });
    sseEvent(res, 'done', { exitCode: 1 });
    res.end();
  });
}

// Check if archy is installed
export function checkArchy() {
  return new Promise((resolve) => {
    const proc = spawn('archy', ['version'], { shell: true });
    let output = '';
    proc.stdout.on('data', d => output += d.toString());
    proc.stderr.on('data', d => output += d.toString());
    proc.on('close', code => resolve({ installed: code === 0, version: output.trim() }));
    proc.on('error', () => resolve({ installed: false, version: null }));
  });
}

// Fetch flows via Genesys Cloud Platform API (since archy CLI has no 'list' command)
export async function listFlows(res, profile, options = {}) {
  sseEvent(res, 'cmd', { line: `$ fetching flows via Platform API for ${profile.region || 'mypurecloud.com'}...` });
  
  try {
    const tokenRes = await fetch(`https://login.${profile.region || 'mypurecloud.com'}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${profile.clientId}:${profile.clientSecret}`).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(`Auth failed: ${tokenData.error_description || tokenData.error}`);
    
    let url = `https://api.${profile.region || 'mypurecloud.com'}/api/v2/flows?pageSize=100&sortBy=name`;
    if (options.flowType) url += `&type=${options.flowType}`;
    
    const flowsRes = await fetch(url, { headers: { 'Authorization': `Bearer ${tokenData.access_token}` } });
    const flowsData = await flowsRes.json();
    if (!flowsRes.ok) throw new Error(`API failed: ${flowsData.message}`);
    
    sseEvent(res, 'stdout', { line: `  NAME   TYPE   DIVISION` });
    if (flowsData.entities && flowsData.entities.length > 0) {
      let count = 0;
      for (const f of flowsData.entities) {
        const divName = f.division?.name || 'Home';
        // Need at least 2 spaces between elements for the frontend to parse correctly
        sseEvent(res, 'stdout', { line: `  ${f.name}   ${f.type.toLowerCase()}   ${divName}` });
        count++;
        if (options.maxResults && count >= options.maxResults) break;
      }
    }
    
    sseEvent(res, 'done', { exitCode: 0 });
    res.end();
  } catch (err) {
    sseEvent(res, 'error', { line: err.message });
    sseEvent(res, 'done', { exitCode: 1 });
    res.end();
  }
}
