import React, { useState, useCallback, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  MiniMap,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { UploadCloud, FileType2, Download, ChevronDown, FileImage, FileText, Presentation, Search, ShieldAlert } from 'lucide-react';

import { parseArchyYaml } from './utils/yamlParser';
import { getLayoutedElements } from './utils/layout';
import { ActionNode } from './components/nodes/ActionNode';
import { TaskNode } from './components/nodes/TaskNode';
import { Sidebar } from './components/Sidebar';
import { exportToPDF, exportToPNG, printDiagram } from './utils/exportImage';
import { exportToDrawio } from './utils/exportVisio';
import { Legend } from './components/Legend';

const nodeTypes = {
  actionNode: ActionNode,
  taskNode: TaskNode,
};

function FlowApp() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [fileName, setFileName] = useState<string>('');
  const [flowName, setFlowName] = useState<string>('callflow');
  const [error, setError] = useState<string>('');
  const [exporting, setExporting] = useState<string>('');
  const [exportOpen, setExportOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [validationMode, setValidationMode] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const { fitView } = useReactFlow();

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    const q = query.toLowerCase();
    
    setNodes((nds) => 
      nds.map((n) => {
        if (!q.trim()) {
          return { ...n, data: { ...n.data, dimmed: false } };
        }
        const labelMatch = (n.data.label || '').toLowerCase().includes(q);
        const typeMatch = (n.data.type || '').toLowerCase().includes(q);
        return {
          ...n,
          data: { ...n.data, dimmed: !(labelMatch || typeMatch) }
        };
      })
    );
  }, [setNodes]);

  React.useEffect(() => {
    setNodes((nds) => nds.map(n => ({
      ...n,
      data: { ...n.data, validationMode }
    })));
  }, [validationMode, setNodes]);

  const onFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setFileName(file.name);
    // derive clean name for export filenames
    setFlowName(file.name.replace(/\.(yaml|yml)$/i, '').replace(/[^a-z0-9_\-]/gi, '_'));
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const yamlString = evt.target?.result as string;
        const { nodes: rawNodes, edges: rawEdges } = parseArchyYaml(yamlString);
        const { nodes: ln, edges: le } = getLayoutedElements(rawNodes, rawEdges, 'TB');
        setNodes(ln.map(n => ({ ...n, data: { ...n.data, validationMode } })) as any);
        setEdges(le as any);
        setSelectedNode(null);
        setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 100);
      } catch (err: any) {
        console.error('Error parsing YAML:', err);
        setError(`Parse error: ${err?.message || 'Unknown error'}`);
      }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges, fitView]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: ln, edges: le } = getLayoutedElements(nodes as any, edges as any, direction);
      setNodes(ln as any[]);
      setEdges(le as any[]);
      setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
    },
    [nodes, edges, setNodes, setEdges, fitView]
  );

  const handleExport = useCallback(async (type: 'pdf' | 'png' | 'visio' | 'print') => {
    setExportOpen(false);
    setExporting(type);
    try {
      // Fit all nodes into view before capturing
      await new Promise<void>(res => {
        fitView({ padding: 0.08, duration: 300 });
        setTimeout(res, 350);
      });

      if (type === 'pdf')   await exportToPDF(`${flowName}.pdf`);
      if (type === 'png')   await exportToPNG(`${flowName}.png`);
      if (type === 'visio') exportToDrawio(nodes as any, edges as any, `${flowName}.drawio`);
      if (type === 'print') { printDiagram(); return; }
    } catch (err: any) {
      setError(`Export failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setExporting('');
    }
  }, [nodes, edges, flowName, fitView]);

  // Close export dropdown on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const flowStats = React.useMemo(() => {
    if (!nodes.length) return null;
    return {
      total: nodes.length,
      menus: nodes.filter((n: any) => n.data.type === 'Menu').length,
      transfers: nodes.filter((n: any) => ['transferToAcd', 'transferToFlow', 'transferToNumber'].includes(n.data.type)).length,
      decisions: nodes.filter((n: any) => ['switch', 'decision'].includes(n.data.type)).length,
    };
  }, [nodes]);

  return (
    <div className="w-full h-screen flex flex-col bg-slate-50 overflow-hidden relative text-slate-800">
      {/* Ambient Background Glows */}
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>

      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
            <FileType2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">DiaYaml</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-0.5">Genesys Cloud • Visualizer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {fileName && (
            <div className="text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-4 py-2 rounded-lg truncate max-w-xs shadow-inner">
              {fileName}
            </div>
          )}
          {error && (
            <div className="text-sm font-semibold text-rose-600 bg-rose-50 px-4 py-2 rounded-lg border border-rose-200 max-w-xs truncate shadow-inner">
              {error}
            </div>
          )}

          {/* Search Bar */}
          {nodes.length > 0 && (
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="text" 
                placeholder="Find node..." 
                value={searchQuery}
                onChange={handleSearch}
                className="bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-lg pl-9 pr-4 py-2 w-48 focus:w-64 transition-all outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 shadow-inner placeholder-slate-400"
              />
            </div>
          )}

          {/* Validation Mode Toggle */}
          {nodes.length > 0 && (
            <button
              onClick={() => setValidationMode(!validationMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all border shadow-sm ${
                validationMode 
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Highlight missing configurations or unresolved references"
            >
              <ShieldAlert className={`w-4 h-4 ${validationMode ? 'text-rose-500' : 'text-slate-400'}`} />
              Dev Validation
            </button>
          )}

          {/* Export dropdown */}
          {nodes.length > 0 && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen(o => !o)}
                disabled={!!exporting}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-bold text-sm transition-all disabled:opacity-50 shadow-sm"
              >
                <Download className="w-4 h-4 text-indigo-500" />
                {exporting ? `Exporting…` : 'Export'}
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${exportOpen ? 'rotate-180' : ''}`} />
              </button>

              {exportOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 w-56 z-50 overflow-hidden transform origin-top transition-all">
                  <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Export As</span>
                  </div>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-left"
                  >
                    <FileText className="w-5 h-5 text-rose-500" />
                    <div>
                      <div className="font-bold">PDF Document</div>
                      <div className="text-[10px] text-slate-400 uppercase">Vector quality</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('png')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-t border-slate-50 text-left"
                  >
                    <FileImage className="w-5 h-5 text-emerald-500" />
                    <div>
                      <div className="font-bold">PNG Image</div>
                      <div className="text-[10px] text-slate-400 uppercase">High-res pixel</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExport('visio')}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors border-t border-slate-50 text-left"
                  >
                    <Presentation className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="font-bold">Draw.io (.vsdx)</div>
                      <div className="text-[10px] text-slate-400 uppercase">Editable</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          <label className="cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-5 py-2.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 hover:scale-105 active:scale-95">
            <UploadCloud className="w-5 h-5" />
            Upload YAML
            <input type="file" accept=".yaml,.yml" className="hidden" onChange={onFileUpload} />
          </label>
        </div>
      </header>

      <div className="flex-1 w-full relative z-0">
        {nodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center flex flex-col items-center max-w-sm bg-white/60 backdrop-blur-md p-10 rounded-2xl border border-white shadow-2xl">
              <div className="bg-indigo-50 p-4 rounded-full mb-6 border border-indigo-100">
                <UploadCloud className="w-16 h-16 text-indigo-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3">No Flow Loaded</h2>
              <p className="text-slate-500 text-sm leading-relaxed text-center">
                Upload a Genesys Cloud Archy YAML file to generate a stunning interactive visualization.
              </p>
            </div>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.05}
            maxZoom={2}
            defaultEdgeOptions={{
              type: 'smoothstep',
              style: { stroke: '#4f46e5', strokeWidth: 2.5 },
              labelStyle: { fill: '#ffffff', fontWeight: 800, fontSize: 10, letterSpacing: '0.05em' },
              labelBgStyle: { fill: '#4f46e5', stroke: '#4f46e5', strokeWidth: 0 },
              labelBgPadding: [8, 5],
              labelBgBorderRadius: 6,
            }}
          >
            <Background color="#cbd5e1" gap={20} size={1.5} />
            <Controls className="bg-white border-slate-200 fill-slate-600 shadow-xl rounded-lg overflow-hidden" />
            <Panel position="top-right" className="flex flex-col gap-4">
              {/* Flow Insights */}
              {flowStats && (
                <div className="bg-white/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-slate-200 text-sm">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3 text-center">Flow Insights</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <div className="text-lg font-black text-slate-700">{flowStats.menus}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Menus</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <div className="text-lg font-black text-slate-700">{flowStats.decisions}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Decisions</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <div className="text-lg font-black text-indigo-600">{flowStats.transfers}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Transfers</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                      <div className="text-lg font-black text-slate-700">{flowStats.total}</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">Total Steps</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Layout Controls */}
              <div className="bg-white/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-slate-200 text-sm">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Layout Direction</span>
                  <div className="flex gap-2">
                    <button onClick={() => onLayout('TB')} className="flex-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-xs px-4 py-2 rounded-lg transition-all font-bold">↕ Vertical</button>
                    <button onClick={() => onLayout('LR')} className="flex-1 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 text-xs px-4 py-2 rounded-lg transition-all font-bold">↔ Horizontal</button>
                  </div>
                </div>
              </div>
            </Panel>
            
            <Legend />
            <MiniMap 
              style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '0.75rem', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
              nodeColor={(node) => {
                if (node.type === 'taskNode') return '#4f46e5';
                return '#cbd5e1';
              }}
              maskColor="rgba(241, 245, 249, 0.6)"
              pannable
              zoomable
            />
          </ReactFlow>
        )}

        {selectedNode && (
          <Sidebar node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}

export default FlowApp;
