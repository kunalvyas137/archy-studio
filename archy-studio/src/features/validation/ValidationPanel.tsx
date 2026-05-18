import type { ValidationIssue } from '../../utils/yamlValidator';
import { AlertTriangle, XCircle, Info, CheckCircle } from 'lucide-react';

interface ValidationPanelProps {
  issues: ValidationIssue[];
  isRunning?: boolean;
}

const SEVERITY_CONFIG = {
  error: {
    icon: <XCircle size={14} />,
    color: '#ef4444',
    bg: '#450a0a',
    border: '#7f1d1d',
    label: 'Error',
  },
  warning: {
    icon: <AlertTriangle size={14} />,
    color: '#f59e0b',
    bg: '#422006',
    border: '#78350f',
    label: 'Warning',
  },
  info: {
    icon: <Info size={14} />,
    color: '#60a5fa',
    bg: '#0c1a3a',
    border: '#1e3a5f',
    label: 'Info',
  },
};

export function ValidationPanel({ issues, isRunning }: ValidationPanelProps) {
  const errors   = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const infos    = issues.filter((i) => i.severity === 'info');

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-base, #0d1117)',
      overflow: 'hidden',
    }}>
      {/* Summary header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border, #1e293b)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexShrink: 0,
        background: 'var(--bg-surface, #0f1923)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Validation Results
        </div>
        <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
          {isRunning && (
            <span style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', animation: 'pulse 1s infinite' }} />
              Scanning…
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: errors.length > 0 ? '#ef4444' : '#6b7280' }}>
            <XCircle size={13} /> {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: warnings.length > 0 ? '#f59e0b' : '#6b7280' }}>
            <AlertTriangle size={13} /> {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Issue list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {issues.length === 0 && !isRunning && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 12, color: '#4b5563',
          }}>
            <CheckCircle size={44} strokeWidth={1.5} color="#22c55e" />
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>No issues found</div>
            <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center', maxWidth: 280 }}>
              This YAML passed all validation rules. You're good to publish!
            </div>
          </div>
        )}

        {[...errors, ...warnings, ...infos].map((issue) => {
          const cfg = SEVERITY_CONFIG[issue.severity];
          return (
            <div key={issue.id} style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              <div style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }}>{cfg.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
                    color: cfg.color, background: `${cfg.color}20`, borderRadius: 4, padding: '2px 6px',
                  }}>
                    {cfg.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{issue.ruleName}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {issue.message}
                </div>
                {issue.detail && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, lineHeight: 1.5 }}>
                    {issue.detail}
                  </div>
                )}
                {issue.taskRef && (
                  <div style={{ marginTop: 6, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#6b7280', background: '#1e293b', borderRadius: 4, padding: '2px 7px' }}>
                    📍 {issue.taskRef}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
