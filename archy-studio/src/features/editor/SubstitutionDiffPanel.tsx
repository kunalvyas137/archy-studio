import { useMemo } from 'react';
import { useAppStore } from '../../store/appStore';

interface Props {
  original: string;
  profileId: string | null;
}

function applySubstitutions(content: string, subs: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(subs)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

function computeDiff(original: string, resolved: string) {
  const origLines = original.split('\n');
  const resolvedLines = resolved.split('\n');
  const maxLen = Math.max(origLines.length, resolvedLines.length);
  const result: { orig: string; resolved: string; changed: boolean; lineNum: number }[] = [];
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? '';
    const r = resolvedLines[i] ?? '';
    result.push({ orig: o, resolved: r, changed: o !== r, lineNum: i + 1 });
  }
  return result;
}

export function SubstitutionDiffPanel({ original, profileId }: Props) {
  const { profiles } = useAppStore();
  const profile = profiles.find((p) => p.id === profileId);
  const subs = profile?.substitutions || {};

  const resolved = useMemo(() => applySubstitutions(original, subs), [original, subs]);
  const diff = useMemo(() => computeDiff(original, resolved), [original, resolved]);
  const hasChanges = diff.some((d) => d.changed);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        padding: '8px 14px', background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Substitution Preview
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!profile ? (
            <span className="badge badge-grey">No env active</span>
          ) : hasChanges ? (
            <span className="badge badge-green">{Object.keys(subs).length} subs applied</span>
          ) : (
            <span className="badge badge-grey">No substitutions</span>
          )}
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ padding: '6px 12px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', borderRight: '1px solid var(--border)' }}>
          Original
        </div>
        <div style={{ padding: '6px 12px', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Resolved ({profile?.name || 'no env'})
        </div>
      </div>

      {/* Diff lines */}
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.65 }}>
        {diff.map((line) => (
          <div
            key={line.lineNum}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              background: line.changed ? 'rgba(255,79,31,0.05)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.02)',
            }}
          >
            <div style={{
              padding: '0 12px', color: line.changed ? '#ef4444' : 'var(--text-muted)',
              borderRight: '1px solid var(--border)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre',
            }}>
              <span style={{ color: 'var(--text-muted)', userSelect: 'none', marginRight: 8, opacity: 0.5, fontSize: 10 }}>
                {String(line.lineNum).padStart(3)}
              </span>
              {line.orig}
            </div>
            <div style={{
              padding: '0 12px', color: line.changed ? 'var(--success)' : 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre',
            }}>
              {line.resolved}
            </div>
          </div>
        ))}
      </div>

      {/* Footer — substitution key summary */}
      {profile && Object.keys(subs).length > 0 && (
        <div style={{
          padding: '8px 12px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-surface)',
        }}>
          {Object.entries(subs).map(([k, v]) => (
            <span key={k} style={{ fontSize: 10.5, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px', color: 'var(--text-secondary)' }}>
              <span style={{ color: 'var(--accent)' }}>{`{{${k}}}`}</span> → {v}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
