import { Handle, Position } from '@xyflow/react';
import { Layers, Menu, Play, AlertTriangle } from 'lucide-react';

export interface TaskNodeData {
  label: string;
  type: string;
  details: any;
  isTaskRoot?: boolean;
  dimmed?: boolean;
  validationMode?: boolean;
  validationWarnings?: string[];
}

export function TaskNode({ data }: { data: TaskNodeData }) {
  const isStart = data.type === 'Start';
  const isError = data.type === 'Error';
  const isMenu  = data.type === 'Menu';
  const hasWarnings = data.validationMode && data.validationWarnings && data.validationWarnings.length > 0;

  const bg      = hasWarnings ? '#fff5f5' : isStart ? '#f0fdf4' : isError ? '#fff1f2' : isMenu ? '#fffbeb' : '#f8fafc';
  const border  = hasWarnings ? '#fca5a5' : isStart ? '#86efac' : isError ? '#fda4af' : isMenu ? '#fcd34d' : '#e2e8f0';
  const iconBg  = isStart ? '#22c55e' : isError ? '#f43f5e' : isMenu ? '#f59e0b' : '#64748b';
  const label   = isStart ? '#16a34a' : isError ? '#be123c' : isMenu ? '#b45309' : '#475569';

  return (
    <div style={{
      background: bg,
      border: `2px solid ${border}`,
      borderRadius: 14,
      padding: '18px 22px',
      minWidth: 180,
      maxWidth: 220,
      textAlign: 'center',
      boxShadow: hasWarnings
        ? '0 0 0 3px rgba(239,68,68,0.2), 0 4px 16px rgba(0,0,0,0.1)'
        : '0 4px 16px rgba(0,0,0,0.08)',
      opacity: data.dimmed ? 0.2 : 1,
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      {!isStart && (
        <Handle type="target" position={Position.Top}
          style={{ width: 10, height: 10, background: '#cbd5e1', border: '2px solid #fff' }} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: iconBg, color: '#fff',
          borderRadius: 10, padding: 10, display: 'inline-flex',
          boxShadow: `0 4px 10px ${iconBg}55`,
        }}>
          {isStart ? <Play size={22} fill="white" /> : isMenu ? <Menu size={22} /> : <Layers size={22} />}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: label, marginBottom: 4 }}>
            {data.type}
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.3, wordBreak: 'break-word' }}>
            {data.label}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ width: 10, height: 10, background: '#cbd5e1', border: '2px solid #fff' }} />

      {hasWarnings && (
        <div style={{
          position: 'absolute', top: -10, right: -10,
          background: '#ef4444', color: '#fff', borderRadius: '50%',
          padding: 5, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(239,68,68,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={13} />
        </div>
      )}
    </div>
  );
}
