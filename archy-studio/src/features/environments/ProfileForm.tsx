import { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import type { Profile } from '../../store/appStore';

const REGIONS = [
  { value: 'mypurecloud.com',        label: '🇺🇸 US East' },
  { value: 'mypurecloud.ie',         label: '🇮🇪 EU West (Ireland)' },
  { value: 'mypurecloud.de',         label: '🇩🇪 EU Central (Frankfurt)' },
  { value: 'mypurecloud.com.au',     label: '🇦🇺 AP SE (Sydney)' },
  { value: 'mypurecloud.jp',         label: '🇯🇵 AP NE (Tokyo)' },
  { value: 'cac1.pure.cloud',        label: '🇨🇦 CA Central' },
  { value: 'use2.us-gov-pure.cloud', label: '🇺🇸 US Gov West' },
  { value: 'euw2.pure.cloud',        label: '🇬🇧 EU West (London)' },
  { value: 'aps1.pure.cloud',        label: '🇸🇬 AP SE (Singapore)' },
  { value: 'mec1.pure.cloud',        label: '🇦🇪 ME Central (UAE)' },
];

interface Props {
  initial: Profile | null;
  onSave: (data: Partial<Profile>) => void;
  onClose: () => void;
}

export function ProfileForm({ initial, onSave, onClose }: Props) {
  const [form, setForm] = useState<Partial<Profile>>(
    initial || { name: '', region: 'mypurecloud.com', orgName: '', division: 'Home', clientId: '', clientSecret: '', gitBranch: 'main' }
  );
  const [showSecret, setShowSecret] = useState(false);
  const [tab, setTab] = useState<'basic' | 'git' | 'substitutions'>('basic');
  const [subRows, setSubRows] = useState<[string, string][]>(
    Object.entries(initial?.substitutions || {})
  );

  function set(key: keyof Profile, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const substitutions: Record<string, string> = {};
    subRows.forEach(([k, v]) => { if (k) substitutions[k] = v; });
    onSave({ ...form, substitutions });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{initial ? 'Edit Environment' : 'Add Environment'}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="tabs" style={{ padding: '0 24px' }}>
          {(['basic', 'git', 'substitutions'] as const).map((t) => (
            <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'basic' ? 'Connection' : t === 'git' ? 'Git Settings' : 'Substitutions'}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {tab === 'basic' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Display Name *</label>
                    <input className="form-input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} placeholder="Production AU" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Org Name</label>
                    <input className="form-input" value={form.orgName || ''} onChange={(e) => set('orgName', e.target.value)} placeholder="MyCompany" />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label className="form-label">Region *</label>
                    <select className="form-select" value={form.region || ''} onChange={(e) => set('region', e.target.value)} required>
                      {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Division</label>
                    <input className="form-input" value={form.division || ''} onChange={(e) => set('division', e.target.value)} placeholder="Home" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">OAuth Client ID *</label>
                  <input className="form-input" value={form.clientId || ''} onChange={(e) => set('clientId', e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" required />
                </div>
                <div className="form-group">
                  <label className="form-label">OAuth Client Secret *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-input"
                      type={showSecret ? 'text' : 'password'}
                      value={form.clientSecret || ''}
                      onChange={(e) => set('clientSecret', e.target.value)}
                      placeholder={initial ? '(unchanged)' : 'Enter secret'}
                      style={{ paddingRight: 40 }}
                    />
                    <button type="button" onClick={() => setShowSecret(!showSecret)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {showSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Workspace Directory</label>
                  <input className="form-input" value={form.workspaceDir || ''} onChange={(e) => set('workspaceDir', e.target.value)} placeholder="/path/to/workspace" />
                </div>
              </>
            )}

            {tab === 'git' && (
              <>
                <div className="form-group">
                  <label className="form-label">Git Remote URL</label>
                  <input className="form-input" value={form.gitRemote || ''} onChange={(e) => set('gitRemote', e.target.value)} placeholder="https://github.com/org/genesys-flows.git" />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch</label>
                  <input className="form-input" value={form.gitBranch || 'main'} onChange={(e) => set('gitBranch', e.target.value)} placeholder="main" />
                </div>
                <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  💡 The Git remote and branch are used for committing exported YAML flows. The workspace directory above is treated as the repository root.
                </div>
              </>
            )}

            {tab === 'substitutions' && (
              <>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
                  Define <code style={{ color: 'var(--text-code)' }}>{'{{'}</code>variable<code style={{ color: 'var(--text-code)' }}>{'}}'}</code> substitutions for this environment. These are injected into YAML during export/publish.
                </div>
                <table className="data-table" style={{ marginBottom: 12 }}>
                  <thead><tr><th>Variable Key</th><th>Value</th><th></th></tr></thead>
                  <tbody>
                    {subRows.map(([k, v], i) => (
                      <tr key={i}>
                        <td><input className="form-input" value={k} onChange={(e) => { const r = [...subRows]; r[i] = [e.target.value, v]; setSubRows(r); }} placeholder="env" /></td>
                        <td><input className="form-input" value={v} onChange={(e) => { const r = [...subRows]; r[i] = [k, e.target.value]; setSubRows(r); }} placeholder="PROD" /></td>
                        <td><button type="button" className="btn btn-danger btn-sm btn-icon" onClick={() => setSubRows(subRows.filter((_, j) => j !== i))}><X size={13} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSubRows([...subRows, ['', '']])}>+ Add Variable</button>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}
