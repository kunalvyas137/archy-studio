import { useState } from 'react';
import { Terminal, Trash2, Copy, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { LogEntry, Operation } from '../../store/appStore';

function LogLine({ entry }: { entry: LogEntry }) {
  const cls = entry.type === 'done'
    ? entry.exitCode === 0 ? 'log-success' : 'log-error'
    : `log-${entry.type}`;
  return (
    <div className={`log-line ${cls}`}>
      <span className="log-ts">{new Date(entry.ts).toLocaleTimeString()}</span>
      <span>{entry.line}</span>
    </div>
  );
}

export function DeployLogPage() {
  const { logs, operations, clearLogs } = useAppStore();
  const [selectedOpId, setSelectedOpId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const displayedLogs = logs.filter((l) => {
    if (selectedOpId && l.operationId !== selectedOpId) return false;
    if (filterType === 'errors') return l.type === 'stderr' || l.type === 'error' || (l.type === 'done' && l.exitCode !== 0);
    if (filterType === 'cmds') return l.type === 'cmd';
    return true;
  });

  function copyAll() {
    navigator.clipboard.writeText(displayedLogs.map((l) => `[${new Date(l.ts).toLocaleTimeString()}] ${l.line}`).join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-title">Deploy Log</div>
        <div className="page-subtitle">Persistent log of all ARCHY operations</div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: 16, overflow: 'hidden' }}>
        {/* Operation history sidebar */}
        <div style={{
          width: 240, flexShrink: 0, background: 'var(--bg-surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 12.5 }}>
            Operations ({operations.length})
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div
              className={`file-item ${!selectedOpId ? 'active' : ''}`}
              onClick={() => setSelectedOpId(null)}
            >
              <Terminal size={13} />
              <span style={{ fontSize: 12 }}>All operations</span>
            </div>
            {operations.map((op) => (
              <div
                key={op.id}
                className={`file-item ${selectedOpId === op.id ? 'active' : ''}`}
                onClick={() => setSelectedOpId(op.id)}
              >
                <span style={{ flexShrink: 0 }}>
                  {op.status === 'running' && <div className="spinner" style={{ width: 12, height: 12 }} />}
                  {op.status === 'success' && <CheckCircle size={12} color="var(--success)" />}
                  {op.status === 'error' && <XCircle size={12} color="var(--error)" />}
                </span>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(op.startedAt).toLocaleTimeString()}</div>
                </div>
              </div>
            ))}
            {operations.length === 0 && (
              <div style={{ padding: '24px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                No operations yet
              </div>
            )}
          </div>
        </div>

        {/* Main log panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'errors', 'cmds'].map((f) => (
                <button
                  key={f}
                  className={`chip ${filterType === f ? 'active' : ''}`}
                  onClick={() => setFilterType(f)}
                >
                  {f === 'all' ? 'All' : f === 'errors' ? 'Errors only' : 'Commands'}
                </button>
              ))}
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={copyAll}>
                {copied ? <CheckCircle size={13} /> : <Copy size={13} />}{copied ? 'Copied!' : 'Copy All'}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => clearLogs(selectedOpId || undefined)}>
                <Trash2 size={13} />Clear
              </button>
            </div>
          </div>

          {/* Log terminal */}
          <div className="log-terminal" style={{ flex: 1, overflow: 'auto' }}>
            {displayedLogs.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', padding: '20px 0', textAlign: 'center', fontSize: 12 }}>
                {logs.length === 0 ? 'No log output yet. Run a publish or export operation.' : 'No entries match filter.'}
              </div>
            ) : (
              displayedLogs.map((entry) => <LogLine key={entry.id} entry={entry} />)
            )}
          </div>

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {displayedLogs.length} lines · {operations.filter((o) => o.status === 'running').length > 0 ? '⟳ Running…' : 'Idle'}
          </div>
        </div>
      </div>
    </div>
  );
}
