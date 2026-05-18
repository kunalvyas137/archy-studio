import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { EditorView } from '@codemirror/view';
import {
  Save, CheckSquare, Upload, Download, FileText, LayoutGrid, X,
  Code2, GitCompare, Share2, ShieldAlert,
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { api } from '../../api/client';
import { useArchyStream } from '../../hooks/useArchyStream';
import { SubstitutionDiffPanel } from './SubstitutionDiffPanel';
import { FlowGraphPanel } from './FlowGraphPanel';
import { ValidationPanel } from '../validation/ValidationPanel';
import { PublishWizard } from '../flows/PublishWizard';
import { TEMPLATES } from '../../templates';
import { validateYaml } from '../../utils/yamlValidator';
import type { ValidationIssue } from '../../utils/yamlValidator';

const darkTheme = EditorView.theme({
  '&': { backgroundColor: '#0d1117', color: '#c9d1d9', height: '100%' },
  '.cm-gutters': { backgroundColor: '#0d1117', borderRight: '1px solid #2a2d3a', color: '#5a6070' },
  '.cm-activeLine': { backgroundColor: '#1c2030' },
  '.cm-activeLineGutter': { backgroundColor: '#1c2030' },
  '.cm-selectionBackground': { backgroundColor: '#264f78 !important' },
  '.cm-cursor': { borderLeftColor: '#ff4f1f' },
  '.cm-lineNumbers': { color: '#5a6070' },
}, { dark: true });

type PanelTab = 'editor' | 'diff' | 'visualizer' | 'validator';

export function YamlEditorPage() {
  const { filename } = useParams<{ filename?: string }>();
  const {
    activeProfileId, profiles, yamlFiles, setYamlFiles,
    activeFile, setActiveFile, editorContent, setEditorContent,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<PanelTab>('editor');
  const [showPublish, setShowPublish] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationMode, setValidationMode] = useState(false);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  const { status: archyStatus, lines: archyLines, run } = useArchyStream();
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  // Load file list on mount / workspace change
  useEffect(() => {
    api.listYamlFiles(activeProfile?.workspaceDir).then(setYamlFiles).catch(() => {});
  }, [activeProfile?.workspaceDir]);

  // Auto-load from route param
  useEffect(() => {
    if (filename) loadFile(filename);
  }, [filename]);

  // Run local linter whenever content changes (debounced 500ms)
  useEffect(() => {
    if (!editorContent.trim()) { setValidationIssues([]); return; }
    const subs = activeProfile?.substitutions ?? {};
    const timer = setTimeout(() => {
      const issues = validateYaml(editorContent, subs);
      setValidationIssues(issues);
    }, 500);
    return () => clearTimeout(timer);
  }, [editorContent, activeProfile?.substitutions]);

  const errorCount = validationIssues.filter((i) => i.severity === 'error').length;
  const warnCount  = validationIssues.filter((i) => i.severity === 'warning').length;

  async function loadFile(name: string) {
    try {
      const content = await api.readYamlFile(name, activeProfile?.workspaceDir);
      setEditorContent(content);
      setActiveFile(name);
    } catch {}
  }

  async function saveFile() {
    if (!activeFile) return;
    setSaving(true);
    try {
      await api.saveYamlFile(activeFile, editorContent, activeProfile?.workspaceDir);
      const files = await api.listYamlFiles(activeProfile?.workspaceDir);
      setYamlFiles(files);
    } catch (e: any) { alert('Save failed: ' + e.message); }
    finally { setSaving(false); }
  }

  async function createFile(name: string, template?: string) {
    const content = template || '';
    await api.saveYamlFile(name, content, activeProfile?.workspaceDir);
    const files = await api.listYamlFiles(activeProfile?.workspaceDir);
    setYamlFiles(files);
    setEditorContent(content);
    setActiveFile(name);
    setShowNewFile(false);
    setShowTemplates(false);
  }

  async function deleteFile(name: string) {
    if (!confirm(`Delete ${name}?`)) return;
    await api.deleteYamlFile(name, activeProfile?.workspaceDir);
    const files = await api.listYamlFiles(activeProfile?.workspaceDir);
    setYamlFiles(files);
    if (activeFile === name) { setActiveFile(null); setEditorContent(''); }
  }

  function runArchyValidate() {
    if (!activeFile || !activeProfileId) return alert('Select an environment and file first');
    const path = activeProfile?.workspaceDir
      ? `${activeProfile.workspaceDir}/${activeFile}`
      : activeFile;
    run('/api/archy/validate', { profileId: activeProfileId, filePath: path }, `Validate: ${activeFile}`);
  }

  // ── Tab config ──────────────────────────────────────────────────────────
  const tabs: { id: PanelTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'editor',     label: 'Editor',     icon: <Code2 size={13} /> },
    { id: 'diff',       label: 'Diff',       icon: <GitCompare size={13} /> },
    { id: 'visualizer', label: 'Visualizer', icon: <Share2 size={13} /> },
    {
      id: 'validator',
      label: 'Validator',
      icon: <ShieldAlert size={13} />,
      badge: errorCount + warnCount || undefined,
    },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* File Tree Sidebar */}
      <div style={{
        width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{
          padding: '12px 12px 8px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Files</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-ghost btn-sm btn-icon" title="New from template" onClick={() => setShowTemplates(true)}>
              <LayoutGrid size={13} />
            </button>
            <button className="btn btn-ghost btn-sm btn-icon" title="New blank file" onClick={() => setShowNewFile(true)}>
              <FileText size={13} />
            </button>
          </div>
        </div>

        <div className="file-tree" style={{ flex: 1, overflowY: 'auto' }}>
          {yamlFiles.map((f) => (
            <div
              key={f.name}
              className={`file-item ${activeFile === f.name ? 'active' : ''}`}
              onClick={() => loadFile(f.name)}
              title={f.name}
            >
              <FileText size={13} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12.5 }}>{f.name}</span>
              <button
                className="btn btn-ghost btn-sm btn-icon"
                style={{ opacity: 0, transition: 'opacity 0.15s', padding: 2 }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0')}
                onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {yamlFiles.length === 0 && (
            <div style={{ padding: '20px 12px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
              No YAML files in workspace
            </div>
          )}
        </div>

        {showNewFile && (
          <div style={{ padding: 10, borderTop: '1px solid var(--border)', display: 'flex', gap: 6 }}>
            <input
              className="form-input"
              style={{ fontSize: 12, padding: '6px 8px' }}
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="flow.yaml"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFileName) createFile(newFileName);
                if (e.key === 'Escape') setShowNewFile(false);
              }}
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{
          padding: '8px 14px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0,
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: activeFile ? 'var(--text-primary)' : 'var(--text-muted)', marginRight: 4 }}>
            {activeFile || 'No file selected'}
          </div>
          <div className="toolbar-sep" />
          <button className="btn btn-secondary btn-sm" onClick={saveFile} disabled={!activeFile || saving}>
            <Save size={13} />{saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={runArchyValidate} disabled={!activeFile || !activeProfileId}>
            <CheckSquare size={13} />CLI Validate
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowPublish(true)} disabled={!activeFile}>
            <Upload size={13} />Publish
          </button>
          <div className="toolbar-sep" />

          {/* Dev Validation Mode toggle */}
          <button
            className={`btn btn-sm ${validationMode ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setValidationMode((v) => !v)}
            title="Highlight validation warnings on graph nodes"
            style={validationMode ? { background: 'var(--accent-orange, #f97316)', border: '1px solid var(--accent-orange, #f97316)' } : {}}
          >
            <ShieldAlert size={13} />
            Dev Mode
            {(errorCount > 0 || warnCount > 0) && (
              <span style={{
                background: errorCount > 0 ? '#ef4444' : '#f59e0b',
                color: '#fff', borderRadius: 9999, fontSize: 9, fontWeight: 800,
                padding: '1px 5px', marginLeft: 4, minWidth: 16, textAlign: 'center',
              }}>
                {errorCount + warnCount}
              </span>
            )}
          </button>
        </div>

        {/* ARCHY CLI validate output strip */}
        {archyLines.length > 0 && (
          <div className="log-terminal" style={{ maxHeight: 100, borderBottom: '1px solid var(--border)', borderRadius: 0, flexShrink: 0, overflowY: 'auto' }}>
            {archyLines.map((l) => (
              <div key={l.id} className={`log-line log-${l.type}`}>
                <span className="log-ts">{new Date(l.ts).toLocaleTimeString()}</span>
                <span>{l.line}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 2, padding: '6px 14px 0',
          background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px',
                borderRadius: '7px 7px 0 0',
                border: '1px solid transparent',
                borderBottom: 'none',
                background: activeTab === tab.id ? 'var(--bg-base)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                borderColor: activeTab === tab.id ? 'var(--border)' : 'transparent',
                position: 'relative',
                marginBottom: activeTab === tab.id ? -1 : 0,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff', borderRadius: 9999,
                  fontSize: 9, fontWeight: 800, padding: '1px 5px', minWidth: 16, textAlign: 'center',
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab panels */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* EDITOR tab */}
          {activeTab === 'editor' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              {activeFile ? (
                <CodeMirror
                  value={editorContent}
                  onChange={setEditorContent}
                  extensions={[yamlLang()]}
                  theme={darkTheme}
                  style={{ height: '100%', fontSize: 13 }}
                  basicSetup={{ lineNumbers: true, foldGutter: true, autocompletion: true }}
                />
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon"><FileText size={56} /></div>
                  <div className="empty-state-title">No file open</div>
                  <div className="empty-state-desc">Select a file from the sidebar or create a new one from a template.</div>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowTemplates(true)}>
                    <LayoutGrid size={14} />New from Template
                  </button>
                </div>
              )}
            </div>
          )}

          {/* DIFF tab */}
          {activeTab === 'diff' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {activeFile ? (
                <SubstitutionDiffPanel original={editorContent} profileId={activeProfileId} />
              ) : (
                <div className="empty-state">
                  <div className="empty-state-title">No file open</div>
                  <div className="empty-state-desc">Open a YAML file to see the substitution diff.</div>
                </div>
              )}
            </div>
          )}

          {/* VISUALIZER tab */}
          {activeTab === 'visualizer' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <FlowGraphPanel yamlContent={editorContent} validationMode={validationMode} />
            </div>
          )}

          {/* VALIDATOR tab */}
          {activeTab === 'validator' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ValidationPanel issues={validationIssues} />
            </div>
          )}
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <div className="modal-overlay" onClick={() => setShowTemplates(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">New Flow from Template</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setShowTemplates(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(TEMPLATES).map(([type, content]) => (
                  <div key={type} className="card" style={{ padding: '14px 18px', cursor: 'pointer' }}
                    onClick={() => {
                      const name = `new_${type}_flow.yaml`;
                      setNewFileName(name);
                      createFile(name, content as string);
                    }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{type}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {type === 'inboundcall'        && 'Inbound Call Flow — handles incoming PSTN/SIP calls'}
                      {type === 'inboundemail'        && 'Inbound Email Flow — routes inbound email interactions'}
                      {type === 'inboundshortmessage' && 'SMS/Messaging Flow — handles inbound short messages'}
                      {type === 'outboundcall'        && 'Outbound Call Flow — for dialers and campaigns'}
                      {type === 'workflow'            && 'Workflow — event-driven automation flow'}
                      {type === 'commonmodule'        && 'Common Module — reusable sub-flow called from other flows'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPublish && (
        <PublishWizard
          onClose={() => setShowPublish(false)}
          activeFile={activeFile}
          workspaceDir={activeProfile?.workspaceDir}
        />
      )}
    </div>
  );
}
