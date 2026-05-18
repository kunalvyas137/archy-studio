import { useState } from 'react';
import { X, Plus, Download } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { api } from '../../api/client';

function applySubstitutions(content: string, subs: Record<string, string>): string {
  let result = content;
  for (const [k, v] of Object.entries(subs)) {
    result = result.replaceAll(`{{${k}}}`, v);
  }
  return result;
}

export function SubstitutionsPage() {
  const { profiles, activeProfileId, setActiveProfile, addOrUpdateProfile, editorContent } = useAppStore();
  const [editId, setEditId] = useState<string | null>(activeProfileId);

  const editProfile = profiles.find((p) => p.id === editId);
  const [rows, setRows] = useState<[string, string][]>(
    Object.entries(editProfile?.substitutions || {})
  );

  function switchProfile(id: string) {
    saveRows(); // save current before switching
    setEditId(id);
    const p = profiles.find((x) => x.id === id);
    setRows(Object.entries(p?.substitutions || {}));
  }

  async function saveRows() {
    if (!editProfile) return;
    const substitutions: Record<string, string> = {};
    rows.forEach(([k, v]) => { if (k) substitutions[k] = v; });
    const updated = { ...editProfile, substitutions };
    await api.saveProfile(updated);
    addOrUpdateProfile(updated);
  }

  function exportSubsYaml() {
    if (!editProfile) return;
    const subs = Object.fromEntries(rows.filter(([k]) => k));
    const content = `# Substitutions for ${editProfile.name}\nsubstitutions:\n` +
      Object.entries(subs).map(([k, v]) => `  ${k}: "${v}"`).join('\n');
    const blob = new Blob([content], { type: 'text/yaml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `substitutions-${editProfile.name.replace(/\s+/g, '_')}.yaml`;
    a.click();
  }

  const preview = editorContent
    ? applySubstitutions(editorContent, Object.fromEntries(rows.filter(([k]) => k)))
    : null;

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="page-title">Substitutions</div>
          <div className="page-subtitle">Manage {'{{variable}}'} replacements per environment</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={exportSubsYaml} disabled={!editProfile}>
            <Download size={13} />Export YAML
          </button>
          <button className="btn btn-primary btn-sm" onClick={saveRows} disabled={!editProfile}>
            Save
          </button>
        </div>
      </div>

      {/* Environment tabs */}
      <div className="tabs" style={{ marginBottom: 20 }}>
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`tab ${editId === p.id ? 'active' : ''}`}
            onClick={() => switchProfile(p.id)}
          >
            {p.name}
          </div>
        ))}
      </div>

      {!editProfile ? (
        <div className="empty-state">
          <div className="empty-state-desc">Add an environment first to manage its substitutions.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Left: edit table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{editProfile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{editProfile.region}</div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => setRows([...rows, ['', '']])}>
                <Plus size={13} />Add
              </button>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{'{{Variable}}'}</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([k, v], i) => (
                  <tr key={i}>
                    <td>
                      <input className="form-input" style={{ fontSize: 12.5 }} value={k}
                        onChange={(e) => { const r = [...rows]; r[i] = [e.target.value, v]; setRows(r); }}
                        placeholder="queueName" />
                    </td>
                    <td>
                      <input className="form-input" style={{ fontSize: 12.5 }} value={v}
                        onChange={(e) => { const r = [...rows]; r[i] = [k, e.target.value]; setRows(r); }}
                        placeholder="CustomerSupport_PROD" />
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setRows(rows.filter((_, j) => j !== i))}>
                        <X size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '24px' }}>
                    No substitutions yet. Click "Add" to create one.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Right: preview */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>YAML Preview</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {preview ? 'From current editor content' : 'Open a file in YAML Editor to preview'}
              </div>
            </div>
            <pre style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5, lineHeight: 1.65,
              color: 'var(--text-secondary)', padding: '14px 16px', overflow: 'auto',
              maxHeight: 500, margin: 0,
            }}>
              {preview
                ? preview.split('\n').map((line, i) => {
                    const changed = line !== (editorContent.split('\n')[i] || '');
                    return (
                      <span key={i} style={{ display: 'block', color: changed ? 'var(--success)' : undefined }}>
                        {line}
                      </span>
                    );
                  })
                : <span style={{ color: 'var(--text-muted)' }}>No preview available</span>
              }
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
