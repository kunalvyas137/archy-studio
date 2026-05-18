import { useAppStore } from '../store/appStore';

export function StatusBar() {
  const { archyInstalled, archyVersion, activeProfileId, profiles, operations } = useAppStore();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const lastOp = operations[0];

  return (
    <div className="status-bar">
      {/* ARCHY version */}
      <div className="status-bar-item">
        <div className={`status-dot ${archyInstalled ? 'ok' : 'error'}`} />
        <span>{archyInstalled ? `archy ${archyVersion}` : 'archy not installed'}</span>
      </div>

      <span className="status-bar-sep">│</span>

      {/* Active env */}
      <div className="status-bar-item">
        {activeProfile ? (
          <>
            <span style={{ color: 'var(--success)' }}>⬤</span>
            <span>{activeProfile.name} · {activeProfile.region}</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>No environment active</span>
        )}
      </div>

      {lastOp && (
        <>
          <span className="status-bar-sep">│</span>
          <div className="status-bar-item">
            <span>
              {lastOp.status === 'running' && '⟳ '}
              {lastOp.status === 'success' && '✓ '}
              {lastOp.status === 'error' && '✗ '}
              {lastOp.name}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>
              {new Date(lastOp.startedAt).toLocaleTimeString()}
            </span>
          </div>
        </>
      )}

      <div style={{ marginLeft: 'auto' }}>
        <span style={{ color: 'var(--text-muted)' }}>ARCHY Studio v1.0</span>
      </div>
    </div>
  );
}
