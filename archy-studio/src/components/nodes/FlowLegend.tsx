import { Panel } from '@xyflow/react';
import { PhoneForwarded, GitBranch, PlayCircle, Layers, StopCircle, Database, Square } from 'lucide-react';

const LEGEND_ITEMS = [
  { icon: <Square size={12} fill="#f0fdf4" stroke="#86efac" />, label: 'Task / Entry Point', color: '#16a34a' },
  { icon: <Square size={12} fill="#fffbeb" stroke="#fcd34d" />, label: 'Menu', color: '#b45309' },
  { icon: <PlayCircle size={12} />, label: 'Play Audio', color: '#3b82f6' },
  { icon: <PhoneForwarded size={12} />, label: 'Transfer', color: '#6366f1' },
  { icon: <GitBranch size={12} />, label: 'Decision / Switch', color: '#f97316' },
  { icon: <Database size={12} />, label: 'Data Lookup', color: '#8b5cf6' },
  { icon: <Layers size={12} />, label: 'Jump / Call Task', color: '#14b8a6' },
  { icon: <StopCircle size={12} />, label: 'Disconnect', color: '#ef4444' },
];

export function FlowLegend() {
  return (
    <Panel position="bottom-left">
      <div style={{
        background: 'rgba(13,17,23,0.9)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        padding: '10px 14px',
        minWidth: 170,
      }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>
          Legend
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {LEGEND_ITEMS.map(({ icon, label, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, color }}>
              {icon}
              <span style={{ fontSize: 11, fontWeight: 500, color: '#d1d5db' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
