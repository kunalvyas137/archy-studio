// Dynamic API base URL:
//  - In Electron (production): reads port from the preload via window.electron.getApiPort()
//  - In browser dev mode: falls back to hardcoded 3001
declare global {
  interface Window {
    electron?: {
      getApiPort: () => Promise<number>;
      platform: string;
      version: string;
    };
    __ARCHY_API_BASE__?: string;
  }
}

async function resolveBase(): Promise<string> {
  if (window.__ARCHY_API_BASE__) return window.__ARCHY_API_BASE__;
  if (window.electron?.getApiPort) {
    const port = await window.electron.getApiPort();
    window.__ARCHY_API_BASE__ = `http://127.0.0.1:${port}`;
    return window.__ARCHY_API_BASE__;
  }
  return 'http://localhost:3001';
}

// Synchronous base for code that can't await (resolved on first async call)
let _base = 'http://localhost:3001';
resolveBase().then((b) => { _base = b; });

function getBase() { return _base; }


async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${getBase()}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  // ARCHY
  archyCheck: () => req<{ installed: boolean; version: string }>('GET', '/api/archy/check'),

  // Profiles
  listProfiles: () => req<any[]>('GET', '/api/profiles'),
  getProfile: (id: string) => req<any>('GET', `/api/profiles/${id}`),
  saveProfile: (data: any) =>
    data.id
      ? req<any>('PUT', `/api/profiles/${data.id}`, data)
      : req<any>('POST', '/api/profiles', data),
  deleteProfile: (id: string) => req<any>('DELETE', `/api/profiles/${id}`),

  // YAML files
  listYamlFiles: (dir?: string) =>
    req<any[]>('GET', `/api/yaml/list${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
  readYamlFile: (name: string, dir?: string) =>
    fetch(`${getBase()}/api/yaml/${encodeURIComponent(name)}${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`)
      .then((r) => r.text()),
  saveYamlFile: (name: string, content: string, dir?: string) =>
    req<any>('POST', `/api/yaml/${encodeURIComponent(name)}${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`, { content }),
  deleteYamlFile: (name: string, dir?: string) =>
    req<any>('DELETE', `/api/yaml/${encodeURIComponent(name)}${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),

  // Git
  gitStatus: (dir?: string) =>
    req<any>('GET', `/api/git/status${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
  gitLog: (dir?: string, max = 20) =>
    req<any>('GET', `/api/git/log?max=${max}${dir ? `&dir=${encodeURIComponent(dir)}` : ''}`),
  gitDiff: (file?: string, cached = false, dir?: string) =>
    fetch(`${getBase()}/api/git/diff?${new URLSearchParams({ ...(file ? { file } : {}), ...(cached ? { cached: '1' } : {}), ...(dir ? { dir } : {}) })}`)
      .then((r) => r.text()),
  gitConfig: (dir?: string) =>
    req<any>('GET', `/api/git/config${dir ? `?dir=${encodeURIComponent(dir)}` : ''}`),
  gitAdd: (files: string[], dir?: string) => req<any>('POST', '/api/git/add', { files, dir }),
  gitCommit: (message: string, authorName?: string, authorEmail?: string, dir?: string) =>
    req<any>('POST', '/api/git/commit', { message, authorName, authorEmail, dir }),
  gitPush: (remote = 'origin', branch = 'main', dir?: string) =>
    req<any>('POST', '/api/git/push', { remote, branch, dir }),
  gitSetRemote: (url: string, remote = 'origin', dir?: string) =>
    req<any>('POST', '/api/git/set-remote', { url, remote, dir }),
  gitInit: (dir?: string) => req<any>('POST', '/api/git/init', { dir }),
};

// SSE streaming helper
export function streamArchy(
  endpoint: string,
  body: Record<string, unknown>,
  onEvent: (event: { type: string; line?: string; ts: number; exitCode?: number }) => void
): () => void {
  const ctrl = new AbortController();

  fetch(`${getBase()}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).then(async (res) => {
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() || '';
      for (const part of parts) {
        const line = part.replace(/^data: /, '').trim();
        if (line) {
          try { onEvent(JSON.parse(line)); } catch {}
        }
      }
    }
  }).catch(() => {});

  return () => ctrl.abort();
}
