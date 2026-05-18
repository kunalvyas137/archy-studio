import { Handle, Position } from '@xyflow/react';
import {
  PlayCircle, PhoneForwarded, GitBranch, Terminal,
  Database, StopCircle, RefreshCw, Layers, TriangleAlert,
} from 'lucide-react';

export interface ActionNodeData {
  label: string;
  type: string;
  details: any;
  dimmed?: boolean;
  validationMode?: boolean;
  validationWarnings?: string[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; accent: string; accentBg: string }> = {
  playAudio:       { icon: <PlayCircle size={16} />,     accent: '#3b82f6', accentBg: '#eff6ff' },
  setWhisperAudio: { icon: <PlayCircle size={16} />,     accent: '#3b82f6', accentBg: '#eff6ff' },
  transferToAcd:   { icon: <PhoneForwarded size={16} />, accent: '#6366f1', accentBg: '#eef2ff' },
  transferToFlow:  { icon: <PhoneForwarded size={16} />, accent: '#6366f1', accentBg: '#eef2ff' },
  transferToNumber:{ icon: <PhoneForwarded size={16} />, accent: '#6366f1', accentBg: '#eef2ff' },
  switch:          { icon: <GitBranch size={16} />,      accent: '#f97316', accentBg: '#fff7ed' },
  decision:        { icon: <GitBranch size={16} />,      accent: '#f97316', accentBg: '#fff7ed' },
  updateData:      { icon: <RefreshCw size={16} />,      accent: '#10b981', accentBg: '#ecfdf5' },
  dataTableLookup: { icon: <Database size={16} />,       accent: '#8b5cf6', accentBg: '#f5f3ff' },
  disconnect:      { icon: <StopCircle size={16} />,     accent: '#ef4444', accentBg: '#fef2f2' },
  endTask:         { icon: <StopCircle size={16} />,     accent: '#ef4444', accentBg: '#fef2f2' },
  callTask:        { icon: <Layers size={16} />,         accent: '#14b8a6', accentBg: '#f0fdfa' },
  jumpToTask:      { icon: <Layers size={16} />,         accent: '#14b8a6', accentBg: '#f0fdfa' },
  jumpToMenu:      { icon: <Layers size={16} />,         accent: '#14b8a6', accentBg: '#f0fdfa' },
  callCommonModule:{ icon: <Layers size={16} />,         accent: '#14b8a6', accentBg: '#f0fdfa' },
};

const READABLE: Record<string, string> = {
  playAudio: 'Play Message', setWhisperAudio: 'Play Whisper',
  transferToAcd: 'Transfer → Queue', transferToFlow: 'Transfer → Flow',
  transferToNumber: 'Transfer → Number', switch: 'Decision', decision: 'Decision',
  updateData: 'Update Data', dataTableLookup: 'Data Lookup',
  disconnect: 'End Call', endTask: 'End Task',
  callTask: 'Execute Task', jumpToTask: 'Jump to Task',
  jumpToMenu: 'Jump to Menu', callCommonModule: 'Execute Module',
};

export function ActionNode({ data }: { data: ActionNodeData }) {
  const cfg = TYPE_CONFIG[data.type] ?? { icon: <Terminal size={16} />, accent: '#94a3b8', accentBg: '#f8fafc' };
  const hasWarnings = data.validationMode && data.validationWarnings && data.validationWarnings.length > 0;

  return (
    <div style={{
      background: '#fff',
      border: `1px solid ${hasWarnings ? '#fca5a5' : '#e2e8f0'}`,
      borderLeft: `5px solid ${hasWarnings ? '#ef4444' : cfg.accent}`,
      borderRadius: 10,
      padding: '10px 14px',
      minWidth: 200,
      maxWidth: 240,
      boxShadow: hasWarnings ? '0 0 0 2px rgba(239,68,68,0.15)' : '0 2px 8px rgba(0,0,0,0.07)',
      opacity: data.dimmed ? 0.2 : 1,
      transition: 'all 0.2s',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Top}
        style={{ width: 8, height: 8, background: '#cbd5e1', border: '2px solid #fff' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          background: cfg.accentBg, color: cfg.accent,
          borderRadius: 7, padding: 6, display: 'flex', flexShrink: 0,
        }}>
          {cfg.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 2 }}>
            {READABLE[data.type] ?? data.type}
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {data.label}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom}
        style={{ width: 8, height: 8, background: '#cbd5e1', border: '2px solid #fff' }} />

      {hasWarnings && (
        <div style={{
          position: 'absolute', top: -8, right: -8,
          background: '#ef4444', color: '#fff', borderRadius: '50%',
          padding: 4, border: '2px solid #fff', boxShadow: '0 2px 6px rgba(239,68,68,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <TriangleAlert size={12} />
        </div>
      )}
    </div>
  );
}
