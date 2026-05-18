import { useState, useEffect } from 'react';
import { Plus, Globe, Trash2, Edit2, Wifi, Copy, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import type { Profile } from '../../store/appStore';
import { api } from '../../api/client';
import { ProfileForm } from './ProfileForm';
import { useArchyStream } from '../../hooks/useArchyStream';

const REGION_LABELS: Record<string, string> = {
  'mypurecloud.com': '🇺🇸 US East',
  'mypurecloud.ie': '🇮🇪 EU West (Ireland)',
  'mypurecloud.de': '🇩🇪 EU Central (Frankfurt)',
  'mypurecloud.com.au': '🇦🇺 AP SE (Sydney)',
  'mypurecloud.jp': '🇯🇵 AP NE (Tokyo)',
  'cac1.pure.cloud': '🇨🇦 CA Central',
  'use2.us-gov-pure.cloud': '🇺🇸 US Gov West',
};

function TestModal({ profile, onClose }: { profile: Profile; onClose: () => void }) {
  const { status, lines, run } = useArchyStream();

  useEffect(() => {
    run('/api/profiles/' + profile.id + '/test', { profileId: profile.id }, 'Test Connection');
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Testing: {profile.name}</div>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            {status === 'running' && <><div className="spinner" /><span style={{ color: 'var(--text-secondary)' }}>Connecting…</span></>}
            {status === 'success' && <><CheckCircle size={18} color="var(--success)" /><span style={{ color: 'var(--success)' }}>Connection successful!</span></>}
            {status === 'error' && <><XCircle size={18} color="var(--error)" /><span style={{ color: 'var(--error)' }}>Connection failed</span></>}
          </div>
          <div className="log-terminal" style={{ height: 240 }}>
            {lines.map((l) => (
              <div key={l.id} className={`log-line log-${l.type}`}>
                <span className="log-ts">{new Date(l.ts).toLocaleTimeString()}</span>
                <span>{l.line}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ProfileCard({ profile, onEdit, onDelete, onTest, onSetActive, isActive }: {
  profile: Profile;
  onEdit: () => void;
  onDelete: () => void;
  onTest: () => void;
  onSetActive: () => void;
  isActive: boolean;
}) {
  const regionLabel = REGION_LABELS[profile.region] || profile.region;

  return (
    <div className={`card ${isActive ? 'glow-accent' : ''}`} style={{ borderColor: isActive ? 'var(--accent)' : undefined }}>
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 'var(--radius-sm)',
            background: 'linear-gradient(135deg, var(--accent-dim), var(--bg-elevated))',
            border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={18} color="var(--accent)" />
          </div>
          <div>
            <div className="card-title">{profile.name}</div>
            <div className="card-subtitle">{regionLabel}</div>
          </div>
        </div>
        {isActive && <span className="badge badge-orange">Active</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Org</span><span style={{ color: 'var(--text-secondary)' }}>{profile.orgName || '—'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Division</span><span style={{ color: 'var(--text-secondary)' }}>{profile.division || 'Home'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>Client ID</span>
          <span style={{ color: 'var(--text-secondary)', fontFamily: 'JetBrains Mono', fontSize: 11 }}>
            {profile.clientId ? profile.clientId.slice(0, 8) + '…' : '—'}
          </span>
        </div>
        {profile.connectionStatus && (
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)' }}>Status</span>
            <span className={`badge ${profile.connectionStatus === 'connected' ? 'badge-green' : profile.connectionStatus === 'error' ? 'badge-red' : 'badge-grey'}`}>
              {profile.connectionStatus === 'connected' ? '✓ Connected' : profile.connectionStatus === 'error' ? '✗ Error' : 'Untested'}
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isActive && (
          <button className="btn btn-secondary btn-sm" onClick={onSetActive}>Set Active</button>
        )}
        <button className="btn btn-secondary btn-sm" onClick={onTest}><Wifi size={13} />Test</button>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}><Edit2 size={13} />Edit</button>
        <button className="btn btn-danger btn-sm" onClick={onDelete}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

export function EnvironmentsPage() {
  const { profiles, activeProfileId, setProfiles, addOrUpdateProfile, removeProfile, setActiveProfile } = useAppStore();
  const [showForm, setShowForm] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [testProfile, setTestProfile] = useState<Profile | null>(null);

  async function handleSave(data: Partial<Profile>) {
    try {
      const saved = await api.saveProfile(data);
      addOrUpdateProfile(saved);
      setShowForm(false);
      setEditProfile(null);
    } catch (e: any) {
      alert('Save failed: ' + e.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this profile?')) return;
    await api.deleteProfile(id);
    removeProfile(id);
  }

  return (
    <div className="page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="page-title">Environments</div>
          <div className="page-subtitle">Manage Genesys Cloud org credentials and connection profiles</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditProfile(null); setShowForm(true); }}>
          <Plus size={15} />Add Environment
        </button>
      </div>

      {profiles.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Globe size={56} /></div>
          <div className="empty-state-title">No environments configured</div>
          <div className="empty-state-desc">Add your first Genesys Cloud org to start managing and deploying Architect flows.</div>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowForm(true)}>
            <Plus size={15} />Add Environment
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              isActive={p.id === activeProfileId}
              onEdit={() => { setEditProfile(p); setShowForm(true); }}
              onDelete={() => handleDelete(p.id)}
              onTest={() => setTestProfile(p)}
              onSetActive={() => setActiveProfile(p.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <ProfileForm
          initial={editProfile}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditProfile(null); }}
        />
      )}
      {testProfile && (
        <TestModal profile={testProfile} onClose={() => setTestProfile(null)} />
      )}
    </div>
  );
}
