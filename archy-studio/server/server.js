import express from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { existsSync } from 'node:fs';

import { checkArchy, runArchy, listFlows, sseEvent } from './archy.js';
import { listProfiles, getProfile, saveProfile, deleteProfile } from './profiles.js';
import { listYamlFiles, readYamlFile, writeYamlFile, deleteYamlFile } from './yaml-files.js';
import {
  gitStatus, gitLog, gitDiff, gitDiffCached, gitAdd, gitCommit, gitPush,
  gitGetConfig, gitSetRemote, gitInit,
} from './git.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ──────────────────────────────────────────────
// ARCHY ROUTES
// ──────────────────────────────────────────────

// GET /api/archy/check
app.get('/api/archy/check', async (req, res) => {
  const result = await checkArchy();
  res.json(result);
});

// POST /api/archy/list — list flows in org (SSE)
app.post('/api/archy/list', async (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });
  let profile;
  try { profile = getProfile(profileId); } catch (e) { return res.status(404).json({ error: 'Profile not found' }); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  listFlows(res, profile, { flowType: req.body.flowType });
});

// POST /api/archy/export — export flow to YAML (SSE)
app.post('/api/archy/export', async (req, res) => {
  const { profileId, flowName, flowType, outputFile } = req.body;
  if (!profileId || !flowName || !flowType) {
    return res.status(400).json({ error: 'profileId, flowName, flowType required' });
  }
  let profile;
  try { profile = getProfile(profileId); } catch { return res.status(404).json({ error: 'Profile not found' }); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Archy export uses --exportFileName (name only) + --outputDir (directory path)
  // NOT --outputFile (which does not exist on the export command)
  const workspaceDir = outputFile
    ? require('path').dirname(outputFile)
    : (profile.workspaceDir || join(__dirname, '..', 'workspace'));

  const exportFileName = outputFile
    ? require('path').basename(outputFile)
    : `${flowName.replace(/\s+/g, '_')}.yaml`;

  const args = [
    'export',
    '--flowName', flowName,
    '--flowType', flowType,
    '--exportType', 'yaml',
    '--exportFileName', exportFileName,
    '--outputDir', workspaceDir,
    '--force',
  ];
  runArchy(res, args, profile);
});

// POST /api/archy/publish — publish YAML to org (SSE)
app.post('/api/archy/publish', async (req, res) => {
  const { profileId, filePath, substitutions } = req.body;
  if (!profileId || !filePath) {
    return res.status(400).json({ error: 'profileId and filePath required' });
  }
  let profile;
  try { profile = getProfile(profileId); } catch { return res.status(404).json({ error: 'Profile not found' }); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const args = ['publish', '--file', filePath];
  runArchy(res, args, profile, { substitutions });
});

// POST /api/archy/validate — validate YAML (SSE)
app.post('/api/archy/validate', async (req, res) => {
  const { profileId, filePath } = req.body;
  if (!profileId || !filePath) {
    return res.status(400).json({ error: 'profileId and filePath required' });
  }
  let profile;
  try { profile = getProfile(profileId); } catch { return res.status(404).json({ error: 'Profile not found' }); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  runArchy(res, ['validate', '--file', filePath], profile);
});

// POST /api/profiles/:id/test — test connection
app.post('/api/profiles/:id/test', async (req, res) => {
  let profile;
  try { profile = getProfile(req.params.id); } catch { return res.status(404).json({ error: 'Profile not found' }); }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  listFlows(res, profile, { maxResults: 1 });
});

// ──────────────────────────────────────────────
// PROFILE ROUTES
// ──────────────────────────────────────────────

app.get('/api/profiles', (req, res) => {
  try { res.json(listProfiles()); } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/profiles/:id', (req, res) => {
  try { res.json({ ...getProfile(req.params.id), clientSecret: '***' }); }
  catch { res.status(404).json({ error: 'Not found' }); }
});

app.post('/api/profiles', (req, res) => {
  try { res.json(saveProfile(req.body)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.put('/api/profiles/:id', (req, res) => {
  try { res.json(saveProfile({ ...req.body, id: req.params.id })); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/profiles/:id', (req, res) => {
  try { deleteProfile(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// YAML FILE ROUTES
// ──────────────────────────────────────────────

app.get('/api/yaml/list', (req, res) => {
  try { res.json(listYamlFiles(req.query.dir)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/yaml/:filename', (req, res) => {
  try { res.type('text/plain').send(readYamlFile(req.query.dir, req.params.filename)); }
  catch (e) { res.status(404).json({ error: e.message }); }
});

app.post('/api/yaml/:filename', (req, res) => {
  try {
    const fp = writeYamlFile(req.query.dir, req.params.filename, req.body.content);
    res.json({ ok: true, path: fp });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/yaml/:filename', (req, res) => {
  try { deleteYamlFile(req.query.dir, req.params.filename); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// GIT ROUTES
// ──────────────────────────────────────────────

app.get('/api/git/status', async (req, res) => {
  try { res.json(await gitStatus(req.query.dir || join(__dirname, '..', 'workspace'))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/git/log', async (req, res) => {
  try { res.json(await gitLog(req.query.dir || join(__dirname, '..', 'workspace'), parseInt(req.query.max) || 20)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/git/diff', async (req, res) => {
  try {
    const dir = req.query.dir || join(__dirname, '..', 'workspace');
    const diff = req.query.cached ? await gitDiffCached(dir) : await gitDiff(dir, req.query.file);
    res.type('text/plain').send(diff);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/git/config', async (req, res) => {
  try { res.json(await gitGetConfig(req.query.dir || join(__dirname, '..', 'workspace'))); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/git/add', async (req, res) => {
  try {
    const dir = req.body.dir || join(__dirname, '..', 'workspace');
    await gitAdd(dir, req.body.files);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/git/commit', async (req, res) => {
  try {
    const dir = req.body.dir || join(__dirname, '..', 'workspace');
    const result = await gitCommit(dir, req.body.message, req.body.authorName, req.body.authorEmail);
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/git/push', async (req, res) => {
  try {
    const dir = req.body.dir || join(__dirname, '..', 'workspace');
    const result = await gitPush(dir, req.body.remote, req.body.branch);
    res.json({ ok: true, result });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/git/set-remote', async (req, res) => {
  try {
    const dir = req.body.dir || join(__dirname, '..', 'workspace');
    await gitSetRemote(dir, req.body.url, req.body.remote);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/git/init', async (req, res) => {
  try {
    const dir = req.body.dir || join(__dirname, '..', 'workspace');
    await gitInit(dir);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ──────────────────────────────────────────────
// HEALTH CHECK (For AWS ECS/ALB)
// ──────────────────────────────────────────────
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() }));

// ──────────────────────────────────────────────
// STATIC FILES (Electron production mode)
// Serve the built Vite dist/ so Electron doesn't need a separate dev server
// ──────────────────────────────────────────────
const distPath = join(__dirname, '..', 'dist');
if (process.env.NODE_ENV === 'production' && existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — React Router handles client-side routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(join(distPath, 'index.html'));
    }
  });
}

// ──────────────────────────────────────────────
// START
// ──────────────────────────────────────────────

// ARCHY_STUDIO_PORT is set by Electron main process (random free port)
// PORT is used in plain dev mode, defaulting to 3001
const PORT = process.env.ARCHY_STUDIO_PORT || process.env.PORT || 3001;
const server = createServer(app);
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`✅ ARCHY Studio API server running at http://${HOST}:${PORT}`);
});
