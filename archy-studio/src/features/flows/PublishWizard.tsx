import { useState } from 'react';
import { X, Upload, CheckCircle, XCircle, GitCommit } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useArchyStream } from '../../hooks/useArchyStream';
import { api } from '../../api/client';

const FLOW_TYPES = [
  'inboundcall','inboundemail','inboundshortmessage','outboundcall',
  'workflow','commonmodule','inqueuecall','inqueueemail','bot',
];

interface Props {
  onClose: () => void;
  initialFlow?: { name: string; type: string } | null;
  /** Pre-fill from the currently open editor file */
  activeFile?: string | null;
  workspaceDir?: string;
}

export function PublishWizard({ onClose, initialFlow, activeFile, workspaceDir }: Props) {
  const { profiles, activeProfileId } = useAppStore();
  const { status, lines, run } = useArchyStream();
  const [step, setStep] = useState(1);

  // Pre-fill from the currently open editor file
  const initialPath = activeFile
    ? workspaceDir ? `${workspaceDir}/${activeFile}` : activeFile
    : '';
  const [filePath, setFilePath] = useState(initialPath);
  const [profileId, setProfileId] = useState(activeProfileId || '');
  const [subs, setSubs] = useState<[string, string][]>(() => {
    const p = profiles.find((x) => x.id === (activeProfileId || ''));
    return Object.entries(p?.substitutions || {});
  });

  const selectedProfile = profiles.find((p) => p.id === profileId);
  const substitutions = Object.fromEntries(subs.filter(([k]) => k));

  function commandPreview() {
    return `archy publish --file "${filePath}" --optionsFile <secured>`;
  }

  function deploy() {
    run('/api/archy/publish', { profileId, filePath, substitutions }, 'Publish Flow');
    setStep(5);
  }

  async function commitToGit() {
    if (!selectedProfile) return;
    try {
      await api.gitAdd([filePath], selectedProfile.workspaceDir);
      await api.gitCommit(`Deploy: ${filePath.split('/').pop()}`, undefined, undefined, selectedProfile.workspaceDir);
      alert('Committed to Git!');
    } catch (e: any) { alert('Git commit failed: ' + e.message); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Publish Flow</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Wizard steps */}
        <div className="wizard-steps">
          {['Select YAML','Target Env','Substitutions','Review','Deploy'].map((label, i) => (
            <div key={i} className={`wizard-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`}>
              <div className="wizard-step-num">{step > i + 1 ? '✓' : i + 1}</div>
              {label}
            </div>
          ))}
        </div>

        <div className="modal-body">
          {/* Step 1 */}
          {step === 1 && (
            <div>
              {/* Show currently open file as a quick-select chip */}
              {activeFile && (
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)', padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                }}
                >
                  <CheckCircle size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeFile}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Currently open in editor — ready to publish</div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">YAML File Path</label>
                <input className="form-input" value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/absolute/path/to/flow.yaml" />
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Full path is pre-filled from the open file. You can also drag &amp; drop a different file below.
                </div>
              </div>

              {/* Drop zone */}
              <div
                style={{
                  border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                  padding: '28px', textAlign: 'center', color: 'var(--text-muted)',
                  cursor: 'pointer', marginBottom: 4, transition: 'border-color 0.2s',
                }}
                onDragOver={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)'; }}
                onDragLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ''; }}
                onDrop={(e) => {
                  e.preventDefault();
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                  const f = e.dataTransfer.files[0];
                  if (f) setFilePath((f as any).path || f.name);
                }}
              >
                <Upload size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.35 }} />
                <div style={{ fontSize: 13 }}>Or drag &amp; drop a different YAML file here</div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                Choose the target Genesys Cloud environment:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    className={`card ${profileId === p.id ? 'glow-accent' : ''}`}
                    style={{
                      padding: '14px 18px', cursor: 'pointer',
                      borderColor: profileId === p.id ? 'var(--accent)' : undefined,
                    }}
                    onClick={() => {
                      setProfileId(p.id);
                      setSubs(Object.entries(p.substitutions || {}));
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.region} · {p.orgName}</div>
                      </div>
                      {profileId === p.id && <CheckCircle size={18} color="var(--accent)" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Review and edit substitution variables for <strong>{selectedProfile?.name}</strong>:
              </div>
              <table className="data-table" style={{ marginBottom: 12 }}>
                <thead><tr><th>{'{{Variable}}'}</th><th>Value</th><th></th></tr></thead>
                <tbody>
                  {subs.map(([k, v], i) => (
                    <tr key={i}>
                      <td><input className="form-input" value={k} onChange={(e) => { const r = [...subs]; r[i] = [e.target.value, v]; setSubs(r); }} /></td>
                      <td><input className="form-input" value={v} onChange={(e) => { const r = [...subs]; r[i] = [k, e.target.value]; setSubs(r); }} /></td>
                      <td><button className="btn btn-danger btn-sm" onClick={() => setSubs(subs.filter((_, j) => j !== i))}><X size={12} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="btn btn-secondary btn-sm" onClick={() => setSubs([...subs, ['', '']])}>+ Add Variable</button>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Review your deployment configuration before executing:
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 14, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Command</div>
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-code)' }}>{commandPreview()}</code>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Target</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedProfile?.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedProfile?.region}</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Substitutions</div>
                  {subs.filter(([k]) => k).length === 0
                    ? <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</div>
                    : subs.filter(([k]) => k).map(([k, v]) => (
                        <div key={k} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          <code style={{ color: 'var(--accent)' }}>{`{{${k}}}`}</code> → {v}
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          )}

          {/* Step 5 — Deploy */}
          {step === 5 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                {status === 'running' && <><div className="spinner" /><span style={{ color: 'var(--text-secondary)' }}>Deploying…</span></>}
                {status === 'success' && <><CheckCircle size={18} color="var(--success)" /><span style={{ color: 'var(--success)', fontWeight: 600 }}>Published successfully!</span></>}
                {status === 'error' && <><XCircle size={18} color="var(--error)" /><span style={{ color: 'var(--error)', fontWeight: 600 }}>Deployment failed</span></>}
              </div>
              <div className="log-terminal" style={{ height: 280 }}>
                {lines.map((l) => (
                  <div key={l.id} className={`log-line log-${l.type}`}>
                    <span className="log-ts">{new Date(l.ts).toLocaleTimeString()}</span>
                    <span>{l.line}</span>
                  </div>
                ))}
              </div>
              {status === 'success' && (
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-success btn-sm" onClick={commitToGit}>
                    <GitCommit size={13} />Commit to Git
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step < 5 && <button className="btn btn-secondary" onClick={onClose}>Cancel</button>}
          {step > 1 && step < 5 && <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 4 && (
            <button className="btn btn-primary"
              disabled={(step === 1 && !filePath) || (step === 2 && !profileId)}
              onClick={() => setStep(step + 1)}>
              Next →
            </button>
          )}
          {step === 4 && <button className="btn btn-primary" onClick={deploy}><Upload size={14} />Deploy Now</button>}
          {step === 5 && <button className="btn btn-secondary" onClick={onClose}>Close</button>}
        </div>
      </div>
    </div>
  );
}
