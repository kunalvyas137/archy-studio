import { NavLink } from 'react-router-dom';
import {
  Rocket, Globe, FileText, Code2, GitBranch, Terminal, RotateCcw, Zap, Share2, ShieldAlert,
} from 'lucide-react';

import { useAppStore } from '../store/appStore';

const NAV_ITEMS = [
  { to: '/environments', icon: Globe,     label: 'Environments' },
  { to: '/flows',        icon: Rocket,    label: 'Flows' },
  { to: '/editor',       icon: Code2,     label: 'YAML Editor' },
  { to: '/substitutions',icon: RotateCcw, label: 'Substitutions' },
  { to: '/git',          icon: GitBranch, label: 'Git' },
  { to: '/log',          icon: Terminal,  label: 'Deploy Log' },
];

export function Sidebar() {
  const { profiles, activeProfileId, archyInstalled, archyVersion, operations } = useAppStore();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const runningCount = operations.filter((o) => o.status === 'running').length;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Zap size={17} color="white" />
        </div>
        <div>
          <div className="sidebar-logo-text">ARCHY Studio</div>
          <div className="sidebar-logo-sub">Genesys Cloud</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon className="nav-icon" />
            <span>{label}</span>
            {label === 'Deploy Log' && runningCount > 0 && (
              <span className="nav-badge">{runningCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {activeProfile ? (
          <div className="env-badge">
            <div className="env-badge-dot" />
            <div>
              <div className="env-badge-name">{activeProfile.name}</div>
              <div className="env-badge-region">{activeProfile.region}</div>
            </div>
          </div>
        ) : (
          <div className="env-badge">
            <div className="env-badge-dot" style={{ background: 'var(--text-muted)', animation: 'none' }} />
            <div>
              <div className="env-badge-name" style={{ color: 'var(--text-muted)' }}>No env selected</div>
              <div className="env-badge-region">Add an environment</div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 2px' }}>
          <div
            className="status-dot"
            style={{
              background: archyInstalled ? 'var(--success)' : 'var(--error)',
              boxShadow: archyInstalled ? '0 0 5px var(--success)' : 'none',
              width: 7, height: 7, borderRadius: '50%',
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {archyInstalled ? `archy ${archyVersion || ''}` : 'archy not found'}
          </span>
        </div>
      </div>
    </aside>
  );
}
