import { useState } from 'react';
import { Rocket, Download, Upload, RefreshCw, Search } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useArchyStream } from '../../hooks/useArchyStream';
import { PublishWizard } from './PublishWizard';
import { ExportWizard } from './ExportWizard';

const FLOW_TYPES = [
  'inboundcall', 'inboundemail', 'inboundshortmessage',
  'outboundcall', 'workflow', 'commonmodule', 'inqueuecall', 'bot',
];

interface ParsedFlow {
  name: string;
  type: string;
  division: string;
  published?: string;
  status?: string;
}

function parseFlowLines(lines: string[]): ParsedFlow[] {
  return lines
    .filter((l) => l.includes('|') || l.match(/^\s+\w/))
    .map((l) => {
      const parts = l.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
      if (parts.length >= 2) {
        return { name: parts[0], type: parts[1], division: parts[2] || 'Home', status: 'Active' };
      }
      return null;
    })
    .filter(Boolean) as ParsedFlow[];
}

export function FlowsPage() {
  const { profiles, activeProfileId, setActiveProfile } = useAppStore();
  const { status, lines, run } = useArchyStream();
  const [flows, setFlows] = useState<ParsedFlow[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [showPublish, setShowPublish] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [selectedFlow, setSelectedFlow] = useState<ParsedFlow | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  function fetchFlows() {
    if (!activeProfileId) return alert('Select an active environment first');
    setFlows([]);
    run('/api/archy/list', { profileId: activeProfileId }, 'List Flows');
  }

  // Parse flows from log lines whenever status changes to success
  const outputLines = lines.filter((l) => l.type === 'stdout').map((l) => l.line);
  const parsedFlows = outputLines.length > 0 ? parseFlowLines(outputLines) : flows;

  const displayed = parsedFlows.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter.length > 0 && !typeFilter.includes(f.type)) return false;
    return true;
  });

  function toggleType(t: string) {
    setTypeFilter((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Flow Manager</div>
          <div className="page-subtitle">View, export, and publish Architect flows across environments</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowExport(true)}><Download size={14} />Export Flow</button>
          <button className="btn btn-primary" onClick={() => setShowPublish(true)}><Upload size={14} />Publish Flow</button>
        </div>
      </div>

      {/* Environment selector */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Environment</span>
          <div style={{ display: 'flex', gap: 8, flex: 1, flexWrap: 'wrap' }}>
            {profiles.map((p) => (
              <button
                key={p.id}
                className={`chip ${p.id === activeProfileId ? 'active' : ''}`}
                onClick={() => setActiveProfile(p.id)}
              >
                {p.name}
                <span style={{ fontSize: 10, color: 'inherit', opacity: 0.7 }}>{p.region}</span>
              </button>
            ))}
            {profiles.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No environments — add one first</span>}
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={fetchFlows}
            disabled={!activeProfileId || status === 'running'}
          >
            {status === 'running' ? <><div className="spinner" />Fetching…</> : <><RefreshCw size={13} />Fetch Flows</>}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box">
          <Search size={13} color="var(--text-muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search flows…" />
        </div>
        {FLOW_TYPES.map((t) => (
          <button key={t} className={`chip ${typeFilter.includes(t) ? 'active' : ''}`} onClick={() => toggleType(t)}>
            {t}
          </button>
        ))}
        {typeFilter.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setTypeFilter([])}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div className="empty-state" style={{ padding: '48px 24px' }}>
            <div className="empty-state-icon"><Rocket size={48} /></div>
            <div className="empty-state-title">
              {status === 'running' ? 'Fetching flows…' : 'No flows yet'}
            </div>
            <div className="empty-state-desc">
              {!activeProfileId
                ? 'Select an environment above, then click "Fetch Flows".'
                : status === 'idle'
                ? 'Click "Fetch Flows" to list Architect flows from your org.'
                : 'No flows matched your filter.'}
            </div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Flow Name</th>
                <th>Type</th>
                <th>Division</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((flow, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{flow.name}</td>
                  <td><span className="badge badge-blue">{flow.type}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{flow.division}</td>
                  <td><span className="badge badge-green">{flow.status || 'Active'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => { setSelectedFlow(flow); setShowExport(true); }}>
                        <Download size={12} />Export
                      </button>
                      <button className="btn btn-ghost btn-sm"
                        onClick={() => { setSelectedFlow(flow); setShowPublish(true); }}>
                        <Upload size={12} />Publish
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showPublish && <PublishWizard onClose={() => { setShowPublish(false); setSelectedFlow(null); }} initialFlow={selectedFlow} />}
      {showExport && <ExportWizard onClose={() => { setShowExport(false); setSelectedFlow(null); }} initialFlow={selectedFlow} />}
    </div>
  );
}
