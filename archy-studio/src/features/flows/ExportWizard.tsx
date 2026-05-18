import { useState } from 'react';
import { X, Download, CheckCircle, XCircle, GitCommit } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useArchyStream } from '../../hooks/useArchyStream';
import { api } from '../../api/client';

const FLOW_TYPES: { value: string; label: string }[] = [
  { value: 'inboundcall',         label: 'Inbound Call' },
  { value: 'inboundemail',        label: 'Inbound Email' },
  { value: 'inboundshortmessage', label: 'Inbound Short Message (SMS)' },
  { value: 'outboundcall',        label: 'Outbound Call' },
  { value: 'workflow',            label: 'Workflow' },
  { value: 'commonmodule',        label: 'Common Module' },
  { value: 'inqueuecall',         label: 'In-Queue Call' },
  { value: 'inqueueemail',        label: 'In-Queue Email' },
  { value: 'inqueueshortmessage', label: 'In-Queue Short Message' },
  { value: 'securecall',          label: 'Secure Call' },
  { value: 'bot',                 label: 'Bot Flow' },
  { value: 'digitalbot',          label: 'Digital Bot Flow' },
  { value: 'surveyinvite',        label: 'Survey Invite' },
  { value: 'voice',               label: 'Voice (Survey)' },
  { value: 'workitem',            label: 'Workitem' },
];

interface Props {
  onClose: () => void;
  initialFlow?: { name: string; type: string } | null;
}

export function ExportWizard({ onClose, initialFlow }: Props) {
  const { profiles, activeProfileId } = useAppStore();
  const { status, lines, run } = useArchyStream();
  const [flowName, setFlowName] = useState(initialFlow?.name || '');
  const [flowType, setFlowType] = useState(initialFlow?.type || FLOW_TYPES[0].value);
  const [profileId, setProfileId] = useState(activeProfileId || '');
  const [step, setStep] = useState(1);

  const selectedProfile = profiles.find((p) => p.id === profileId);

  function doExport() {
    if (!profileId || !flowName || !flowType) return;
    run('/api/archy/export', { profileId, flowName, flowType }, `Export: ${flowName}`);
    setStep(2);
  }

  async function commitToGit() {
    if (!selectedProfile) return;
    try {
      const filename = `${flowName.replace(/\s+/g, '_')}.yaml`;
      await api.gitAdd([filename], selectedProfile.workspaceDir);
      await api.gitCommit(`Export: ${filename}`, undefined, undefined, selectedProfile.workspaceDir);
      alert('Committed to Git!');
    } catch (e: any) { alert('Git commit failed: ' + e.message); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Export Flow from Org</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="form-group">
                <label className="form-label">Flow Name *</label>
                <input className="form-input" value={flowName} onChange={(e) => setFlowName(e.target.value)} placeholder="My Inbound Flow" required />
              </div>
              <div className="form-group">
                <label className="form-label">Flow Type *</label>
                <select className="form-select" value={flowType} onChange={(e) => setFlowType(e.target.value)}>
                  {FLOW_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source Environment *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {profiles.map((p) => (
                    <div
                      key={p.id}
                      className="card"
                      style={{ padding: '12px 16px', cursor: 'pointer', borderColor: profileId === p.id ? 'var(--accent)' : undefined }}
                      onClick={() => setProfileId(p.id)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.region}</div>
                        </div>
                        {profileId === p.id && <CheckCircle size={16} color="var(--accent)" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {status === 'running' && <><div className="spinner" /><span>Exporting <strong>{flowName}</strong>…</span></>}
                {status === 'success' && <><CheckCircle size={18} color="var(--success)" /><span style={{ color: 'var(--success)', fontWeight: 600 }}>Export complete!</span></>}
                {status === 'error' && <><XCircle size={18} color="var(--error)" /><span style={{ color: 'var(--error)', fontWeight: 600 }}>Export failed</span></>}
              </div>
              <div className="log-terminal" style={{ height: 240 }}>
                {lines.map((l) => (
                  <div key={l.id} className={`log-line log-${l.type}`}>
                    <span className="log-ts">{new Date(l.ts).toLocaleTimeString()}</span>
                    <span>{l.line}</span>
                  </div>
                ))}
              </div>
              {status === 'success' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                  <button className="btn btn-success btn-sm" onClick={commitToGit}>
                    <GitCommit size={13} />Commit to Git
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            {step === 2 && status !== 'running' ? 'Close' : 'Cancel'}
          </button>
          {step === 1 && (
            <button className="btn btn-primary" disabled={!flowName || !profileId} onClick={doExport}>
              <Download size={14} />Export
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
