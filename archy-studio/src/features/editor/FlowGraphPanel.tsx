import { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Panel,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Search, LayoutGrid } from 'lucide-react';
import { parseArchyYaml } from '../../utils/yamlParser';
import { getLayoutedElements } from '../../utils/layout';
import { ActionNode } from '../../components/nodes/ActionNode';
import { TaskNode } from '../../components/nodes/TaskNode';
import { FlowLegend } from '../../components/nodes/FlowLegend';

const nodeTypes = { actionNode: ActionNode, taskNode: TaskNode };

interface FlowGraphPanelProps {
  yamlContent: string;
  validationMode: boolean;
}

function FlowGraphInner({ yamlContent, validationMode }: FlowGraphPanelProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [parseError, setParseError] = useState<string>('');
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [searchQuery, setSearchQuery] = useState('');
  const { fitView } = useReactFlow();

  const stats = {
    total: nodes.length,
    tasks: nodes.filter((n: any) => n.data.type === 'Task' || n.data.isTaskRoot).length,
    decisions: nodes.filter((n: any) => ['switch', 'decision'].includes(n.data.type)).length,
    transfers: nodes.filter((n: any) => ['transferToAcd', 'transferToFlow', 'transferToNumber'].includes(n.data.type)).length,
  };

  useEffect(() => {
    if (!yamlContent.trim()) {
      setNodes([]); setEdges([]); setParseError(''); return;
    }
    const timer = setTimeout(() => {
      try {
        const { nodes: raw, edges: rawEdges } = parseArchyYaml(yamlContent);
        const { nodes: ln, edges: le } = getLayoutedElements(raw, rawEdges, direction);
        setNodes(ln.map((n: any) => ({ ...n, data: { ...n.data, validationMode } })) as any);
        setEdges(le as any);
        setParseError('');
        setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 100);
      } catch (e: any) { setParseError(e.message || 'Parse error'); }
    }, 600);
    return () => clearTimeout(timer);
  }, [yamlContent, direction]);

  useEffect(() => {
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, validationMode } })));
  }, [validationMode]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    const lower = q.toLowerCase();
    setNodes((nds) => nds.map((n) => ({
      ...n, data: {
        ...n.data,
        dimmed: q.trim()
          ? !((n.data.label || '').toLowerCase().includes(lower) || (n.data.type || '').toLowerCase().includes(lower))
          : false,
      },
    })));
  }, []);

  const onLayout = useCallback((dir: 'TB' | 'LR') => {
    setDirection(dir);
    const { nodes: ln, edges: le } = getLayoutedElements(nodes as any, edges as any, dir);
    setNodes(ln as any[]);
    setEdges(le as any[]);
    setTimeout(() => fitView({ padding: 0.1, duration: 400 }), 50);
  }, [nodes, edges]);

  const onNodeClick: NodeMouseHandler = useCallback((_, node) => setSelectedNode(node), []);

  if (parseError) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0d1117' }}>
        <div style={{ background: '#1c0005', border: '1px solid #7f1d1d', borderRadius: 10, padding: '20px 28px', maxWidth: 420, color: '#fca5a5', fontSize: 13 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>⚠️ YAML Parse Error</div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#f87171' }}>{parseError}</div>
        </div>
      </div>
    );
  }

  if (!nodes.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#0d1117', color: '#4b5563', flexDirection: 'column', gap: 12 }}>
        <LayoutGrid size={48} strokeWidth={1} />
        <div style={{ fontSize: 15, fontWeight: 600 }}>No flow loaded</div>
        <div style={{ fontSize: 12 }}>Open a YAML file in the editor to visualize it here.</div>
      </div>
    );
  }

  return (
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
      style={{ background: '#0d1117' }}
      defaultEdgeOptions={{
        type: 'smoothstep',
        style: { stroke: '#4f46e5', strokeWidth: 2 },
        labelStyle: { fill: '#fff', fontWeight: 700, fontSize: 10 },
        labelBgStyle: { fill: '#4f46e5' },
        labelBgPadding: [6, 4],
        labelBgBorderRadius: 5,
      }}
    >
      <Background color="#1e293b" gap={20} size={1.5} />
      <Controls style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
      <MiniMap
        style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 8 }}
        nodeColor={(n: any) => n.type === 'taskNode' ? '#4f46e5' : '#334155'}
        maskColor="rgba(0,0,0,0.5)"
        pannable
        zoomable
      />
      <FlowLegend />

      <Panel position="top-right">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, color: '#6b7280' }} />
            <input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search nodes…"
              style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 7, color: '#e2e8f0', fontSize: 12, padding: '7px 10px 7px 28px', outline: 'none', width: 180 }}
            />
          </div>

          <div style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>Flow Insights</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { label: 'Nodes', value: stats.total },
                { label: 'Tasks', value: stats.tasks, color: '#6366f1' },
                { label: 'Decisions', value: stats.decisions, color: '#f97316' },
                { label: 'Transfers', value: stats.transfers, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#1e293b', borderRadius: 7, padding: '6px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: color ?? '#e2e8f0' }}>{value}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>Layout</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['TB', 'LR'] as const).map((d) => (
                <button key={d} onClick={() => onLayout(d)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  background: direction === d ? '#4f46e5' : '#1e293b',
                  color: direction === d ? '#fff' : '#94a3b8',
                  border: `1px solid ${direction === d ? '#4f46e5' : '#334155'}`,
                }}>
                  {d === 'TB' ? '↕ Vertical' : '↔ Horizontal'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {selectedNode && (
        <Panel position="bottom-right">
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '14px 16px', maxWidth: 280, fontSize: 12, color: '#e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{selectedNode.data.label}</div>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <div style={{ color: '#6b7280', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{selectedNode.data.type}</div>
            {selectedNode.data.validationWarnings?.length > 0 && (
              <div style={{ background: '#450a0a', borderRadius: 7, padding: '8px 10px' }}>
                <div style={{ color: '#fca5a5', fontWeight: 700, fontSize: 10, marginBottom: 4 }}>⚠ Validation Warnings</div>
                {selectedNode.data.validationWarnings.map((w: string, i: number) => (
                  <div key={i} style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>• {w}</div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      )}
    </ReactFlow>
  );
}

export function FlowGraphPanel(props: FlowGraphPanelProps) {
  return (
    <ReactFlowProvider>
      <FlowGraphInner {...props} />
    </ReactFlowProvider>
  );
}
