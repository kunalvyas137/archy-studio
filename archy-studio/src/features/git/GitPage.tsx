import { useState, useEffect } from 'react';
import { GitCommit, GitBranch, Upload, RefreshCw, Settings, Clock, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../../api/client';
import { useAppStore } from '../../store/appStore';

interface GitStatusFile { path: string; index: string; working_dir: string; }
interface GitLogEntry { hash: string; message: string; date: string; author_name: string; }

export function GitPage() {
  const { profiles, activeProfileId } = useAppStore();
  const [tab, setTab] = useState<'changes' | 'history' | 'settings'>('changes');
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [gitLog, setGitLog] = useState<GitLogEntry[]>([]);
  const [commitMsg, setCommitMsg] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [staged, setStaged] = useState<string[]>([]);
  const [remoteUrl, setRemoteUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [diff, setDiff] = useState('');
  const [expandedDiff, setExpandedDiff] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const workspaceDir = activeProfile?.workspaceDir;

  function showMsg(text: string, type: 'success' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function refresh() {
    setLoading(true);
    try {
      const [status, log, cfg] = await Promise.all([
        api.gitStatus(workspaceDir),
        api.gitLog(workspaceDir),
        api.gitConfig(workspaceDir),
      ]);
      setGitStatus(status);
      setGitLog(log.all || []);
      setRemoteUrl(cfg.remotes?.[0]?.refs?.fetch || '');
      setBranch(cfg.branch || 'main');
    } catch (e: any) {
      // If git not initialised
      showMsg('Git not initialised in workspace. Use Settings tab to init.', 'error');
    }
    setLoading(false);
  }

  useEffect(() => { refresh(); }, [workspaceDir]);

  async function handleAdd(files: string[]) {
    try {
      await api.gitAdd(files, workspaceDir);
      setStaged((prev) => [...new Set([...prev, ...files])]);
      showMsg('Files staged', 'success');
    } catch (e: any) { showMsg(e.message, 'error'); }
  }

  async function handleCommit() {
    if (!commitMsg.trim()) return showMsg('Commit message required', 'error');
    setLoading(true);
    try {
      await api.gitCommit(commitMsg, authorName, authorEmail, workspaceDir);
      setCommitMsg('');
      setStaged([]);
      showMsg('Committed successfully', 'success');
      await refresh();
    } catch (e: any) { showMsg(e.message, 'error'); }
    setLoading(false);
  }

  async function handlePush() {
    setLoading(true);
    try {
      await api.gitPush('origin', branch, workspaceDir);
      showMsg('Pushed to remote', 'success');
    } catch (e: any) { showMsg(e.message, 'error'); }
    setLoading(false);
  }

  async function handleSetRemote() {
    try {
      await api.gitSetRemote(remoteUrl, 'origin', workspaceDir);
      showMsg('Remote URL updated', 'success');
    } catch (e: any) { showMsg(e.message, 'error'); }
  }

  async function handleInit() {
    try {
      await api.gitInit(workspaceDir);
      showMsg('Git repository initialised', 'success');
      await refresh();
    } catch (e: any) { showMsg(e.message, 'error'); }
  }

  async function viewDiff(file?: string) {
    try {
      const d = await api.gitDiff(file, false, workspaceDir);
      setDiff(d);
      setExpandedDiff(file || 'all');
    } catch {}
  }

  const modifiedFiles: string[] = gitStatus
    ? [
        ...(gitStatus.modified || []),
        ...(gitStatus.not_added || []),
        ...(gitStatus.created || []),
      ]
    : [];

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Git Integration</div>
          <div className="page-subtitle">Commit and push YAML flows to version control</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {activeProfile && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <GitBranch size={12} style={{ display: 'inline', marginRight: 4 }} />{branch} · {activeProfile.name}
            </span>
          )}
          <button className="btn btn-secondary btn-sm" onClick={refresh} disabled={loading}>
            <RefreshCw size={13} className={loading ? 'spinner' : ''} />Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handlePush} disabled={loading || !remoteUrl}>
            <Upload size={13} />Push
          </button>
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div className={`toast toast-${msg.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: 16 }}>
          {msg.type === 'success' ? <Check size={15} color="var(--success)" /> : <X size={15} color="var(--error)" />}
          {msg.text}
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        {(['changes', 'history', 'settings'] as const).map((t) => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'changes' ? `Changes${modifiedFiles.length > 0 ? ` (${modifiedFiles.length})` : ''}` : t === 'history' ? 'History' : 'Settings'}
          </div>
        ))}
      </div>

      {/* Changes Tab */}
      {tab === 'changes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Modified Files</div>
                {modifiedFiles.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleAdd(modifiedFiles)}>Stage All</button>
                )}
              </div>
              {modifiedFiles.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  {loading ? 'Loading…' : 'No changes detected. Working tree is clean.'}
                </div>
              ) : (
                <div>
                  {modifiedFiles.map((f) => (
                    <div key={f} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    }}>
                      <span style={{ width: 16, height: 16, background: 'var(--warning-dim)', color: 'var(--warning)', borderRadius: 3, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>M</span>
                      <span style={{ flex: 1, fontSize: 12.5, fontFamily: 'JetBrains Mono' }}>{f}</span>
                      <button className="btn btn-ghost btn-sm" onClick={() => viewDiff(f)}>Diff</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => handleAdd([f])}>Stage</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Diff viewer */}
            {expandedDiff && diff && (
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>Diff: {expandedDiff}</span>
                  <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setExpandedDiff(null)}><X size={13} /></button>
                </div>
                <pre style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: 1.6,
                  padding: '12px 14px', overflow: 'auto', maxHeight: 320, margin: 0,
                }}>
                  {diff.split('\n').map((line, i) => (
                    <span key={i} style={{
                      display: 'block',
                      color: line.startsWith('+') ? 'var(--success)' : line.startsWith('-') ? 'var(--error)' : line.startsWith('@@') ? 'var(--accent-blue)' : 'var(--text-muted)',
                    }}>{line}</span>
                  ))}
                </pre>
              </div>
            )}
          </div>

          {/* Commit panel */}
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Commit Changes</div>
            <div className="form-group">
              <label className="form-label">Commit Message *</label>
              <textarea className="form-textarea" style={{ minHeight: 80 }} value={commitMsg}
                onChange={(e) => setCommitMsg(e.target.value)} placeholder="Deploy: update inbound call flow" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Author Name</label>
                <input className="form-input" value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="form-group">
                <label className="form-label">Author Email</label>
                <input className="form-input" value={authorEmail} onChange={(e) => setAuthorEmail(e.target.value)} placeholder="jane@example.com" />
              </div>
            </div>
            {staged.length > 0 && (
              <div style={{ marginBottom: 12, fontSize: 12, color: 'var(--success)' }}>
                ✓ {staged.length} file{staged.length > 1 ? 's' : ''} staged
              </div>
            )}
            <button className="btn btn-primary" onClick={handleCommit} disabled={loading || !commitMsg.trim()} style={{ width: '100%' }}>
              <GitCommit size={14} />{loading ? 'Committing…' : 'Commit'}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr><th>Commit</th><th>Message</th><th>Author</th><th>Date</th></tr>
            </thead>
            <tbody>
              {gitLog.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px' }}>
                  {loading ? 'Loading…' : 'No commits yet'}
                </td></tr>
              ) : (
                gitLog.map((entry) => (
                  <tr key={entry.hash}>
                    <td><code style={{ fontFamily: 'JetBrains Mono', fontSize: 11.5, color: 'var(--accent-blue)' }}>{entry.hash?.slice(0, 7)}</code></td>
                    <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.message}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{entry.author_name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{entry.date ? new Date(entry.date).toLocaleString() : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings Tab */}
      {tab === 'settings' && (
        <div className="card" style={{ maxWidth: 580 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 18 }}>Repository Settings</div>
          <div className="form-group">
            <label className="form-label">Remote URL (origin)</label>
            <input className="form-input" value={remoteUrl} onChange={(e) => setRemoteUrl(e.target.value)} placeholder="https://github.com/org/flows.git" />
          </div>
          <div className="form-group">
            <label className="form-label">Branch</label>
            <input className="form-input" value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-primary" onClick={handleSetRemote}>Save Remote</button>
            <button className="btn btn-secondary" onClick={handleInit}>Init Repository</button>
          </div>
          <div className="divider" />
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Workspace:</strong> {workspaceDir || 'Default workspace directory'}<br />
            Set the workspace directory in the active environment profile.
          </div>
        </div>
      )}
    </div>
  );
}
